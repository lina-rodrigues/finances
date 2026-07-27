"use client";

import { useEffect, useState } from "react";
import { fetchBudget503020, type Budget503020Summary, type BudgetGroup } from "@/lib/api";
import { useTranslation } from "@/lib/i18n";
import { useFormatCurrency } from "@/lib/useFormatCurrency";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@lina-rodrigues/cotton-candy";
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
    <section className="space-y-3">
      <h2 className="text-display text-sm">{t("reports.budgetTitle")}</h2>

      {loading && (
        <p className="text-muted-finance text-body text-sm">{t("common.loading")}</p>
      )}

      {error && !loading && (
        <p className="text-body text-sm text-expense">{error}</p>
      )}

      {!loading && !error && summary && !summary.hasExpenses && (
        <Card>
          <CardContent className="p-4">
            <p className="text-muted-finance text-body text-sm">{t("reports.budgetEmpty")}</p>
          </CardContent>
        </Card>
      )}

      {!loading && !error && summary && summary.hasExpenses && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-display text-xs">{t("reports.budgetTotalExpenses")}</CardTitle>
            <p className="text-amount text-lg">{formatMoney(summary.expenseTotal)}</p>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            {BUDGET_GROUPS.map((group) => {
              const bucket = summary.buckets[group];
              const fillPct = Math.min(100, Math.round(bucket.actualPct));
              const overTarget = bucket.deltaPct > 0.5;

              return (
                <div key={group} className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-body text-xs font-semibold">{t(bucketLabelKey(group))}</span>
                    <span
                      className={`text-body text-xs font-semibold ${overTarget ? "text-expense" : "text-muted-finance"}`}
                    >
                      {t("reports.budgetActualVsTarget", {
                        actual: String(Math.round(bucket.actualPct)),
                        target: String(bucket.targetPct),
                      })}
                    </span>
                  </div>
                  <div
                    className="h-3 overflow-hidden border-2 border-foreground bg-muted"
                    role="progressbar"
                    aria-valuenow={fillPct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={t(bucketLabelKey(group))}
                  >
                    <div
                      className={`h-full transition-all duration-300 ${overTarget ? "bg-expense" : "bg-primary"}`}
                      style={{ width: `${fillPct}%` }}
                    />
                  </div>
                  <div className="text-muted-finance flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span>{formatMoney(bucket.actualAmount)}</span>
                    <span>
                      {bucket.deltaAmount >= 0 ? "+" : ""}
                      {formatMoney(bucket.deltaAmount)} {t("reports.budgetVsTarget")}
                    </span>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </section>
  );
}
