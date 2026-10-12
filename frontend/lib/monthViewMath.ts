import type { Category, LineItem, LineItemOperationMode } from "@/lib/api";
import { getLineItemRealizedAmount } from "@/lib/lineItemAmounts";

export function effectiveAmount(item: {
  plannedAmount: number;
  realizedAmount?: number | null;
  entries?: { amount: number }[];
  entryCount?: number;
}): number {
  return getLineItemRealizedAmount(item) ?? item.plannedAmount;
}

/** Contribution to the expected budget. Display amounts stay on effectiveAmount. */
export function expectedAmount(item: {
  operationMode?: LineItemOperationMode | null;
  plannedAmount: number;
  realizedAmount?: number | null;
  entries?: { amount: number }[];
  entryCount?: number;
}): number {
  if ((item.operationMode ?? "prediction") === "budget") {
    return Math.max(item.plannedAmount, getLineItemRealizedAmount(item) ?? 0);
  }
  return effectiveAmount(item);
}

export function computeEndingBalance(
  lastMonthBalance: number,
  lineItems: {
    type: string;
    plannedAmount: number;
    operationMode?: LineItemOperationMode | null;
    realizedAmount: number | null;
    entries?: { amount: number }[];
    entryCount?: number;
  }[],
): number {
  let balance = lastMonthBalance;
  for (const item of lineItems) {
    const amount = expectedAmount(item);
    balance += item.type === "income" ? amount : -amount;
  }
  return balance;
}

export function computeRealizedBalance(
  lastMonthBalance: number,
  lineItems: {
    type: string;
    realizedAmount?: number | null;
    entries?: { amount: number }[];
    entryCount?: number;
  }[],
): number {
  let balance = lastMonthBalance;
  for (const item of lineItems) {
    const realizedAmount = getLineItemRealizedAmount(item);
    if (realizedAmount === null) {
      continue;
    }
    balance += item.type === "income" ? realizedAmount : -realizedAmount;
  }
  return balance;
}

export function sumCategoryAmounts(lineItems: Pick<LineItem, "type" | "displayAmount">[]): number {
  return lineItems.reduce((sum, item) => {
    const amount = item.displayAmount;
    return sum + (item.type === "income" ? amount : -amount);
  }, 0);
}

export function collectAllLineItems(
  categories: Category[],
  uncategorized: LineItem[],
): LineItem[] {
  const items: LineItem[] = [];
  for (const category of categories) {
    items.push(...category.lineItems);
  }
  items.push(...uncategorized);
  return items;
}

export function computeBudgetTotals(
  lineItems: {
    plannedAmount: number;
    realizedAmount?: number | null;
    entries?: { amount: number }[];
    entryCount?: number;
    type: string;
  }[],
) {
  let plannedTotal = 0;
  let realizedTotal = 0;

  for (const item of lineItems) {
    if (item.type !== "expense") continue;
    plannedTotal += item.plannedAmount;
    realizedTotal += getLineItemRealizedAmount(item) ?? 0;
  }

  return { plannedTotal, realizedTotal };
}

export function recomputeEndingBalance(
  lastMonthBalance: number,
  categories: Category[],
  uncategorized: LineItem[],
): number {
  return computeEndingBalance(lastMonthBalance, collectAllLineItems(categories, uncategorized));
}

export function recomputeRealizedBalance(
  lastMonthBalance: number,
  categories: Category[],
  uncategorized: LineItem[],
): number {
  return computeRealizedBalance(lastMonthBalance, collectAllLineItems(categories, uncategorized));
}
