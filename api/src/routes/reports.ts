import { Router } from "express";
import { z } from "zod";
import {
  FinancialReport,
  toFinancialReportResponse,
} from "../models/FinancialReport.js";
import { User } from "../models/User.js";
import { computeBudget503020 } from "../services/budget503020Service.js";
import { generateCursorReport } from "../services/cursorReportService.js";
import { buildMonthView } from "../services/monthViewService.js";
import {
  buildReportPayload,
  serializeReportPayload,
} from "../services/reportPayloadService.js";
import { loadReportPrompt } from "../services/reportPromptService.js";
import { ReportServiceError, toReportErrorCode } from "../constants/reportErrors.js";
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
  "/",
  asyncHandler(async (req, res) => {
    const { yearMonth } = yearMonthQuerySchema.parse(req.query);
    const reports = await FinancialReport.find({ userId: req.userId, yearMonth })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(reports.map(toFinancialReportResponse));
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
    const prompt = await loadReportPrompt();
    const user = await User.findById(req.userId).select("preferences.language");
    if (!user) {
      res.status(404).json({ error: "NOT_FOUND" });
      return;
    }
    const monthView = await buildMonthView(req.userId!, yearMonth);
    const payload = buildReportPayload({
      yearMonth,
      language: user.preferences.language,
      monthTotals: {
        lastMonthRealizedBalance: monthView.month.lastMonthRealizedBalance,
        expectedBalance: monthView.month.expectedBalance,
        currentRealizedBalance: monthView.month.currentRealizedBalance,
      },
      categories: monthView.categories,
      uncategorized: monthView.uncategorized,
    });
    const fullPrompt = serializeReportPayload(prompt, payload);

    const report = await FinancialReport.create({
      userId: req.userId,
      yearMonth,
      status: "pending",
      promptUsed: prompt,
      content: null,
      error: null,
    });

    try {
      const content = await generateCursorReport(fullPrompt);
      report.status = "completed";
      report.content = content;
      report.error = null;
      await report.save();
      res.status(201).json(toFinancialReportResponse(report));
    } catch (error) {
      const errorCode = toReportErrorCode(error);
      if (!(error instanceof ReportServiceError)) {
        console.error("Report generation failed:", error);
      }
      report.status = "failed";
      report.error = errorCode;
      await report.save();
      res.status(502).json({
        error: errorCode,
        report: toFinancialReportResponse(report),
      });
    }
  }),
);

export default router;
