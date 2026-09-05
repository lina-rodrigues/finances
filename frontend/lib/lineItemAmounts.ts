import type { LineItem, LineItemType } from "@/lib/api";

type LineItemAmountSource = {
  realizedAmount?: number | null;
  entries?: { amount: number }[];
  entryCount?: number;
};

export function sumEntryAmounts(entries: { amount: number }[]): number {
  return entries.reduce((sum, entry) => sum + entry.amount, 0);
}

export function hasLineItemEntries(item: {
  entries?: unknown[];
  entryCount?: number;
}): boolean {
  return (item.entryCount ?? item.entries?.length ?? 0) > 0;
}

/** Realized total: sum of entries when present, otherwise legacy realizedAmount. */
export function getLineItemRealizedAmount(item: LineItemAmountSource): number | null {
  const entries = item.entries ?? [];
  if (entries.length > 0) {
    return sumEntryAmounts(entries);
  }
  return item.realizedAmount ?? null;
}

export function isLineItemRealized(item: LineItemAmountSource): boolean {
  return hasLineItemEntries(item);
}

export function normalizeLineItem(item: LineItem): LineItem {
  const realizedAmount = getLineItemRealizedAmount(item);
  const entryCount = item.entryCount ?? item.entries?.length ?? 0;
  return {
    ...item,
    entryCount,
    realizedAmount,
    isRealized: entryCount > 0,
    displayAmount: realizedAmount ?? item.plannedAmount,
  };
}

/** Signed amount for display: expense entries flip sign (refunds show as positive). */
export function signedEntryAmount(type: LineItemType, amount: number): number {
  return type === "income" ? amount : -amount;
}

/** Color by signed cash-flow effect: positive = green, negative = red. */
export function entryAmountTone(
  type: LineItemType,
  amount: number,
): "metric-amount--income" | "metric-amount--expense" | "metric-amount--muted" {
  const signed = signedEntryAmount(type, amount);
  if (signed > 0) return "metric-amount--income";
  if (signed < 0) return "metric-amount--expense";
  return "metric-amount--muted";
}

export function formatLineItemEntryDisplay(
  type: LineItemType,
  amount: number,
  formatMoney: (amount: number) => string,
): string {
  const signed = signedEntryAmount(type, amount);
  if (signed > 0) {
    return `+${formatMoney(signed)}`;
  }
  return formatMoney(signed);
}
