import { Month } from "../models/Month.js";
import { LineItem, effectiveAmount } from "../models/LineItem.js";
import { nextYearMonth } from "../utils/yearMonth.js";

export async function computeEndingBalance(monthId: string): Promise<number> {
  const month = await Month.findById(monthId);
  if (!month) {
    throw new Error("Month not found");
  }

  const lineItems = await LineItem.find({ monthId: month._id });

  let totalIncome = 0;
  let totalExpense = 0;

  for (const item of lineItems) {
    const amount = effectiveAmount(item);
    if (item.type === "income") {
      totalIncome += amount;
    } else {
      totalExpense += amount;
    }
  }

  return month.lastMonthBalance + totalIncome - totalExpense;
}

export async function cascadeBalanceFrom(yearMonth: string): Promise<void> {
  const month = await Month.findOne({ yearMonth });
  if (!month) {
    return;
  }

  let endingBalance = await computeEndingBalance(month._id.toString());
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

    endingBalance = await computeEndingBalance(nextMonth._id.toString());
    currentYearMonth = next;
  }
}

export async function ensureMonth(yearMonth: string): Promise<typeof Month.prototype> {
  let month = await Month.findOne({ yearMonth });

  if (month) {
    return month;
  }

  const previousMonths = await Month.find({ yearMonth: { $lt: yearMonth } })
    .sort({ yearMonth: -1 })
    .limit(1);

  let lastMonthBalance = 0;
  if (previousMonths.length > 0) {
    const prev = previousMonths[0];
    lastMonthBalance = await computeEndingBalance(prev._id.toString());
  }

  month = await Month.create({ yearMonth, lastMonthBalance });
  return month;
}
