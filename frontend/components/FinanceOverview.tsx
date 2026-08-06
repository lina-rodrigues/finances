"use client";

import { LineItemDialogPanels, useLineItemDialogHost } from "@/components/LineItemDialogHost";
import { PageTitle } from "@/components/PageTitle";
import { UpcomingPaymentsList } from "@/components/UpcomingPaymentsList";
import { useMonthView } from "@/lib/MonthViewProvider";
import { useTranslation } from "@/lib/i18n";
import { useFormatCurrency } from "@/lib/useFormatCurrency";

function amountTone(amount: number): "metric-amount--income" | "metric-amount--expense" | "metric-amount--muted" {
  if (amount > 0) return "metric-amount--income";
  if (amount < 0) return "metric-amount--expense";
  return "metric-amount--muted";
}

export function FinanceOverview() {
  const { t } = useTranslation();
  const formatMoney = useFormatCurrency();
  const { month, categories, uncategorized, flatCategories } = useMonthView();
  const host = useLineItemDialogHost({ flatCategories, yearMonth: month.yearMonth });

  const metrics = [
    {
      key: "last",
      label: t("month.lastMonth"),
      amount: month.lastMonthRealizedBalance,
    },
    {
      key: "expected",
      label: t("month.expectedBudget"),
      amount: month.expectedBalance,
    },
    {
      key: "current",
      label: t("month.currentBudget"),
      amount: month.currentRealizedBalance,
    },
  ] as const;

  return (
    <>
      <div className="wa-stack wa-gap-l">
        <PageTitle
          actions={
            <wa-button
              type="button"
              variant="brand"
              data-testid="add-item-trigger-fab"
              onClick={() => host.openCreate()}
            >
              <wa-icon slot="start" name="plus"></wa-icon>
              {t("categories.addItem")}
            </wa-button>
          }
        >
          {t("nav.finance")}
        </PageTitle>

        <div
          className="wa-grid wa-gap-m"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(10rem, 1fr))" }}
        >
          {metrics.map((metric) => (
            <wa-card key={metric.key}>
              <div className="wa-stack wa-gap-2xs">
                <span className="wa-caption-s wa-color-text-quiet">{metric.label}</span>
                <span className={`metric-amount ${amountTone(metric.amount)}`}>
                  {formatMoney(metric.amount)}
                </span>
              </div>
            </wa-card>
          ))}
        </div>

        <section className="wa-stack wa-gap-m">
          <h2 className="wa-heading-s">{t("finance.upcomingPayments")}</h2>
          <UpcomingPaymentsList
            categories={categories}
            uncategorized={uncategorized}
            handlers={host.handlers}
          />
        </section>
      </div>

      <LineItemDialogPanels host={host} />
    </>
  );
}
