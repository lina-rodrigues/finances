import { Router } from "express";
import { z } from "zod";
import {
  FinancialReport,
  toFinancialReportResponse,
  toFinancialReportSummary,
} from "../models/FinancialReport.js";
import { computeBudget503020 } from "../services/budget503020Service.js";
import { User } from "../models/User.js";
import { buildMonthView } from "../services/monthViewService.js";
import { buildMonthWorkbook, monthWorkbookFilename } from "../services/monthWorkbookService.js";
import {
  createPendingReport,
  scheduleReportGeneration,
} from "../services/reportGenerationService.js";
import { buildReportDocxBuffer, contentDispositionHeader, reportDownloadFilename } from "../services/reportExportService.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { isValidYearMonth } from "../utils/yearMonth.js";

const router = Router();
router.use(requireAuth);

const yearMonthQuerySchema = z.object({
  yearMonth: z.string().refine(isValidYearMonth, { message: "Invalid yearMonth" }),
});

const generateReportSchema = z.object({
  yearMonth: z.string().refine(isValidYearMonth, { message: "Invalid yearMonth" }),
});

router.get(
  "/budget",
  asyncHandler(async (req, res) => {
    const { yearMonth } = yearMonthQuerySchema.parse(req.query);
    const monthView = await buildMonthView(req.userId!, yearMonth);
    res.json(
      computeBudget503020({
        categories: monthView.categories,
        uncategorized: monthView.uncategorized,
      }),
    );
  }),
);

router.get(
  "/export/xlsx",
  asyncHandler(async (req, res) => {
    const { yearMonth } = yearMonthQuerySchema.parse(req.query);
    const user = await User.findById(req.userId!).select("preferences.language preferences.currency");
    const language = user?.preferences.language ?? "en";
    const currency = user?.preferences.currency ?? "USD";
    const monthView = await buildMonthView(req.userId!, yearMonth);
    const buffer = await buildMonthWorkbook({ monthView, language, currency });
    const filename = monthWorkbookFilename(yearMonth, language);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", contentDispositionHeader(filename));
    res.send(buffer);
  }),
);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { yearMonth } = yearMonthQuerySchema.parse(req.query);
    const reports = await FinancialReport.find({ userId: req.userId, yearMonth })
      .select("yearMonth title status error createdAt updatedAt")
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(reports.map(toFinancialReportSummary));
  }),
);

router.get(
  "/:id/export/docx",
  asyncHandler(async (req, res) => {
    const report = await FinancialReport.findOne({ _id: req.params.id, userId: req.userId });
    if (!report || report.status !== "completed" || !report.content?.trim()) {
      res.status(404).json({ error: "NOT_FOUND" });
      return;
    }

    const buffer = await buildReportDocxBuffer(report);
    const filename = reportDownloadFilename(report.title);
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    );
    res.setHeader("Content-Disposition", contentDispositionHeader(filename));
    res.send(buffer);
  }),
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const report = await FinancialReport.findOne({ _id: req.params.id, userId: req.userId });
    if (!report) {
      res.status(404).json({ error: "NOT_FOUND" });
      return;
    }
    res.json(toFinancialReportResponse(report));
  }),
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const report = await FinancialReport.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId,
    });
    if (!report) {
      res.status(404).json({ error: "NOT_FOUND" });
      return;
    }
    res.status(204).send();
  }),
);

router.post(
  "/generate",
  asyncHandler(async (req, res) => {
    const { yearMonth } = generateReportSchema.parse(req.body);
    const report = await createPendingReport(req.userId!, yearMonth);
    if (!report) {
      res.status(404).json({ error: "NOT_FOUND" });
      return;
    }

    scheduleReportGeneration(report._id.toString(), req.userId!);
    res.status(202).json(toFinancialReportSummary(report));
  }),
);

export default router;
