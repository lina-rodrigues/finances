interface BudgetBarProps {
  plannedTotal: number;
  realizedTotal: number;
}

export function BudgetBar({ plannedTotal, realizedTotal }: BudgetBarProps) {
  if (plannedTotal <= 0) return null;

  const pct = Math.min(100, Math.round((realizedTotal / plannedTotal) * 100));
  const overBudget = realizedTotal > plannedTotal;

  return (
    <div className="px-2 pb-2">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-muted-finance text-body text-xs">Budget</span>
        <span className={`text-body text-xs font-semibold ${overBudget ? "text-expense" : "text-muted-finance"}`}>
          {pct}%
        </span>
      </div>
      <div
        className="h-3 overflow-hidden border-2 border-foreground bg-muted"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${pct}% of budget used`}
      >
        <div
          className={`h-full transition-all duration-300 ${overBudget ? "bg-expense" : "bg-primary"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function computeBudgetTotals(
  lineItems: { plannedAmount: number; realizedAmount: number | null; type: string }[],
) {
  let plannedTotal = 0;
  let realizedTotal = 0;

  for (const item of lineItems) {
    if (item.type !== "expense") continue;
    plannedTotal += item.plannedAmount;
    realizedTotal += item.realizedAmount ?? 0;
  }

  return { plannedTotal, realizedTotal };
}

export { computeBudgetTotals };
