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

  const label = nothingRealized
    ? t("budget.plannedOf", {
        spent: formatMoney(0),
        planned: formatMoney(plannedTotal),
      })
    : `${actualPct}%`;

  return (
    <div className="wa-stack wa-gap-2xs" style={{ paddingInline: "var(--wa-space-s)" }}>
      <div className="wa-cluster" style={{ justifyContent: "space-between" }}>
        <span className="wa-caption-m wa-color-text-quiet">{t("addItem.planned")}</span>
        <span
          className={`wa-caption-m ${overBudget ? "metric-amount--expense" : "wa-color-text-quiet"}`}
          style={{ fontWeight: 600 }}
        >
          {label}
        </span>
      </div>
      <wa-progress-bar
        value={fillPct}
        label={label}
        style={
          {
            "--track-height": "0.75rem",
            ...(overBudget
              ? { "--indicator-color": "var(--wa-color-danger-fill-loud)" }
              : {}),
          } as React.CSSProperties
        }
      ></wa-progress-bar>
    </div>
  );
}

export { computeBudgetTotals } from "@/lib/monthViewMath";
