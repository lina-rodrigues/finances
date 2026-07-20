import { resolveBudgetGroup } from "../constants/budgetGroup.js";
import type { CategoryWithLineItems, LineItemResponse } from "./categoryService.js";
import { computeBudget503020, type Budget503020Summary } from "./budget503020Service.js";

export interface ReportLineItemPayload {
  label: string;
  categoryName: string | null;
  amount: number;
  budgetGroup?: string;
}

export interface ReportPayload {
  yearMonth: string;
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

function mapIncomeItem(item: LineItemResponse, categoryName: string | null): ReportLineItemPayload {
  return {
    label: item.label,
    categoryName,
    amount: item.displayAmount,
  };
}

function mapExpenseItem(item: LineItemResponse, categoryName: string | null, budgetGroup: string): ReportLineItemPayload {
  return {
    label: item.label,
    categoryName,
    budgetGroup,
    amount: item.displayAmount,
  };
}

export function buildReportPayload(input: {
  yearMonth: string;
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
        incomeItems.push(mapIncomeItem(item, category.name));
      } else {
        expenseItems.push(mapExpenseItem(item, category.name, resolvedGroup));
      }
    }
  }

  for (const item of input.uncategorized) {
    if (item.type === "income") {
      incomeItems.push(mapIncomeItem(item, null));
    } else {
      expenseItems.push(mapExpenseItem(item, null, resolveBudgetGroup(null)));
    }
  }

  const incomeTotal = incomeItems.reduce((sum, item) => sum + item.amount, 0);
  const budgetSummary = computeBudget503020({
    categories: input.categories,
    uncategorized: input.uncategorized,
  });

  return {
    yearMonth: input.yearMonth,
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
