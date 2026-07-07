import { Month, type IMonth } from "../models/Month.js";
import { LineItem, effectiveAmount } from "../models/LineItem.js";
import { isDuplicateKeyError } from "../db/migrations.js";
import { nextYearMonth } from "../utils/yearMonth.js";
import type { Types } from "mongoose";

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

export function computeRealizedBalance(
  lastMonthBalance: number,
  lineItems: { type: string; realizedAmount: number | null }[],
): number {
  let balance = lastMonthBalance;
  for (const item of lineItems) {
    if (item.realizedAmount === null) {
      continue;
    }
    balance += item.type === "income" ? item.realizedAmount : -item.realizedAmount;
  }
  return balance;
}

export async function computeEndingBalance(month: IMonth): Promise<number> {
  const lineItems = await LineItem.find({ monthId: month._id });
  return computeBalance(month.lastMonthBalance, lineItems);
}

export async function cascadeBalanceFrom(userId: Types.ObjectId | string, yearMonth: string): Promise<void> {
  const month = await Month.findOne({ userId, yearMonth });
  if (!month) {
    return;
  }

  let endingBalance = await computeEndingBalance(month);
  let currentYearMonth = yearMonth;

  while (true) {
    const next = nextYearMonth(currentYearMonth);
    const nextMonth = await Month.findOne({ userId, yearMonth: next });

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

export async function ensureMonth(userId: Types.ObjectId | string, yearMonth: string): Promise<IMonth> {
  const existing = await Month.findOne({ userId, yearMonth });
  if (existing) {
    return existing;
  }

  const prev = await Month.findOne({ userId, yearMonth: { $lt: yearMonth } }).sort({ yearMonth: -1 });
  const lastMonthBalance = prev ? await computeEndingBalance(prev) : 0;

  try {
    return await Month.create({ userId, yearMonth, lastMonthBalance });
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      const raced = await Month.findOne({ userId, yearMonth });
      if (raced) {
        return raced;
      }
    }
    throw err;
  }
}
