import { randomUUID } from "node:crypto";
import { Category } from "../models/Category.js";
import {
  ImportBatch,
  type IImportBatch,
  type IImportProposedItem,
  type IImportSourceLine,
} from "../models/ImportBatch.js";
import { ImportTransactionId } from "../models/ImportTransactionId.js";
import { LineItem } from "../models/LineItem.js";
import { User } from "../models/User.js";
import { importProposedItemsSchema } from "../schemas/importBatch.js";
import { IMPORT_ERROR_CODES, ImportServiceError, toImportErrorCode } from "../constants/importErrors.js";
import { generateCursorImportMapping } from "./cursorImportService.js";
import { loadStatementImportPrompt } from "./importPromptService.js";
import { parseOfxTransactions } from "./ofxParseService.js";
import { ensureMonth } from "./balanceService.js";

function extractJsonArray(raw: string): unknown {
  const trimmed = raw.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fence ? fence[1].trim() : trimmed;
  const start = candidate.indexOf("[");
  const end = candidate.lastIndexOf("]");
  if (start < 0 || end < 0 || end <= start) {
    throw new ImportServiceError(IMPORT_ERROR_CODES.GENERATION_FAILED, 502);
  }
  return JSON.parse(candidate.slice(start, end + 1)) as unknown;
}

async function buildReviewContext(userId: string, yearMonth: string) {
  const categories = await Category.find({ userId }).sort({ order: 1 });
  const month = await ensureMonth(userId, yearMonth);
  const lineItems = await LineItem.find({ monthId: month._id });
  const categoryNameById = new Map(categories.map((c) => [c._id.toString(), c.name]));

  return {
    reviewCategories: categories.map((c) => ({ id: c._id.toString(), name: c.name })),
    reviewLineItems: lineItems.map((item) => ({
      id: item._id.toString(),
      label: item.label,
      categoryName: item.categoryId ? categoryNameById.get(item.categoryId.toString()) ?? null : null,
    })),
  };
}

export async function createPendingImportBatch(params: {
  userId: string;
  yearMonth: string;
  fileName: string;
  rawOfx: string;
}): Promise<IImportBatch> {
  const transactions = parseOfxTransactions(params.rawOfx);
  const existing = await ImportTransactionId.find({
    userId: params.userId,
    fitId: { $in: transactions.map((t) => t.fitId) },
  }).select("fitId");
  const known = new Set(existing.map((row) => row.fitId));

  const sourceLines: IImportSourceLine[] = transactions.map((t) => ({
    fitId: t.fitId,
    date: t.date,
    amount: t.amount,
    name: t.name,
    memo: t.memo,
    skippedDuplicate: known.has(t.fitId),
  }));

  const { reviewCategories, reviewLineItems } = await buildReviewContext(
    params.userId,
    params.yearMonth,
  );

  const prompt = await loadStatementImportPrompt();

  return ImportBatch.create({
    userId: params.userId,
    yearMonth: params.yearMonth,
    fileName: params.fileName,
    status: "pending",
    rawOfx: params.rawOfx,
    sourceLines,
    proposedItems: [],
    reviewCategories,
    reviewLineItems,
    appliedActions: [],
    promptUsed: prompt,
    aiRawResponse: null,
    error: null,
  });
}

export async function runImportGeneration(batchId: string, userId: string): Promise<void> {
  const batch = await ImportBatch.findOne({ _id: batchId, userId });
  if (!batch || batch.status !== "pending") {
    return;
  }

  try {
    const user = await User.findById(userId).select("preferences.language");
    if (!user) {
      throw new ImportServiceError(IMPORT_ERROR_CODES.GENERATION_FAILED, 502);
    }

    const { reviewCategories, reviewLineItems } = await buildReviewContext(userId, batch.yearMonth);
    batch.reviewCategories = reviewCategories;
    batch.reviewLineItems = reviewLineItems;

    const activeLines = batch.sourceLines.filter((line) => !line.skippedDuplicate);
    const prompt = batch.promptUsed ?? (await loadStatementImportPrompt());
    const payload = {
      yearMonth: batch.yearMonth,
      language: user.preferences.language,
      categories: reviewCategories.map((c) => c.name),
      existingLineItems: reviewLineItems,
      transactions: activeLines.map((line) => ({
        fitId: line.fitId,
        date: line.date,
        amount: Math.abs(line.amount),
        signedAmount: line.amount,
        name: line.name,
        memo: line.memo,
      })),
    };

    const fullPrompt = `${prompt}\n${JSON.stringify(payload, null, 2)}`;
    const raw = await generateCursorImportMapping(fullPrompt);
    batch.aiRawResponse = raw;

    const parsed = extractJsonArray(raw);
    const items = importProposedItemsSchema.parse(parsed).map((item) => ({
      ...item,
      id: item.id || randomUUID(),
      notes: item.notes ?? null,
      deleted: item.deleted ?? false,
    })) as IImportProposedItem[];

    batch.proposedItems = items;
    batch.status = "waiting";
    batch.error = null;
    await batch.save();
  } catch (error) {
    const code = toImportErrorCode(error);
    if (!(error instanceof ImportServiceError)) {
      console.error("Import generation failed:", error);
    }
    batch.status = "failed";
    batch.error = code;
    await batch.save();
  }
}

export function scheduleImportGeneration(batchId: string, userId: string): void {
  setImmediate(() => {
    void runImportGeneration(batchId, userId);
  });
}
