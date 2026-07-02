import { formatCurrency, formatYearMonthLabel, type MonthView } from "@/lib/api";

interface MonthSummaryProps {
  month: MonthView["month"];
}

export function MonthSummary({ month }: MonthSummaryProps) {
  return (
    <div className="card bg-base-100 shadow-md">
      <div className="card-body">
        <h1 className="card-title text-2xl">{formatYearMonthLabel(month.yearMonth)}</h1>
        <div className="stats stats-vertical w-full shadow-none lg:stats-horizontal">
          <div className="stat">
            <div className="stat-title">Last month balance</div>
            <div className="stat-value text-lg">{formatCurrency(month.lastMonthBalance)}</div>
          </div>
          <div className="stat">
            <div className="stat-title">Ending balance</div>
            <div className="stat-value text-lg text-primary">
              {formatCurrency(month.endingBalance)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
