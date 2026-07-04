import { Month, type IMonth } from "../models/Month.js";
import { LineItem, effectiveAmount } from "../models/LineItem.js";
import { nextYearMonth } from "../utils/yearMonth.js";

export function computeBalance(
  lastMonthBalance: number,
  lineItems: { type: string; plannedAmount: number; realizedAmount: number | null }[],
): number {
  let balance = lastMonthBalance;
  for (const item of lineItems) {
    const amount = effectiveAmount(item);
    balance += item.type === "income" ? amount : -amount;
  }
  return balance;
}

export async function computeEndingBalance(month: IMonth): Promise<number> {
  const lineItems = await LineItem.find({ monthId: month._id });
  return computeBalance(month.lastMonthBalance, lineItems);
}

export async function cascadeBalanceFrom(yearMonth: string): Promise<void> {
  const month = await Month.findOne({ yearMonth });
  if (!month) {
    return;
  }

  let endingBalance = await computeEndingBalance(month);
  let currentYearMonth = yearMonth;

  while (true) {
    const next = nextYearMonth(currentYearMonth);
    const nextMonth = await Month.findOne({ yearMonth: next });

    if (!nextMonth) {
      break;
    }

    if (nextMonth.lastMonthBalance !== endingBalance) {
      nextMonth.lastMonthBalance = endingBalance;
      await nextMonth.save();
    }

    endingBalance = await computeEndingBalance(nextMonth);
    currentYearMonth = next;
  }
}

export async function ensureMonth(yearMonth: string): Promise<IMonth> {
  const existing = await Month.findOne({ yearMonth });
  if (existing) {
    return existing;
  }

  const prev = await Month.findOne({ yearMonth: { $lt: yearMonth } }).sort({ yearMonth: -1 });
  const lastMonthBalance = prev ? await computeEndingBalance(prev) : 0;

  return Month.create({ yearMonth, lastMonthBalance });
}
