import type { AiReportTone } from "../constants/aiReportTone.js";
import { resolveBudgetGroup } from "../constants/budgetGroup.js";
import type { AppLanguage } from "../models/User.js";
import type { CategoryWithLineItems, LineItemResponse } from "./categoryService.js";
import { computeBudget503020, type Budget503020Summary } from "./budget503020Service.js";
import { computeSeriesAbsoluteLastMonth } from "./recurrenceService.js";

export type ReportRecurrenceDuration = "ongoing" | "fixed_occurrences" | "until_month";

export interface ReportRecurrencePayload {
  isRecurring: boolean;
  startYearMonth?: string;
  occurrenceNumber?: number;
  duration?: ReportRecurrenceDuration;
  totalOccurrences?: number;
  finalYearMonth?: string;
  isOneOffChange?: boolean;
}

export interface ReportLineItemPayload {
  label: string;
  categoryName: string | null;
  amount: number;
  budgetGroup?: string;
  recurrence: ReportRecurrencePayload;
}

export interface ReportPayload {
  yearMonth: string;
  language: AppLanguage;
  reportTone: AiReportTone;
  monthTotals: {
    lastMonthRealizedBalance: number;
    expectedBalance: number;
    currentRealizedBalance: number;
  };
  incomeTotal: number;
  incomeItems: ReportLineItemPayload[];
  expenseItems: ReportLineItemPayload[];
  budgetSummary: Budget503020Summary;
}

function mapRecurrence(item: LineItemResponse): ReportRecurrencePayload {
  if (!item.seriesId) {
    return { isRecurring: false };
  }

  const recurrence: ReportRecurrencePayload = {
    isRecurring: true,
    isOneOffChange: item.isSeriesException,
  };

  if (item.seriesStartYearMonth) {
    recurrence.startYearMonth = item.seriesStartYearMonth;
  }

  if (item.seriesOccurrenceIndex != null) {
    recurrence.occurrenceNumber = item.seriesOccurrenceIndex;
  }

  if (item.seriesCancelled) {
    recurrence.duration = "until_month";
    if (item.seriesEndYearMonth) {
      recurrence.finalYearMonth = item.seriesEndYearMonth;
    }
    return recurrence;
  }

  if (item.seriesEndType === "count" && item.seriesOccurrenceCount != null) {
    recurrence.duration = "fixed_occurrences";
    recurrence.totalOccurrences = item.seriesOccurrenceCount;
    if (item.seriesStartYearMonth) {
      const finalYearMonth = computeSeriesAbsoluteLastMonth({
        startYearMonth: item.seriesStartYearMonth,
        endType: "count",
        occurrenceCount: item.seriesOccurrenceCount,
        endYearMonth: null,
        cancelledAt: null,
      });
      if (finalYearMonth) {
        recurrence.finalYearMonth = finalYearMonth;
      }
    }
    return recurrence;
  }

  if (item.seriesEndType === "until" && item.seriesEndYearMonth) {
    recurrence.duration = "until_month";
    recurrence.finalYearMonth = item.seriesEndYearMonth;
    return recurrence;
  }

  recurrence.duration = "ongoing";
  return recurrence;
}

function mapLineItem(
  item: LineItemResponse,
  categoryName: string | null,
  budgetGroup?: string,
): ReportLineItemPayload {
  return {
    label: item.label,
    categoryName,
    amount: item.displayAmount,
    ...(budgetGroup ? { budgetGroup } : {}),
    recurrence: mapRecurrence(item),
  };
}

export function buildReportPayload(input: {
  yearMonth: string;
  language: AppLanguage;
  reportTone: AiReportTone;
  monthTotals: {
    lastMonthRealizedBalance: number;
    expectedBalance: number;
    currentRealizedBalance: number;
  };
  categories: CategoryWithLineItems[];
  uncategorized: LineItemResponse[];
}): ReportPayload {
  const incomeItems: ReportLineItemPayload[] = [];
  const expenseItems: ReportLineItemPayload[] = [];

  for (const category of input.categories) {
    const resolvedGroup = resolveBudgetGroup(category.budgetGroup);
    for (const item of category.lineItems) {
      if (item.type === "income") {
        incomeItems.push(mapLineItem(item, category.name));
      } else {
        expenseItems.push(mapLineItem(item, category.name, resolvedGroup));
      }
    }
  }

  for (const item of input.uncategorized) {
    if (item.type === "income") {
      incomeItems.push(mapLineItem(item, null));
    } else {
      expenseItems.push(mapLineItem(item, null, resolveBudgetGroup(null)));
    }
  }

  const incomeTotal = incomeItems.reduce((sum, item) => sum + item.amount, 0);
  const budgetSummary = computeBudget503020({
    categories: input.categories,
    uncategorized: input.uncategorized,
  });

  return {
    yearMonth: input.yearMonth,
    language: input.language,
    reportTone: input.reportTone,
    monthTotals: input.monthTotals,
    incomeTotal,
    incomeItems,
    expenseItems,
    budgetSummary,
  };
}

export function serializeReportPayload(prompt: string, payload: ReportPayload): string {
  return `${prompt}\n\n---\n\n${JSON.stringify(payload, null, 2)}`;
}
