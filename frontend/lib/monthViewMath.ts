import type { Category, LineItem } from "@/lib/api";

export function effectiveAmount(item: {
  plannedAmount: number;
  realizedAmount: number | null;
}): number {
  return item.realizedAmount ?? item.plannedAmount;
}

export function computeEndingBalance(
  lastMonthBalance: number,
  lineItems: { type: string; plannedAmount: number; realizedAmount: number | null }[],
): number {
  let balance = lastMonthBalance;
  for (const item of lineItems) {
    const amount = effectiveAmount(item);
    balance += item.type === "income" ? amount : -amount;
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
  lineItems: { plannedAmount: number; realizedAmount: number | null; type: string }[],
) {
  let plannedTotal = 0;
  let realizedTotal = 0;

  for (const item of lineItems) {
    if (item.type !== "expense") continue;
    plannedTotal += item.plannedAmount;
    realizedTotal += item.realizedAmount ?? 0;
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
