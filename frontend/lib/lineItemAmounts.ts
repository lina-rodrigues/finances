import type { LineItemType } from "@/lib/api";

/** Signed amount for display: expense entries flip sign (refunds show as positive). */
export function signedEntryAmount(type: LineItemType, amount: number): number {
  return type === "income" ? amount : -amount;
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
