import type { Types } from "mongoose";
import { LineItem, applyRealizedAmountWrite, isRealized, pushRealizedEntry, type ILineItem } from "../models/LineItem.js";
import { Month } from "../models/Month.js";
import {
  RecurringSeries,
  type IRecurringSeries,
  type RecurrenceEndType,
} from "../models/RecurringSeries.js";
import type { RecurrenceInput, RecurrenceScope } from "../schemas/recurrence.js";
import { cascadeBalanceFrom, ensureMonth } from "./balanceService.js";
import {
  addYearMonths,
  compareYearMonth,
  maxYearMonth,
  minYearMonth,
  nextYearMonth,
  previousYearMonth,
  yearMonthRange,
} from "../utils/yearMonth.js";

export const EAGER_WINDOW_MONTHS = 12;

export interface SeriesTemplatePatch {
  categoryId?: string | null;
  type?: "income" | "expense";
  label?: string;
  plannedAmount?: number;
}

export interface LineItemPatch {
  categoryId?: string | null;
  type?: "income" | "expense";
  label?: string;
  plannedAmount?: number;
  realizedAmount?: number | null;
}

export function computeSeriesAbsoluteLastMonth(series: {
  startYearMonth: string;
  endType: RecurrenceEndType;
  occurrenceCount: number | null;
  endYearMonth: string | null;
  cancelledAt: Date | null;
}): string | null {
  if (series.cancelledAt) {
    return null;
  }

  if (series.endType === "count" && series.occurrenceCount !== null) {
    return addYearMonths(series.startYearMonth, series.occurrenceCount - 1);
  }

  if (series.endType === "until" && series.endYearMonth) {
    return series.endYearMonth;
  }

  return null;
}

export function computeEagerThroughYearMonth(startYearMonth: string): string {
  return addYearMonths(startYearMonth, EAGER_WINDOW_MONTHS - 1);
}

export function computeTargetGenerationThrough(
  series: IRecurringSeries,
  requestedThrough: string,
): string {
  const absoluteLast = computeSeriesAbsoluteLastMonth(series);
  const cappedRequest = absoluteLast
    ? minYearMonth(requestedThrough, absoluteLast)
    : requestedThrough;
  return maxYearMonth(series.startYearMonth, cappedRequest);
}

export function computeOccurrenceIndex(startYearMonth: string, yearMonth: string): number {
  let index = 1;
  let current = startYearMonth;
  while (compareYearMonth(current, yearMonth) < 0) {
    index += 1;
    current = nextYearMonth(current);
  }
  return index;
}

async function getYearMonthForLineItem(
  userId: Types.ObjectId | string,
  lineItem: ILineItem,
): Promise<string | null> {
  const month = await Month.findOne({ _id: lineItem.monthId, userId });
  return month?.yearMonth ?? null;
}

async function applyTemplateToInstance(
  series: IRecurringSeries,
  item: ILineItem,
  patch?: SeriesTemplatePatch,
): Promise<void> {
  if (item.seriesException) {
    return;
  }

  const template = {
    categoryId: patch?.categoryId !== undefined ? patch.categoryId : series.categoryId,
    type: patch?.type ?? series.type,
    label: patch?.label ?? series.label,
    plannedAmount: patch?.plannedAmount ?? series.plannedAmount,
  };

  item.categoryId = template.categoryId as typeof item.categoryId;
  item.type = template.type;
  item.label = template.label;

  if (!isRealized(item)) {
    item.plannedAmount = template.plannedAmount;
  }

  await item.save();
}

export async function ensureSeriesInstances(
  userId: Types.ObjectId | string,
  series: IRecurringSeries,
  requestedThroughYearMonth: string,
): Promise<string | null> {
  if (series.cancelledAt) {
    return null;
  }

  const targetThrough = computeTargetGenerationThrough(series, requestedThroughYearMonth);
  if (compareYearMonth(targetThrough, series.generatedThroughYearMonth) <= 0) {
    return null;
  }

  const fromMonth =
    compareYearMonth(series.generatedThroughYearMonth, series.startYearMonth) < 0
      ? series.startYearMonth
      : nextYearMonth(series.generatedThroughYearMonth);

  const months = yearMonthRange(fromMonth, targetThrough);
  let earliestAffected: string | null = null;

  for (const yearMonth of months) {
    const absoluteLast = computeSeriesAbsoluteLastMonth(series);
    if (absoluteLast && compareYearMonth(yearMonth, absoluteLast) > 0) {
      continue;
    }

    const month = await ensureMonth(userId, yearMonth);
    const occurrenceIndex = computeOccurrenceIndex(series.startYearMonth, yearMonth);

    let item = await LineItem.findOne({
      seriesId: series._id,
      seriesOccurrenceIndex: occurrenceIndex,
    });

    if (!item) {
      await LineItem.create({
        monthId: month._id,
        categoryId: series.categoryId,
        type: series.type,
        label: series.label,
        plannedAmount: series.plannedAmount,
        entries: [],
        seriesId: series._id,
        seriesOccurrenceIndex: occurrenceIndex,
        seriesException: false,
      });
      earliestAffected = earliestAffected
        ? minYearMonth(earliestAffected, yearMonth)
        : yearMonth;
    } else if (!item.seriesException && !isRealized(item)) {
      await applyTemplateToInstance(series, item);
    }
  }

  series.generatedThroughYearMonth = targetThrough;
  await series.save();

  return earliestAffected;
}

export async function createRecurringSeries(
  userId: Types.ObjectId | string,
  data: {
    categoryId: string | null;
    type: "income" | "expense";
    label: string;
    plannedAmount: number;
    realizedAmount: number | null;
    recurrence: RecurrenceInput;
  },
): Promise<{ series: IRecurringSeries; firstItem: ILineItem; cascadeFrom: string }> {
  const { recurrence } = data;
  const eagerThrough = computeEagerThroughYearMonth(recurrence.startYearMonth);
  const initialGeneratedThrough = computeTargetGenerationThrough(
    {
      startYearMonth: recurrence.startYearMonth,
      endType: recurrence.endType,
      occurrenceCount: recurrence.occurrenceCount ?? null,
      endYearMonth: recurrence.endYearMonth ?? null,
      cancelledAt: null,
    } as IRecurringSeries,
    eagerThrough,
  );

  const series = await RecurringSeries.create({
    userId,
    categoryId: data.categoryId,
    type: data.type,
    label: data.label,
    plannedAmount: data.plannedAmount,
    startYearMonth: recurrence.startYearMonth,
    endType: recurrence.endType,
    occurrenceCount: recurrence.endType === "count" ? recurrence.occurrenceCount ?? null : null,
    endYearMonth: recurrence.endType === "until" ? recurrence.endYearMonth ?? null : null,
    cancelledAt: null,
    generatedThroughYearMonth: previousYearMonth(recurrence.startYearMonth),
  });

  await ensureSeriesInstances(userId, series, initialGeneratedThrough);

  const firstItem = await LineItem.findOne({
    seriesId: series._id,
    seriesOccurrenceIndex: 1,
  });

  if (!firstItem) {
    throw new Error("SERIES_GENERATION_FAILED");
  }

  if (data.realizedAmount !== null) {
    pushRealizedEntry(firstItem, data.realizedAmount);
    await firstItem.save();
  }

  return { series, firstItem, cascadeFrom: recurrence.startYearMonth };
}

export async function convertLineItemToSeries(
  userId: Types.ObjectId | string,
  lineItem: ILineItem,
  recurrence: RecurrenceInput,
): Promise<{ series: IRecurringSeries; cascadeFrom: string }> {
  if (lineItem.seriesId) {
    throw new Error("ALREADY_RECURRING");
  }

  const itemYearMonth = await getYearMonthForLineItem(userId, lineItem);
  if (!itemYearMonth) {
    throw new Error("NOT_FOUND");
  }

  if (itemYearMonth !== recurrence.startYearMonth) {
    throw new Error("START_MONTH_MISMATCH");
  }

  const eagerThrough = computeEagerThroughYearMonth(recurrence.startYearMonth);
  const initialGeneratedThrough = computeTargetGenerationThrough(
    {
      startYearMonth: recurrence.startYearMonth,
      endType: recurrence.endType,
      occurrenceCount: recurrence.occurrenceCount ?? null,
      endYearMonth: recurrence.endYearMonth ?? null,
      cancelledAt: null,
    } as IRecurringSeries,
    eagerThrough,
  );

  const series = await RecurringSeries.create({
    userId,
    categoryId: lineItem.categoryId,
    type: lineItem.type,
    label: lineItem.label,
    plannedAmount: lineItem.plannedAmount,
    startYearMonth: recurrence.startYearMonth,
    endType: recurrence.endType,
    occurrenceCount: recurrence.endType === "count" ? recurrence.occurrenceCount ?? null : null,
    endYearMonth: recurrence.endType === "until" ? recurrence.endYearMonth ?? null : null,
    cancelledAt: null,
    generatedThroughYearMonth: previousYearMonth(recurrence.startYearMonth),
  });

  lineItem.seriesId = series._id;
  lineItem.seriesOccurrenceIndex = 1;
  lineItem.seriesException = false;
  await lineItem.save();

  series.generatedThroughYearMonth = recurrence.startYearMonth;
  await series.save();

  await ensureSeriesInstances(userId, series, initialGeneratedThrough);

  return { series, cascadeFrom: recurrence.startYearMonth };
}

export async function extendSeriesForMonthView(
  userId: Types.ObjectId | string,
  viewedYearMonth: string,
): Promise<string | null> {
  const requestedThrough = computeEagerThroughYearMonth(viewedYearMonth);
  const seriesList = await RecurringSeries.find({
    userId,
    cancelledAt: null,
    startYearMonth: { $lte: requestedThrough },
  });

  let earliestCascade: string | null = null;

  for (const series of seriesList) {
    const absoluteLast = computeSeriesAbsoluteLastMonth(series);
    if (absoluteLast && compareYearMonth(absoluteLast, viewedYearMonth) < 0) {
      continue;
    }

    const affected = await ensureSeriesInstances(userId, series, requestedThrough);
    if (affected) {
      earliestCascade = earliestCascade
        ? minYearMonth(earliestCascade, affected)
        : affected;
    }
  }

  return earliestCascade;
}

export async function applyRecurringLineItemEdit(
  userId: Types.ObjectId | string,
  lineItem: ILineItem,
  series: IRecurringSeries,
  scope: RecurrenceScope,
  patch: LineItemPatch,
): Promise<string | null> {
  const itemYearMonth = await getYearMonthForLineItem(userId, lineItem);
  if (!itemYearMonth) {
    return null;
  }

  let cascadeFrom: string | null = itemYearMonth;

  if (scope === "this") {
    if (patch.categoryId !== undefined) {
      lineItem.categoryId = patch.categoryId as typeof lineItem.categoryId;
    }
    if (patch.type !== undefined) {
      lineItem.type = patch.type;
    }
    if (patch.label !== undefined) {
      lineItem.label = patch.label;
    }
    if (patch.plannedAmount !== undefined) {
      lineItem.plannedAmount = patch.plannedAmount;
    }
    if (patch.realizedAmount !== undefined) {
      if (patch.realizedAmount !== null) {
        applyRealizedAmountWrite(lineItem, patch.realizedAmount);
      }
    }
    lineItem.seriesException = true;
    await lineItem.save();
    return cascadeFrom;
  }

  const templatePatch: SeriesTemplatePatch = {
    categoryId: patch.categoryId,
    type: patch.type,
    label: patch.label,
    plannedAmount: patch.plannedAmount,
  };

  if (patch.categoryId !== undefined) {
    series.categoryId = patch.categoryId as typeof series.categoryId;
  }
  if (patch.type !== undefined) {
    series.type = patch.type;
  }
  if (patch.label !== undefined) {
    series.label = patch.label;
  }
  if (patch.plannedAmount !== undefined) {
    series.plannedAmount = patch.plannedAmount;
  }
  await series.save();

  const instances = await LineItem.find({ seriesId: series._id }).sort({ seriesOccurrenceIndex: 1 });

  for (const instance of instances) {
    const instanceYearMonth = await getYearMonthForLineItem(userId, instance);
    if (!instanceYearMonth) {
      continue;
    }

    if (scope === "future" && compareYearMonth(instanceYearMonth, itemYearMonth) < 0) {
      continue;
    }

    if (instance.seriesException) {
      continue;
    }

    if (patch.realizedAmount !== undefined && instance._id.equals(lineItem._id)) {
      if (patch.categoryId !== undefined) {
        instance.categoryId = patch.categoryId as typeof instance.categoryId;
      }
      if (patch.type !== undefined) {
        instance.type = patch.type;
      }
      if (patch.label !== undefined) {
        instance.label = patch.label;
      }
      if (patch.plannedAmount !== undefined && !isRealized(instance)) {
        instance.plannedAmount = patch.plannedAmount;
      }
      if (patch.realizedAmount !== null) {
        applyRealizedAmountWrite(instance, patch.realizedAmount);
      }
      await instance.save();
      cascadeFrom = cascadeFrom ? minYearMonth(cascadeFrom, instanceYearMonth!) : instanceYearMonth;
      continue;
    }

    if (patch.categoryId !== undefined) {
      instance.categoryId = patch.categoryId as typeof instance.categoryId;
    }
    if (patch.type !== undefined) {
      instance.type = patch.type;
    }
    if (patch.label !== undefined) {
      instance.label = patch.label;
    }
    if (patch.plannedAmount !== undefined && !isRealized(instance)) {
      instance.plannedAmount = patch.plannedAmount;
    }

    await instance.save();

    cascadeFrom = cascadeFrom ? minYearMonth(cascadeFrom, instanceYearMonth) : instanceYearMonth;
  }

  return cascadeFrom;
}

export async function applyRecurringLineItemDelete(
  userId: Types.ObjectId | string,
  lineItem: ILineItem,
  series: IRecurringSeries,
  scope: RecurrenceScope,
): Promise<string | null> {
  const itemYearMonth = await getYearMonthForLineItem(userId, lineItem);
  if (!itemYearMonth) {
    return null;
  }

  if (scope === "this") {
    await LineItem.findByIdAndDelete(lineItem._id);
    return itemYearMonth;
  }

  const instances = await LineItem.find({ seriesId: series._id });
  let cascadeFrom: string | null = itemYearMonth;

  if (scope === "future") {
    for (const instance of instances) {
      const instanceYearMonth = await getYearMonthForLineItem(userId, instance);
      if (!instanceYearMonth) {
        continue;
      }
      if (compareYearMonth(instanceYearMonth, itemYearMonth) >= 0) {
        await LineItem.findByIdAndDelete(instance._id);
        cascadeFrom = cascadeFrom
          ? minYearMonth(cascadeFrom, instanceYearMonth)
          : instanceYearMonth;
      }
    }

    series.cancelledAt = new Date();
    const prev = previousYearMonth(itemYearMonth);
    if (compareYearMonth(prev, series.startYearMonth) >= 0) {
      series.generatedThroughYearMonth = prev;
    } else {
      series.generatedThroughYearMonth = previousYearMonth(series.startYearMonth);
    }
    await series.save();
    return cascadeFrom;
  }

  for (const instance of instances) {
    const instanceYearMonth = await getYearMonthForLineItem(userId, instance);
    await LineItem.findByIdAndDelete(instance._id);
    if (instanceYearMonth) {
      cascadeFrom = cascadeFrom
        ? minYearMonth(cascadeFrom, instanceYearMonth)
        : instanceYearMonth;
    }
  }

  await RecurringSeries.findByIdAndDelete(series._id);
  return cascadeFrom;
}

export async function cancelRecurringSeries(
  userId: Types.ObjectId | string,
  series: IRecurringSeries,
  fromYearMonth: string,
): Promise<string | null> {
  const instances = await LineItem.find({ seriesId: series._id });
  let cascadeFrom: string | null = null;

  for (const instance of instances) {
    const instanceYearMonth = await getYearMonthForLineItem(userId, instance);
    if (!instanceYearMonth) {
      continue;
    }

    if (
      compareYearMonth(instanceYearMonth, fromYearMonth) > 0 &&
      !isRealized(instance)
    ) {
      await LineItem.findByIdAndDelete(instance._id);
      cascadeFrom = cascadeFrom
        ? minYearMonth(cascadeFrom, instanceYearMonth)
        : instanceYearMonth;
    }
  }

  series.cancelledAt = new Date();
  series.generatedThroughYearMonth = minYearMonth(
    series.generatedThroughYearMonth,
    fromYearMonth,
  );
  await series.save();

  return cascadeFrom ?? fromYearMonth;
}

export async function cascadeFromEarliest(
  userId: Types.ObjectId | string,
  yearMonth: string | null,
): Promise<void> {
  if (yearMonth) {
    await cascadeBalanceFrom(userId, yearMonth);
  }
}

export async function assertSeriesOwnedByUser(
  seriesId: string,
  userId: string,
): Promise<IRecurringSeries | null> {
  return RecurringSeries.findOne({ _id: seriesId, userId });
}
