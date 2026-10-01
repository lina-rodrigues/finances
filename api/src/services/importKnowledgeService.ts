import { z } from "zod";
import {
  ImportBatch,
  type IImportBatch,
  type IImportProposedItem,
} from "../models/ImportBatch.js";
import {
  ImportKnowledgeRule,
  toImportKnowledgeRule,
  type ImportKnowledgeRuleResponse,
  type IImportKnowledgeRule,
} from "../models/ImportKnowledgeRule.js";
import { IMPORT_ERROR_CODES, ImportServiceError, toImportErrorCode } from "../constants/importErrors.js";
import {
  cursorRunPhase,
  extractTextFromFinishedRun,
  fetchCursorImportRun,
  startCursorImportKnowledgeLearn,
} from "./cursorImportService.js";
import { readCursorApiKey } from "./cursorAi.js";
import { loadImportKnowledgeLearnPrompt } from "./importPromptService.js";

const knowledgeRuleSchema = z.object({
  ofxName: z.string().min(1),
  type: z.enum(["LineItem", "LineItemEntry"]),
  category: z.string().min(1),
  parent: z.string().nullable(),
  label: z.string().nullable(),
});

const knowledgeRulesSchema = z.array(knowledgeRuleSchema);

export type ImportKnowledgeStatus = "idle" | "pending" | "ready" | "failed";

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

function mappingFields(item: IImportProposedItem | null) {
  if (!item) return null;
  return {
    type: item.type,
    category: item.category,
    parent: item.parent,
    label: item.label,
    deleted: item.deleted,
  };
}

function buildKnowledgeChanges(batch: IImportBatch) {
  const beforeById = new Map(batch.aiProposedItems.map((item) => [item.id, item]));
  const nameByFitId = new Map(batch.sourceLines.map((line) => [line.fitId, line.name]));

  return batch.proposedItems
    .filter((item) => !item.deleted && item.sourceFitId)
    .map((after) => {
      const ofxName = after.sourceFitId ? nameByFitId.get(after.sourceFitId) ?? null : null;
      const before = beforeById.get(after.id) ?? null;
      return {
        ofxName,
        before: mappingFields(before),
        after: mappingFields(after),
      };
    })
    .filter((row) => typeof row.ofxName === "string" && row.ofxName.length > 0);
}

async function upsertKnowledgeRules(
  userId: string,
  batchId: string,
  rules: z.infer<typeof knowledgeRulesSchema>,
): Promise<void> {
  for (const rule of rules) {
    const parent = rule.type === "LineItemEntry" ? rule.parent : null;
    const label = rule.type === "LineItem" ? rule.label : null;
    if (rule.type === "LineItemEntry" && !parent) continue;
    if (rule.type === "LineItem" && !label) continue;

    await ImportKnowledgeRule.findOneAndUpdate(
      { userId, ofxName: rule.ofxName },
      {
        $set: {
          type: rule.type,
          category: rule.category,
          parent,
          label,
          sourceBatchId: batchId,
        },
      },
      { upsert: true, new: true },
    );
  }
}

/** Start (or skip) knowledge learning after a successful confirm. */
export async function startImportKnowledgeLearn(batch: IImportBatch): Promise<IImportBatch> {
  // Confirm still applies the import when AI is off. The execute route returns 403
  // before calling this, so the button does not succeed silently.
  if (!readCursorApiKey()) {
    return batch;
  }

  const changes = buildKnowledgeChanges(batch);
  if (changes.length === 0) {
    batch.knowledgeStatus = "ready";
    batch.knowledgeError = null;
    batch.knowledgeCursorAgentId = null;
    batch.knowledgeCursorRunId = null;
    await batch.save();
    return batch;
  }

  try {
    const prompt = await loadImportKnowledgeLearnPrompt();
    const fullPrompt = `${prompt}\n${JSON.stringify({ changes }, null, 2)}`;
    const { agentId, runId } = await startCursorImportKnowledgeLearn(fullPrompt);
    batch.knowledgeStatus = "pending";
    batch.knowledgeCursorAgentId = agentId;
    batch.knowledgeCursorRunId = runId;
    batch.knowledgeError = null;
    batch.knowledgeAiRawResponse = null;
    await batch.save();
    return batch;
  } catch (error) {
    const code = toImportErrorCode(error);
    if (!(error instanceof ImportServiceError)) {
      console.error("Import knowledge learn start failed:", error);
    }
    batch.knowledgeStatus = "failed";
    batch.knowledgeError = code;
    await batch.save();
    return batch;
  }
}

/** Manually run knowledge learning for a confirmed import (e.g. past batches). */
export async function executeImportKnowledgeLearn(
  userId: string,
  batchId: string,
): Promise<IImportBatch> {
  const batch = await ImportBatch.findOne({ _id: batchId, userId });
  if (!batch) {
    throw new ImportServiceError(IMPORT_ERROR_CODES.NOT_FOUND, 404);
  }
  if (batch.status !== "done") {
    throw new ImportServiceError(IMPORT_ERROR_CODES.INVALID_STATUS, 409);
  }
  if (batch.knowledgeStatus === "pending") {
    throw new ImportServiceError(IMPORT_ERROR_CODES.INVALID_STATUS, 409);
  }
  return startImportKnowledgeLearn(batch);
}

export async function reconcileImportKnowledge(batch: IImportBatch): Promise<IImportBatch> {
  if (batch.knowledgeStatus !== "pending") {
    return batch;
  }

  if (!batch.knowledgeCursorAgentId || !batch.knowledgeCursorRunId) {
    batch.knowledgeStatus = "failed";
    batch.knowledgeError = IMPORT_ERROR_CODES.GENERATION_FAILED;
    await batch.save();
    return batch;
  }

  let run;
  try {
    run = await fetchCursorImportRun(batch.knowledgeCursorAgentId, batch.knowledgeCursorRunId);
  } catch (error) {
    if (!(error instanceof ImportServiceError)) {
      console.error("Import knowledge reconcile getRun failed:", error);
    }
    return batch;
  }

  const phase = cursorRunPhase(run.status);
  if (phase === "running") {
    return batch;
  }

  if (phase === "failed") {
    console.error("Import knowledge reconcile run failed:", run.status, run.error);
    batch.knowledgeStatus = "failed";
    batch.knowledgeError = IMPORT_ERROR_CODES.GENERATION_FAILED;
    await batch.save();
    return batch;
  }

  try {
    const raw = await extractTextFromFinishedRun(run, batch.knowledgeCursorAgentId);
    const parsed = knowledgeRulesSchema.parse(extractJsonArray(raw));
    await upsertKnowledgeRules(batch.userId.toString(), batch._id.toString(), parsed);
    batch.knowledgeAiRawResponse = raw;
    batch.knowledgeStatus = "ready";
    batch.knowledgeError = null;
    await batch.save();
    return batch;
  } catch (error) {
    const code = toImportErrorCode(error);
    if (!(error instanceof ImportServiceError)) {
      console.error("Import knowledge reconcile parse failed:", error);
    }
    batch.knowledgeStatus = "failed";
    batch.knowledgeError = code;
    await batch.save();
    return batch;
  }
}

export async function listKnowledgeRulesForUser(userId: string): Promise<ImportKnowledgeRuleResponse[]> {
  const rules = await ImportKnowledgeRule.find({ userId }).sort({ ofxName: 1 });
  return rules.map(toImportKnowledgeRule);
}

export async function listKnowledgeRulesForBatch(
  userId: string,
  batchId: string,
): Promise<ImportKnowledgeRuleResponse[]> {
  const rules = await ImportKnowledgeRule.find({ userId, sourceBatchId: batchId }).sort({
    ofxName: 1,
  });
  return rules.map(toImportKnowledgeRule);
}

export async function updateKnowledgeRule(
  userId: string,
  ruleId: string,
  patch: {
    ofxName?: string;
    type?: "LineItem" | "LineItemEntry";
    category?: string;
    parent?: string | null;
    label?: string | null;
  },
): Promise<IImportKnowledgeRule> {
  const rule = await ImportKnowledgeRule.findOne({ _id: ruleId, userId });
  if (!rule) {
    throw new ImportServiceError(IMPORT_ERROR_CODES.NOT_FOUND, 404);
  }

  if (patch.ofxName !== undefined) rule.ofxName = patch.ofxName.trim();
  if (patch.type !== undefined) rule.type = patch.type;
  if (patch.category !== undefined) rule.category = patch.category.trim();
  if (patch.parent !== undefined) rule.parent = patch.parent;
  if (patch.label !== undefined) rule.label = patch.label;

  if (rule.type === "LineItemEntry") {
    rule.label = null;
    if (!rule.parent) {
      throw new ImportServiceError(IMPORT_ERROR_CODES.INVALID_STATUS, 400);
    }
  } else {
    rule.parent = null;
    if (!rule.label) {
      throw new ImportServiceError(IMPORT_ERROR_CODES.INVALID_STATUS, 400);
    }
  }

  try {
    await rule.save();
  } catch (error) {
    // Duplicate ofxName for this user
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: number }).code === 11000
    ) {
      throw new ImportServiceError(IMPORT_ERROR_CODES.INVALID_STATUS, 409);
    }
    throw error;
  }

  return rule;
}

export async function deleteKnowledgeRule(userId: string, ruleId: string): Promise<void> {
  const result = await ImportKnowledgeRule.deleteOne({ _id: ruleId, userId });
  if (result.deletedCount === 0) {
    throw new ImportServiceError(IMPORT_ERROR_CODES.NOT_FOUND, 404);
  }
}

export async function loadKnownMappingsForUser(userId: string) {
  const rules = await ImportKnowledgeRule.find({ userId }).select(
    "ofxName type category parent label",
  );
  return rules.map((rule) => ({
    ofxName: rule.ofxName,
    type: rule.type,
    category: rule.category,
    parent: rule.parent,
    label: rule.label,
  }));
}

export function applyKnowledgeOverridesToItems(
  items: IImportProposedItem[],
  sourceLines: IImportBatch["sourceLines"],
  knownMappings: Awaited<ReturnType<typeof loadKnownMappingsForUser>>,
): IImportProposedItem[] {
  if (knownMappings.length === 0) return items;
  const byName = new Map(knownMappings.map((rule) => [rule.ofxName, rule]));
  const nameByFitId = new Map(sourceLines.map((line) => [line.fitId, line.name]));

  return items.map((item) => {
    if (!item.sourceFitId) return item;
    const ofxName = nameByFitId.get(item.sourceFitId);
    if (!ofxName) return item;
    const rule = byName.get(ofxName);
    if (!rule) return item;

    return {
      ...item,
      type: rule.type,
      category: rule.category,
      parent: rule.type === "LineItemEntry" ? rule.parent : null,
      label: rule.type === "LineItem" ? rule.label : null,
    };
  });
}

/** Opportunistic reconcile for list endpoints. */
export async function reconcilePendingKnowledgeBatches(userId: string): Promise<void> {
  const pending = await ImportBatch.find({
    userId,
    knowledgeStatus: "pending",
  }).limit(20);

  for (const batch of pending) {
    await reconcileImportKnowledge(batch);
  }
}
