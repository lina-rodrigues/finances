"use client";

import { useEffect, useState } from "react";
import { fetchBudget503020, type Budget503020Summary, type BudgetGroup } from "@/lib/api";
import { useTranslation } from "@/lib/i18n";
import { useFormatCurrency } from "@/lib/useFormatCurrency";

const BUDGET_GROUPS: BudgetGroup[] = ["essential", "non_essential", "investment"];

interface Budget503020SectionProps {
  yearMonth: string;
}

function bucketLabelKey(group: BudgetGroup): string {
  switch (group) {
    case "essential":
      return "reports.budgetEssential";
    case "non_essential":
      return "reports.budgetNonEssential";
    case "investment":
      return "reports.budgetInvestment";
  }
}

export function Budget503020Section({ yearMonth }: Budget503020SectionProps) {
  const { t } = useTranslation();
  const formatMoney = useFormatCurrency();
  const [summary, setSummary] = useState<Budget503020Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    void fetchBudget503020(yearMonth)
      .then((data) => {
        if (!cancelled) {
          setSummary(data);
        }
      })
      .catch((fetchError: unknown) => {
        if (!cancelled) {
          setError(fetchError instanceof Error ? fetchError.message : t("common.somethingWrong"));
          setSummary(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [yearMonth, t]);

  return (
    <section className="wa-stack wa-gap-m">
      <h2 className="wa-heading-s">{t("reports.budgetTitle")}</h2>

      {loading && (
        <p className="wa-caption-m wa-color-text-quiet">{t("common.loading")}</p>
      )}

      {error && !loading && (
        <wa-callout variant="danger">
          <wa-icon slot="icon" name="circle-exclamation"></wa-icon>
          {error}
        </wa-callout>
      )}

      {!loading && !error && summary && !summary.hasExpenses && (
        <wa-card>
          <p className="wa-caption-m wa-color-text-quiet">{t("reports.budgetEmpty")}</p>
        </wa-card>
      )}

      {!loading && !error && summary && summary.hasExpenses && (
        <wa-card>
          <div className="wa-stack wa-gap-l">
            <div className="wa-stack wa-gap-2xs">
              <span className="wa-heading-xs">{t("reports.budgetTotalExpenses")}</span>
              <span className="metric-amount metric-amount--expense">
                {formatMoney(summary.expenseTotal)}
              </span>
            </div>

            <div className="wa-stack wa-gap-m">
              {BUDGET_GROUPS.map((group) => {
                const bucket = summary.buckets[group];
                const fillPct = Math.min(100, Math.round(bucket.actualPct));
                const overTarget = bucket.deltaPct > 0.5;

                return (
                  <div key={group} className="wa-stack wa-gap-2xs">
                    <div
                      className="wa-cluster wa-gap-s"
                      style={{ justifyContent: "space-between" }}
                    >
                      <span
                        className="wa-caption-s"
                        style={{ fontWeight: "var(--wa-font-weight-semibold)" }}
                      >
                        {t(bucketLabelKey(group))}
                      </span>
                      <span
                        className={`wa-caption-s ${overTarget ? "metric-amount--expense" : "wa-color-text-quiet"}`}
                        style={{ fontWeight: "var(--wa-font-weight-semibold)" }}
                      >
                        {t("reports.budgetActualVsTarget", {
                          actual: String(Math.round(bucket.actualPct)),
                          target: String(bucket.targetPct),
                        })}
                      </span>
                    </div>
                    <wa-progress-bar
                      value={fillPct}
                      aria-label={t(bucketLabelKey(group))}
                      style={
                        overTarget
                          ? ({
                              "--indicator-color": "var(--wa-color-danger-fill-normal)",
                            } as React.CSSProperties)
                          : undefined
                      }
                    ></wa-progress-bar>
                    <div
                      className="wa-cluster wa-gap-s wa-caption-s wa-color-text-quiet"
                      style={{ justifyContent: "space-between" }}
                    >
                      <span>{formatMoney(bucket.actualAmount)}</span>
                      <span>
                        {bucket.deltaAmount >= 0 ? "+" : ""}
                        {formatMoney(bucket.deltaAmount)} {t("reports.budgetVsTarget")}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </wa-card>
      )}
    </section>
  );
}
