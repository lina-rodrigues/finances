import { normalizeAiReportTone } from "../constants/aiReportTone.js";
import { REPORT_ERROR_CODES, ReportServiceError, toReportErrorCode } from "../constants/reportErrors.js";
import { FinancialReport } from "../models/FinancialReport.js";
import { User } from "../models/User.js";
import { generateCursorReport } from "./cursorReportService.js";
import { buildMonthView } from "./monthViewService.js";
import {
  buildReportPayload,
  serializeReportPayload,
} from "./reportPayloadService.js";
import { loadReportPrompt } from "./reportPromptService.js";
import {
  buildPlaceholderReportTitle,
  parseGeneratedReport,
} from "./reportTitleService.js";

export async function runReportGeneration(reportId: string, userId: string): Promise<void> {
  const report = await FinancialReport.findOne({ _id: reportId, userId });
  if (!report || report.status !== "pending") {
    return;
  }

  try {
    const prompt = await loadReportPrompt();
    const user = await User.findById(userId).select("preferences.language preferences.aiReportTone");
    if (!user) {
      throw new ReportServiceError(REPORT_ERROR_CODES.GENERATION_FAILED);
    }

    const monthView = await buildMonthView(userId, report.yearMonth);
    const payload = buildReportPayload({
      yearMonth: report.yearMonth,
      language: user.preferences.language,
      reportTone: normalizeAiReportTone(user.preferences.aiReportTone),
      monthTotals: {
        lastMonthRealizedBalance: monthView.month.lastMonthRealizedBalance,
        expectedBalance: monthView.month.expectedBalance,
        currentRealizedBalance: monthView.month.currentRealizedBalance,
      },
      categories: monthView.categories,
      uncategorized: monthView.uncategorized,
    });
    const fullPrompt = serializeReportPayload(prompt, payload);
    const rawContent = await generateCursorReport(fullPrompt);
    const { title, content } = parseGeneratedReport(rawContent);

    report.status = "completed";
    report.title = title;
    report.content = content;
    report.error = null;
    await report.save();
  } catch (error) {
    const errorCode = toReportErrorCode(error);
    if (!(error instanceof ReportServiceError)) {
      console.error("Report generation failed:", error);
    }
    report.status = "failed";
    report.error = errorCode;
    await report.save();
  }
}

export function scheduleReportGeneration(reportId: string, userId: string): void {
  const task = () => runReportGeneration(reportId, userId);

  setImmediate(() => {
    void task();
  });
}

export async function createPendingReport(userId: string, yearMonth: string) {
  const user = await User.findById(userId).select("preferences.language");
  if (!user) {
    return null;
  }

  const prompt = await loadReportPrompt();
  const title = buildPlaceholderReportTitle(yearMonth, user.preferences.language);

  return FinancialReport.create({
    userId,
    yearMonth,
    title,
    status: "pending",
    promptUsed: prompt,
    content: null,
    error: null,
  });
}
