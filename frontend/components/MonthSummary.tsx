import Link from "next/link";
import { CoinCounter } from "@/components/CoinCounter";
import { Icon } from "@/components/Icon";
import { Badge } from "@/components/ui/pixelact-ui/badge";
import { Button } from "@/components/ui/pixelact-ui/button";
import { Card, CardContent } from "@/components/ui/pixelact-ui/card";
import {
  formatCurrency,
  monthPagePath,
  nextYearMonth,
  prevYearMonth,
  type MonthView,
} from "@/lib/api";

interface MonthSummaryProps {
  month: MonthView["month"];
}

function monthParts(yearMonth: string) {
  const [year, month] = yearMonth.split("-");
  const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
  return {
    month: date.toLocaleDateString("en-US", { month: "long" }).toUpperCase(),
    year,
  };
}

export function MonthSummary({ month }: MonthSummaryProps) {
  const { month: monthName, year } = monthParts(month.yearMonth);
  const leveledUp = month.endingBalance > month.lastMonthBalance;
  const previousMonth = prevYearMonth(month.yearMonth);
  const followingMonth = nextYearMonth(month.yearMonth);

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 p-4 text-center">
        <div className="flex items-center justify-center gap-4">
          <Button variant="secondary" size="sm" className="pressable focus-ring" asChild>
            <Link href={monthPagePath(previousMonth)} aria-label="Previous month">
              <Icon name="chevronLeft" size="md" />
            </Link>
          </Button>

          <div>
            <div className="text-display text-pixel text-2xl text-balance">{monthName}</div>
            {year && (
              <div className="text-muted-finance text-body mt-1 text-sm font-semibold tracking-widest">
                {year}
              </div>
            )}
          </div>

          <Button variant="secondary" size="sm" className="pressable focus-ring" asChild>
            <Link href={monthPagePath(followingMonth)} aria-label="Next month">
              <Icon name="chevronRight" size="md" />
            </Link>
          </Button>
        </div>

        {leveledUp && (
          <Badge className="bg-income-subtle text-foreground">
            Level up! Ending balance improved
          </Badge>
        )}

        <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
          <CoinCounter
            label="Last month"
            amount={formatCurrency(month.lastMonthBalance)}
            icon="balance"
          />
          <CoinCounter
            label="Ending"
            amount={formatCurrency(month.endingBalance)}
            highlight
            icon="endingBalance"
          />
        </div>
      </CardContent>
    </Card>
  );
}
