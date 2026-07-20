import { LineItem } from "../models/LineItem.js";
import { Month } from "../models/Month.js";
import { RecurringSeries } from "../models/RecurringSeries.js";
import {
  computeBalance,
  computeRealizedBalance,
  ensureMonth,
} from "./balanceService.js";
import { getCategoriesWithLineItems } from "./categoryService.js";
import { cascadeFromEarliest, extendSeriesForMonthView } from "./recurrenceService.js";
import { previousYearMonth } from "../utils/yearMonth.js";

export async function buildMonthView(userId: string, yearMonth: string) {
  const extendFrom = await extendSeriesForMonthView(userId, yearMonth);
  if (extendFrom) {
    await cascadeFromEarliest(userId, extendFrom);
  }

  const month = await ensureMonth(userId, yearMonth);
  const lineItems = await LineItem.find({ monthId: month._id }).sort({ createdAt: 1 });

  const seriesIds = [
    ...new Set(
      lineItems
        .filter((item) => item.seriesId)
        .map((item) => item.seriesId!.toString()),
    ),
  ];

  const seriesList =
    seriesIds.length > 0
      ? await RecurringSeries.find({ _id: { $in: seriesIds }, userId })
      : [];

  const seriesById = new Map(seriesList.map((series) => [series._id.toString(), series]));

  const { categories, uncategorized } = await getCategoriesWithLineItems(
    userId,
    lineItems,
    seriesById,
  );

  const expectedBalance = computeBalance(month.lastMonthBalance, lineItems);
  const currentRealizedBalance = computeRealizedBalance(month.lastMonthBalance, lineItems);

  let lastMonthRealizedBalance = 0;
  const prevYearMonth = previousYearMonth(yearMonth);
  const prevMonth = await Month.findOne({ userId, yearMonth: prevYearMonth });
  if (prevMonth) {
    const prevLineItems = await LineItem.find({ monthId: prevMonth._id });
    lastMonthRealizedBalance = computeRealizedBalance(prevMonth.lastMonthBalance, prevLineItems);
  }

  return {
    month: {
      id: month._id.toString(),
      yearMonth: month.yearMonth,
      lastMonthBalance: month.lastMonthBalance,
      endingBalance: expectedBalance,
      lastMonthRealizedBalance,
      expectedBalance,
      currentRealizedBalance,
    },
    categories,
    uncategorized,
  };
}
