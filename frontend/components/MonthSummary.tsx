import { CoinCounter } from "@/components/CoinCounter";
import { Frame } from "@/components/Frame";
import { Badge } from "@/components/ui/pixelact-ui/badge";
import { formatCurrency, formatYearMonthLabel, type MonthView } from "@/lib/api";

interface MonthSummaryProps {
  month: MonthView["month"];
}

function monthParts(yearMonth: string) {
  const label = formatYearMonthLabel(yearMonth);
  const parts = label.split(" ");
  return {
    month: parts[0]?.toUpperCase() ?? label.toUpperCase(),
    year: parts[1] ?? "",
  };
}

export function MonthSummary({ month }: MonthSummaryProps) {
  const { month: monthName, year } = monthParts(month.yearMonth);
  const leveledUp = month.endingBalance > month.lastMonthBalance;

  return (
    <Frame className="card-hover-lift">
      <div className="flex flex-col items-center gap-4 text-center">
        <div>
          <div className="text-display text-pixel text-2xl text-primary">{monthName}</div>
          {year && (
            <div className="text-muted-finance text-body mt-1 text-sm font-semibold tracking-widest">
              {year}
            </div>
          )}
        </div>

        {leveledUp && (
          <Badge className="bg-income-subtle text-foreground">
            Level up! Ending balance improved
          </Badge>
        )}

        <div className="grid w-full gap-3 sm:grid-cols-2">
          <CoinCounter
            label="Last month balance"
            amount={formatCurrency(month.lastMonthBalance)}
          />
          <CoinCounter
            label="Ending balance"
            amount={formatCurrency(month.endingBalance)}
            highlight
          />
        </div>
      </div>
    </Frame>
  );
}
