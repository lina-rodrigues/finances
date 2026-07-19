import type { LineItem, LineItemEntry, LineItemMutationResponse } from "@/lib/api";
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
  return {
    id: response.id,
    type: response.type,
    label: response.label,
    plannedAmount: response.plannedAmount,
    realizedAmount: response.realizedAmount,
    displayAmount: effectiveAmount(response),
    isRealized: response.realizedAmount !== null,
    entries: response.entries ?? [],
    entryCount: response.entryCount ?? response.entries?.length ?? 0,
    seriesId: response.seriesId,
    seriesOccurrenceIndex: response.seriesOccurrenceIndex,
    isSeriesException: response.isSeriesException,
  };
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
  return {
    ...base,
    type: patch.type ?? base.type,
    label: patch.label,
    plannedAmount,
    realizedAmount,
    displayAmount: effectiveAmount({ plannedAmount, realizedAmount }),
    isRealized: realizedAmount !== null,
  };
}

export function buildOptimisticCreateLineItem(input: {
  id: string;
  type: LineItem["type"];
  label: string;
  plannedAmount: number;
  realizedAmount: number | null;
}): LineItem {
  return {
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
  };
}

function sumEntryAmounts(entries: Pick<LineItemEntry, "amount">[]): number {
  return entries.reduce((sum, entry) => sum + entry.amount, 0);
}

export function buildOptimisticAddEntry(
  base: LineItem,
  entry: LineItemEntry,
): LineItem {
  const entries = [...base.entries, entry];
  const realizedAmount = sumEntryAmounts(entries);
  return {
    ...base,
    entries,
    entryCount: entries.length,
    realizedAmount,
    displayAmount: effectiveAmount({ plannedAmount: base.plannedAmount, realizedAmount }),
    isRealized: true,
  };
}

export function buildOptimisticRemoveEntry(
  base: LineItem,
  entryId: string,
): LineItem {
  const entries = base.entries.filter((entry) => entry.id !== entryId);
  const realizedAmount = entries.length > 0 ? sumEntryAmounts(entries) : null;
  return {
    ...base,
    entries,
    entryCount: entries.length,
    realizedAmount,
    displayAmount: effectiveAmount({ plannedAmount: base.plannedAmount, realizedAmount }),
    isRealized: realizedAmount !== null,
  };
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
