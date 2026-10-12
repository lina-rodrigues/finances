import type { LineItem } from "@/lib/api";
import { getLineItemRealizedAmount, hasLineItemEntries } from "@/lib/lineItemAmounts";

export function payRemainderAmount(item: LineItem): number | null {
  const spent = getLineItemRealizedAmount(item) ?? 0;
  const remainder = item.plannedAmount - spent;
  if (remainder > 0) {
    return remainder;
  }
  // Unpaid items planned at zero can still be marked paid.
  if (remainder === 0 && !hasLineItemEntries(item)) {
    return 0;
  }
  return null;
}

/** Default amount shown in the Pay dialog (equals planned when nothing is recorded yet). */
export function payDefaultAmount(item: LineItem): number | null {
  return payRemainderAmount(item);
}

export function isPayDisabled(item: LineItem): boolean {
  return payRemainderAmount(item) === null;
}
