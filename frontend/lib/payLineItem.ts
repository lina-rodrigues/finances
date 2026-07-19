import type { LineItem } from "@/lib/api";

export function payRemainderAmount(item: LineItem): number | null {
  const spent = item.realizedAmount ?? 0;
  const remainder = item.plannedAmount - spent;
  return remainder > 0 ? remainder : null;
}

export function isPayDisabled(item: LineItem): boolean {
  return payRemainderAmount(item) === null;
}
