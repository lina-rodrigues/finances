"use client";

import { useState } from "react";
import { LineItemDialog } from "@/components/LineItemDialog";
import { CoinCounter } from "@/components/CoinCounter";
import { Icon } from "@/components/Icon";
import { UpcomingPaymentsList } from "@/components/UpcomingPaymentsList";
import { Badge } from "@/components/ui/pixelact-ui/badge";
import { Button } from "@/components/ui/pixelact-ui/button";
import { Card, CardContent } from "@/components/ui/pixelact-ui/card";
import { getCurrentYearMonth } from "@/lib/api";
import { useMonthView } from "@/lib/MonthViewProvider";
import { useTranslation } from "@/lib/i18n";
import { useFormatCurrency } from "@/lib/useFormatCurrency";

export function FinanceOverview() {
  const { t } = useTranslation();
  const formatMoney = useFormatCurrency();
  const { month, categories, uncategorized, flatCategories } = useMonthView();
  const [dialogOpen, setDialogOpen] = useState(false);
  const leveledUp =
    month.expectedBalance > month.lastMonthRealizedBalance &&
    month.yearMonth <= getCurrentYearMonth();

  return (
    <>
      <div className="space-y-5">
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-4 text-center">
            {leveledUp && (
              <Badge className="bg-income-subtle text-income h-auto max-w-full whitespace-normal text-center">
                <span className="flex flex-wrap items-center justify-center gap-1">
                  <Icon name="arrowUp" size="xs" colorClass="text-income" />
                  {t("month.levelUp")}
                </span>
              </Badge>
            )}

            <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-4">
              <CoinCounter
                plain
                label={t("month.lastMonth")}
                amount={formatMoney(month.lastMonthRealizedBalance)}
                icon="balance"
              />
              <CoinCounter
                plain
                label={t("month.expectedBudget")}
                amount={formatMoney(month.expectedBalance)}
                highlight
                icon="planned"
              />
              <CoinCounter
                plain
                label={t("month.currentBudget")}
                amount={formatMoney(month.currentRealizedBalance)}
                icon="endingBalance"
              />
            </div>
          </CardContent>
        </Card>

        <section className="py-5">
          <h2 className="text-display mb-3 text-sm">{t("finance.upcomingPayments")}</h2>
          <UpcomingPaymentsList categories={categories} uncategorized={uncategorized} />
        </section>
      </div>

      <Button
        type="button"
        variant="default"
        size="lg"
        className="add-item-fab pressable focus-ring box-shadow-margin sm:hidden"
        data-testid="add-item-trigger-fab"
        aria-label={t("categories.addItem")}
        onClick={() => setDialogOpen(true)}
      >
        <Icon name="add" size="md" />
      </Button>

      <LineItemDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode="create"
        categories={flatCategories}
        yearMonth={month.yearMonth}
      />
    </>
  );
}
