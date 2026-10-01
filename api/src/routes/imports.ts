import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { requireAuth } from "../middleware/requireAuth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  ImportBatch,
  toImportBatchDetail,
  toImportBatchSummary,
} from "../models/ImportBatch.js";
import { toImportKnowledgeRule } from "../models/ImportKnowledgeRule.js";
import { importProposedItemsSchema } from "../schemas/importBatch.js";
import { IMPORT_ERROR_CODES, ImportServiceError } from "../constants/importErrors.js";
import type { ImportApplyErrorDetails } from "../constants/importErrors.js";
import { isValidYearMonth } from "../utils/yearMonth.js";
import { readCursorApiKey } from "../services/cursorAi.js";
import { MAX_OFX_BYTES } from "../services/ofxParseService.js";
import {
  createPendingImportBatch,
  reconcilePendingImport,
  refreshImportReviewContext,
} from "../services/importGenerationService.js";
import {
  confirmImportBatch,
  deleteImportBatch,
  undoImportBatch,
} from "../services/importApplyService.js";
import {
  deleteKnowledgeRule,
  executeImportKnowledgeLearn,
  listKnowledgeRulesForBatch,
  listKnowledgeRulesForUser,
  reconcileImportKnowledge,
  reconcilePendingKnowledgeBatches,
  updateKnowledgeRule,
} from "../services/importKnowledgeService.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_OFX_BYTES },
});

const router = Router();
router.use(requireAuth);

function sendImportError(res: import("express").Response, error: unknown): boolean {
  if (error instanceof ImportServiceError) {
    const body: { error: string; details?: ImportApplyErrorDetails } = { error: error.code };
    if (error.details) {
      body.details = error.details;
    }
    res.status(error.status).json(body);
    return true;
  }
  return false;
}

const patchImportBodySchema = z
  .object({
    name: z.string().nullable().optional(),
    proposedItems: importProposedItemsSchema.optional(),
  })
  .refine((body) => body.name !== undefined || body.proposedItems !== undefined, {
    message: "EMPTY_PATCH",
  });

const patchKnowledgeRuleSchema = z.object({
  ofxName: z.string().min(1).optional(),
  type: z.enum(["LineItem", "LineItemEntry"]).optional(),
  category: z.string().min(1).optional(),
  parent: z.string().nullable().optional(),
  label: z.string().nullable().optional(),
});

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const batches = await ImportBatch.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .limit(100);

    for (const batch of batches) {
      if (batch.status === "pending") {
        await reconcilePendingImport(batch);
      }
      if (batch.knowledgeStatus === "pending") {
        await reconcileImportKnowledge(batch);
      }
    }

    res.json(batches.map(toImportBatchSummary));
  }),
);

router.get(
  "/knowledge",
  asyncHandler(async (req, res) => {
    await reconcilePendingKnowledgeBatches(req.userId!);
    const rules = await listKnowledgeRulesForUser(req.userId!);
    res.json(rules);
  }),
);

router.patch(
  "/knowledge/:ruleId",
  asyncHandler(async (req, res) => {
    try {
      const body = patchKnowledgeRuleSchema.parse(req.body);
      const rule = await updateKnowledgeRule(req.userId!, req.params.ruleId, body);
      res.json(toImportKnowledgeRule(rule));
    } catch (error) {
      if (sendImportError(res, error)) {
        return;
      }
      throw error;
    }
  }),
);

router.delete(
  "/knowledge/:ruleId",
  asyncHandler(async (req, res) => {
    try {
      await deleteKnowledgeRule(req.userId!, req.params.ruleId);
      res.status(204).end();
    } catch (error) {
      if (sendImportError(res, error)) {
        return;
      }
      throw error;
    }
  }),
);

router.get(
  "/:id/knowledge",
  asyncHandler(async (req, res) => {
    const batch = await ImportBatch.findOne({ _id: req.params.id, userId: req.userId });
    if (!batch) {
      res.status(404).json({ error: IMPORT_ERROR_CODES.NOT_FOUND });
      return;
    }

    if (batch.knowledgeStatus === "pending") {
      await reconcileImportKnowledge(batch);
    }

    const rules = await listKnowledgeRulesForBatch(req.userId!, batch._id.toString());
    res.json({
      knowledgeStatus: batch.knowledgeStatus ?? "idle",
      error: batch.knowledgeError,
      rules,
    });
  }),
);

router.post(
  "/:id/knowledge/execute",
  asyncHandler(async (req, res) => {
    if (!readCursorApiKey()) {
      res.status(403).json({ error: IMPORT_ERROR_CODES.SERVICE_UNAVAILABLE });
      return;
    }

    try {
      const batch = await executeImportKnowledgeLearn(req.userId!, req.params.id);
      const rules = await listKnowledgeRulesForBatch(req.userId!, batch._id.toString());
      res.status(202).json({
        knowledgeStatus: batch.knowledgeStatus ?? "idle",
        error: batch.knowledgeError,
        rules,
      });
    } catch (error) {
      if (sendImportError(res, error)) {
        return;
      }
      throw error;
    }
  }),
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const batch = await ImportBatch.findOne({ _id: req.params.id, userId: req.userId });
    if (!batch) {
      res.status(404).json({ error: IMPORT_ERROR_CODES.NOT_FOUND });
      return;
    }

    if (batch.status === "pending") {
      await reconcilePendingImport(batch);
    }

    if (batch.knowledgeStatus === "pending") {
      await reconcileImportKnowledge(batch);
    }

    // Keep parent/category picklists current while reviewing or fixing a failed apply.
    if (batch.status === "waiting" || batch.status === "failed") {
      await refreshImportReviewContext(batch);
    }

    res.json(toImportBatchDetail(batch));
  }),
);

router.post(
  "/",
  upload.single("file"),
  asyncHandler(async (req, res) => {
    const yearMonth = typeof req.body?.yearMonth === "string" ? req.body.yearMonth : "";
    if (!isValidYearMonth(yearMonth)) {
      res.status(400).json({ error: "INVALID_YEAR_MONTH" });
      return;
    }

    const file = req.file;
    if (!file) {
      res.status(400).json({ error: IMPORT_ERROR_CODES.INVALID_OFX });
      return;
    }

    try {
      const rawOfx = file.buffer.toString("utf8");
      const batch = await createPendingImportBatch({
        userId: req.userId!,
        yearMonth,
        fileName: file.originalname || "statement.ofx",
        rawOfx,
      });
      res.status(202).json(toImportBatchSummary(batch));
    } catch (error) {
      if (sendImportError(res, error)) {
        return;
      }
      throw error;
    }
  }),
);

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const batch = await ImportBatch.findOne({ _id: req.params.id, userId: req.userId });
    if (!batch) {
      res.status(404).json({ error: IMPORT_ERROR_CODES.NOT_FOUND });
      return;
    }

    const body = patchImportBodySchema.parse(req.body);

    if (body.proposedItems !== undefined) {
      if (batch.status !== "waiting") {
        res.status(409).json({ error: IMPORT_ERROR_CODES.INVALID_STATUS });
        return;
      }
      batch.proposedItems = body.proposedItems.map((item) => ({
        ...item,
        notes: item.notes ?? null,
        deleted: item.deleted ?? false,
      }));
    }

    if (body.name !== undefined) {
      const trimmed = body.name?.trim() ?? "";
      batch.name = trimmed.length > 0 ? trimmed : null;
    }

    await batch.save();
    res.json(toImportBatchDetail(batch));
  }),
);

router.post(
  "/:id/confirm",
  asyncHandler(async (req, res) => {
    try {
      const batch = await confirmImportBatch(req.userId!, req.params.id);
      res.json(toImportBatchDetail(batch));
    } catch (error) {
      if (sendImportError(res, error)) {
        return;
      }
      throw error;
    }
  }),
);

router.post(
  "/:id/undo",
  asyncHandler(async (req, res) => {
    try {
      const batch = await undoImportBatch(req.userId!, req.params.id);
      res.json(toImportBatchDetail(batch));
    } catch (error) {
      if (sendImportError(res, error)) {
        return;
      }
      throw error;
    }
  }),
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    try {
      await deleteImportBatch(req.userId!, req.params.id);
      res.status(204).end();
    } catch (error) {
      if (sendImportError(res, error)) {
        return;
      }
      throw error;
    }
  }),
);

export default router;
