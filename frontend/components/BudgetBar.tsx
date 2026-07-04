"use client";

import { useTranslation } from "@/lib/i18n";
import { useFormatCurrency } from "@/lib/useFormatCurrency";

interface BudgetBarProps {
  plannedTotal: number;
  realizedTotal: number;
}

export function BudgetBar({ plannedTotal, realizedTotal }: BudgetBarProps) {
  const { t } = useTranslation();
  const formatMoney = useFormatCurrency();

  if (plannedTotal <= 0) return null;

  const actualPct = Math.round((realizedTotal / plannedTotal) * 100);
  const fillPct = Math.min(100, actualPct);
  const overBudget = realizedTotal > plannedTotal;
  const nothingRealized = realizedTotal === 0;

  return (
    <div className="px-2 pb-2">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-muted-finance text-body text-xs">{t("addItem.planned")}</span>
        <span
          className={`text-body text-xs font-semibold ${overBudget ? "text-expense" : "text-muted-finance"}`}
        >
          {nothingRealized
            ? t("budget.plannedOf", {
                spent: formatMoney(0),
                planned: formatMoney(plannedTotal),
              })
            : `${actualPct}%`}
        </span>
      </div>
      <div
        className="h-3 overflow-hidden border-2 border-foreground bg-muted"
        role="progressbar"
        aria-valuenow={fillPct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={
          nothingRealized
            ? t("budget.plannedOf", {
                spent: formatMoney(0),
                planned: formatMoney(plannedTotal),
              })
            : `${actualPct}%`
        }
      >
        <div
          className={`h-full transition-all duration-300 ${overBudget ? "bg-expense" : "bg-primary"}`}
          style={{ width: `${fillPct}%` }}
        />
      </div>
    </div>
  );
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
