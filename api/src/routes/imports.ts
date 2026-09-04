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
import { importProposedItemsSchema } from "../schemas/importBatch.js";
import { IMPORT_ERROR_CODES, ImportServiceError } from "../constants/importErrors.js";
import { isValidYearMonth } from "../utils/yearMonth.js";
import { MAX_OFX_BYTES } from "../services/ofxParseService.js";
import {
  createPendingImportBatch,
  scheduleImportGeneration,
} from "../services/importGenerationService.js";
import {
  confirmImportBatch,
  deleteImportBatch,
  undoImportBatch,
} from "../services/importApplyService.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_OFX_BYTES },
});

const router = Router();
router.use(requireAuth);

function sendImportError(res: import("express").Response, error: unknown): boolean {
  if (error instanceof ImportServiceError) {
    res.status(error.status).json({ error: error.code });
    return true;
  }
  return false;
}

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const batches = await ImportBatch.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .limit(100);
    res.json(batches.map(toImportBatchSummary));
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
      scheduleImportGeneration(batch._id.toString(), req.userId!);
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
    if (batch.status !== "waiting") {
      res.status(409).json({ error: IMPORT_ERROR_CODES.INVALID_STATUS });
      return;
    }

    const body = z.object({ proposedItems: importProposedItemsSchema }).parse(req.body);
    batch.proposedItems = body.proposedItems.map((item) => ({
      ...item,
      notes: item.notes ?? null,
      deleted: item.deleted ?? false,
    }));
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
