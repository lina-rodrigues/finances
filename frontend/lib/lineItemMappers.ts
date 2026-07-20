import type { LineItem, LineItemEntry, LineItemMutationResponse } from "@/lib/api";
import {
  isLineItemRealized,
  normalizeLineItem,
  sumEntryAmounts,
} from "@/lib/lineItemAmounts";
import { effectiveAmount } from "@/lib/monthViewMath";

const TEMP_ID_PREFIX = "temp-";

export function createTempLineItemId(): string {
  return `${TEMP_ID_PREFIX}${crypto.randomUUID()}`;
}

export function createTempEntryId(): string {
  return `${TEMP_ID_PREFIX}entry-${crypto.randomUUID()}`;
}

export function isTempLineItemId(id: string): boolean {
  return id.startsWith(TEMP_ID_PREFIX);
}

type LineItemSeriesMeta = Pick<
  LineItem,
  "seriesEndType" | "seriesOccurrenceCount" | "seriesEndYearMonth"
>;

function toLineItemFields(response: LineItemMutationResponse) {
  const entries = response.entries ?? [];
  const entryCount = response.entryCount ?? entries.length;
  const base = {
    id: response.id,
    type: response.type,
    label: response.label,
    plannedAmount: response.plannedAmount,
    entries,
    entryCount,
    seriesId: response.seriesId,
    seriesOccurrenceIndex: response.seriesOccurrenceIndex,
    isSeriesException: response.isSeriesException,
    realizedAmount: response.realizedAmount,
  };
  return normalizeLineItem({
    ...base,
    displayAmount: effectiveAmount(base),
    isRealized: isLineItemRealized(base),
    seriesEndType: null,
    seriesOccurrenceCount: null,
    seriesEndYearMonth: null,
  } as LineItem);
}

export function toLineItemFromMutation(
  response: LineItemMutationResponse,
  seriesMeta?: Partial<LineItemSeriesMeta>,
): LineItem {
  return {
    ...toLineItemFields(response),
    seriesEndType: seriesMeta?.seriesEndType ?? null,
    seriesOccurrenceCount: seriesMeta?.seriesOccurrenceCount ?? null,
    seriesEndYearMonth: seriesMeta?.seriesEndYearMonth ?? null,
  };
}

export function buildOptimisticLineItem(
  base: LineItem,
  patch: {
    label: string;
    plannedAmount: number;
    realizedAmount: number | null;
    type?: LineItem["type"];
  },
): LineItem {
  const plannedAmount = patch.plannedAmount;
  const realizedAmount = patch.realizedAmount;
  return normalizeLineItem({
    ...base,
    type: patch.type ?? base.type,
    label: patch.label,
    plannedAmount,
    realizedAmount,
    displayAmount: effectiveAmount({ plannedAmount, realizedAmount, entries: base.entries }),
    isRealized: base.isRealized,
  });
}

export function buildOptimisticCreateLineItem(input: {
  id: string;
  type: LineItem["type"];
  label: string;
  plannedAmount: number;
  realizedAmount: number | null;
}): LineItem {
  return normalizeLineItem({
    id: input.id,
    type: input.type,
    label: input.label,
    plannedAmount: input.plannedAmount,
    realizedAmount: input.realizedAmount,
    displayAmount: effectiveAmount(input),
    isRealized: input.realizedAmount !== null,
    entries: [],
    entryCount: 0,
    seriesId: null,
    seriesOccurrenceIndex: null,
    seriesEndType: null,
    seriesOccurrenceCount: null,
    seriesEndYearMonth: null,
    isSeriesException: false,
  });
}

function sumEntryAmountsLocal(entries: Pick<LineItemEntry, "amount">[]): number {
  return sumEntryAmounts(entries);
}

export function buildOptimisticAddEntry(
  base: LineItem,
  entry: LineItemEntry,
): LineItem {
  const entries = [...base.entries, entry];
  const realizedAmount = sumEntryAmountsLocal(entries);
  return normalizeLineItem({
    ...base,
    entries,
    entryCount: entries.length,
    realizedAmount,
    displayAmount: effectiveAmount({ plannedAmount: base.plannedAmount, realizedAmount, entries }),
  });
}

export function buildOptimisticRemoveEntry(
  base: LineItem,
  entryId: string,
): LineItem {
  const entries = base.entries.filter((entry) => entry.id !== entryId);
  const realizedAmount = entries.length > 0 ? sumEntryAmountsLocal(entries) : null;
  return normalizeLineItem({
    ...base,
    entries,
    entryCount: entries.length,
    realizedAmount,
    displayAmount: effectiveAmount({ plannedAmount: base.plannedAmount, realizedAmount, entries }),
  });
}

export function extractLineItemSeriesMeta(item: LineItem): Partial<LineItemSeriesMeta> {
  return {
    seriesEndType: item.seriesEndType,
    seriesOccurrenceCount: item.seriesOccurrenceCount,
    seriesEndYearMonth: item.seriesEndYearMonth,
  };
}

/** `undefined` means a new category must be created (not optimistically safe). */
export function resolveCategoryIdSync(
  trimmed: string,
  categories: { id: string; name: string }[],
  uncategorizedLabel: string,
): string | null | undefined {
  if (trimmed.toLowerCase() === uncategorizedLabel.toLowerCase()) {
    return null;
  }

  const existing = categories.find((cat) => cat.name.toLowerCase() === trimmed.toLowerCase());
  return existing?.id ?? undefined;
}
