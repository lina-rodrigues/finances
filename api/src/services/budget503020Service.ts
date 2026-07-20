import {
  BUDGET_GROUPS,
  BUDGET_GROUP_TARGETS,
  type BudgetGroup,
  resolveBudgetGroup,
} from "../constants/budgetGroup.js";
import type { CategoryWithLineItems, LineItemResponse } from "./categoryService.js";

export interface BudgetBucketSummary {
  targetPct: number;
  targetAmount: number;
  actualAmount: number;
  actualPct: number;
  deltaAmount: number;
  deltaPct: number;
}

export interface Budget503020Summary {
  expenseTotal: number;
  hasExpenses: boolean;
  buckets: Record<BudgetGroup, BudgetBucketSummary>;
}

function sumExpenseDisplayAmount(items: LineItemResponse[]): number {
  return items
    .filter((item) => item.type === "expense")
    .reduce((sum, item) => sum + item.displayAmount, 0);
}

function bucketAmountForCategory(
  category: CategoryWithLineItems,
): Record<BudgetGroup, number> {
  const group = resolveBudgetGroup(category.budgetGroup);
  const amount = sumExpenseDisplayAmount(category.lineItems);
  return {
    essential: group === "essential" ? amount : 0,
    non_essential: group === "non_essential" ? amount : 0,
    investment: group === "investment" ? amount : 0,
  };
}

function emptyBuckets(): Record<BudgetGroup, number> {
  return { essential: 0, non_essential: 0, investment: 0 };
}

export function computeBudget503020(input: {
  categories: CategoryWithLineItems[];
  uncategorized: LineItemResponse[];
}): Budget503020Summary {
  const totals = emptyBuckets();

  for (const category of input.categories) {
    const bucketAmounts = bucketAmountForCategory(category);
    for (const group of BUDGET_GROUPS) {
      totals[group] += bucketAmounts[group];
    }
  }

  const uncategorizedExpense = sumExpenseDisplayAmount(input.uncategorized);
  totals.non_essential += uncategorizedExpense;

  const expenseTotal = BUDGET_GROUPS.reduce((sum, group) => sum + totals[group], 0);

  const buckets = {} as Record<BudgetGroup, BudgetBucketSummary>;
  for (const group of BUDGET_GROUPS) {
    const targetPct = BUDGET_GROUP_TARGETS[group];
    const actualAmount = totals[group];
    const targetAmount = expenseTotal > 0 ? (expenseTotal * targetPct) / 100 : 0;
    const actualPct = expenseTotal > 0 ? (actualAmount / expenseTotal) * 100 : 0;
    const deltaAmount = actualAmount - targetAmount;
    const deltaPct = actualPct - targetPct;

    buckets[group] = {
      targetPct,
      targetAmount,
      actualAmount,
      actualPct,
      deltaAmount,
      deltaPct,
    };
  }

  return {
    expenseTotal,
    hasExpenses: expenseTotal > 0,
    buckets,
  };
}
