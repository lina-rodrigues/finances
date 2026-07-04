"use client";

import Link from "next/link";
import { CoinCounter } from "@/components/CoinCounter";
import { Icon } from "@/components/Icon";
import { Badge } from "@/components/ui/pixelact-ui/badge";
import { Button } from "@/components/ui/pixelact-ui/button";
import { Card, CardContent } from "@/components/ui/pixelact-ui/card";
import {
  getCurrentYearMonth,
  monthPagePath,
  nextYearMonth,
  prevYearMonth,
  type MonthView,
} from "@/lib/api";
import { useAuth } from "@/lib/AuthProvider";
import { useTranslation } from "@/lib/i18n";
import { useFormatCurrency } from "@/lib/useFormatCurrency";
import { getLocaleTag } from "@/lib/api";

interface MonthSummaryProps {
  month: MonthView["month"];
}

function monthParts(yearMonth: string, localeTag: string) {
  const [year, month] = yearMonth.split("-");
  const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
  return {
    month: date.toLocaleDateString(localeTag, { month: "long" }).toUpperCase(),
    year,
  };
}

export function MonthSummary({ month }: MonthSummaryProps) {
  const { t } = useTranslation();
  const { preferences } = useAuth();
  const formatMoney = useFormatCurrency();
  const localeTag = getLocaleTag(preferences.language);
  const { month: monthName, year } = monthParts(month.yearMonth, localeTag);
  const leveledUp =
    month.endingBalance > month.lastMonthBalance &&
    month.yearMonth <= getCurrentYearMonth();
  const previousMonth = prevYearMonth(month.yearMonth);
  const followingMonth = nextYearMonth(month.yearMonth);

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 p-4 text-center">
        <div className="flex items-center justify-center gap-4">
          <Button variant="secondary" size="sm" className="pressable focus-ring" asChild>
            <Link href={monthPagePath(previousMonth)} aria-label={t("month.previousMonth")}>
              <Icon name="chevronLeft" size="md" />
            </Link>
          </Button>

          <div>
            <h2 className="text-display text-fin-balance text-2xl">{monthName}</h2>
            {year && (
              <div className="text-muted-finance text-body mt-1 text-sm font-semibold tracking-widest">
                {year}
              </div>
            )}
          </div>

          <Button variant="secondary" size="sm" className="pressable focus-ring" asChild>
            <Link href={monthPagePath(followingMonth)} aria-label={t("month.nextMonth")}>
              <Icon name="chevronRight" size="md" />
            </Link>
          </Button>
        </div>

        {leveledUp && (
          <Badge className="bg-income-subtle h-auto max-w-full whitespace-normal text-center text-foreground">
            <span className="flex flex-wrap items-center justify-center gap-1">
              <Icon name="arrowUp" size="xs" colorClass="text-income" />
              {t("month.levelUp")}
            </span>
          </Badge>
        )}

        <div className="grid w-full grid-cols-1 gap-3 lg:grid-cols-2">
          <CoinCounter
            label={t("month.lastMonth")}
            amount={formatMoney(month.lastMonthBalance)}
            icon="balance"
          />
          <CoinCounter
            label={t("month.ending")}
            amount={formatMoney(month.endingBalance)}
            highlight
            icon="endingBalance"
          />
        </div>
      </CardContent>
    </Card>
  );
}
