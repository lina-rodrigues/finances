import { Icon } from "@/components/Icon";
import { formatCurrency, formatYearMonthLabel, type MonthView } from "@/lib/api";

interface MonthSummaryProps {
  month: MonthView["month"];
}

export function MonthSummary({ month }: MonthSummaryProps) {
  return (
    <div className="card bg-base-100 shadow-md card-hover-lift">
      <div className="card-body">
        <h1 className="card-title text-display text-2xl">
          {formatYearMonthLabel(month.yearMonth)}
        </h1>
        <div className="stats stats-vertical w-full shadow-none lg:stats-horizontal">
          <div className="stat">
            <div className="stat-figure text-balance">
              <Icon name="balance" size="lg" />
            </div>
            <div className="stat-title">Last month balance</div>
            <div className="stat-value text-amount text-lg">{formatCurrency(month.lastMonthBalance)}</div>
          </div>
          <div className="stat">
            <div className="stat-figure text-balance">
              <Icon name="endingBalance" size="lg" />
            </div>
            <div className="stat-title">Ending balance</div>
            <div className="stat-value text-amount text-lg text-balance">
              {formatCurrency(month.endingBalance)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
