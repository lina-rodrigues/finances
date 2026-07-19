import type { LineItem } from "@/lib/api";

export function payRemainderAmount(item: LineItem): number | null {
  const spent = item.realizedAmount ?? 0;
  const remainder = item.plannedAmount - spent;
  return remainder > 0 ? remainder : null;
}

/** Default amount shown in the Pay dialog (equals planned when nothing is recorded yet). */
export function payDefaultAmount(item: LineItem): number | null {
  return payRemainderAmount(item);
}

export function isPayDisabled(item: LineItem): boolean {
  return payRemainderAmount(item) === null;
}
