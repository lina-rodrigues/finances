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
import {
  extractTextFromFinishedRun,
  fetchCursorImportRun,
  startCursorImportMapping,
} from "./cursorImportService.js";
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

async function buildFullPrompt(batch: IImportBatch, userId: string): Promise<string> {
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

  return `${prompt}\n${JSON.stringify(payload, null, 2)}`;
}

function applyParsedItems(batch: IImportBatch, raw: string): void {
  const parsed = extractJsonArray(raw);
  const items = importProposedItemsSchema.parse(parsed).map((item) => ({
    ...item,
    id: item.id || randomUUID(),
    notes: item.notes ?? null,
    deleted: item.deleted ?? false,
  })) as IImportProposedItem[];

  batch.proposedItems = items;
  batch.aiRawResponse = raw;
  batch.status = "waiting";
  batch.error = null;
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

  const batch = await ImportBatch.create({
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
    cursorAgentId: null,
    cursorRunId: null,
    error: null,
  });

  try {
    const fullPrompt = await buildFullPrompt(batch, params.userId);
    const { agentId, runId } = await startCursorImportMapping(fullPrompt);
    batch.cursorAgentId = agentId;
    batch.cursorRunId = runId;
    await batch.save();
    return batch;
  } catch (error) {
    const code = toImportErrorCode(error);
    if (!(error instanceof ImportServiceError)) {
      console.error("Import agent start failed:", error);
    }
    batch.status = "failed";
    batch.error = code;
    await batch.save();
    throw error instanceof ImportServiceError
      ? error
      : new ImportServiceError(IMPORT_ERROR_CODES.GENERATION_FAILED, 502);
  }
}

export async function reconcilePendingImport(batch: IImportBatch): Promise<IImportBatch> {
  if (batch.status !== "pending") {
    return batch;
  }

  if (!batch.cursorAgentId || !batch.cursorRunId) {
    batch.status = "failed";
    batch.error = IMPORT_ERROR_CODES.GENERATION_FAILED;
    await batch.save();
    return batch;
  }

  let run;
  try {
    run = await fetchCursorImportRun(batch.cursorAgentId, batch.cursorRunId);
  } catch (error) {
    if (!(error instanceof ImportServiceError)) {
      console.error("Import reconcile getRun failed:", error);
    }
    // Transient poll failure — keep pending for the next reload/poll.
    return batch;
  }

  if (run.status === "running") {
    return batch;
  }

  if (run.status === "error" || run.status === "cancelled") {
    batch.status = "failed";
    batch.error = IMPORT_ERROR_CODES.GENERATION_FAILED;
    await batch.save();
    return batch;
  }

  try {
    const raw = await extractTextFromFinishedRun(run, batch.cursorAgentId);
    applyParsedItems(batch, raw);
    await batch.save();
    return batch;
  } catch (error) {
    const code = toImportErrorCode(error);
    if (!(error instanceof ImportServiceError)) {
      console.error("Import reconcile parse failed:", error);
    }
    batch.status = "failed";
    batch.error = code;
    await batch.save();
    return batch;
  }
}
