import type { LineItem, LineItemMutationResponse } from "@/lib/api";
import { effectiveAmount } from "@/lib/monthViewMath";

const TEMP_ID_PREFIX = "temp-";

export function createTempLineItemId(): string {
  return `${TEMP_ID_PREFIX}${crypto.randomUUID()}`;
}

export function isTempLineItemId(id: string): boolean {
  return id.startsWith(TEMP_ID_PREFIX);
}

type LineItemSeriesMeta = Pick<
  LineItem,
  "seriesEndType" | "seriesOccurrenceCount" | "seriesEndYearMonth"
>;

export function toLineItemFromMutation(
  response: LineItemMutationResponse,
  seriesMeta?: Partial<LineItemSeriesMeta>,
): LineItem {
  return {
    id: response.id,
    type: response.type,
    label: response.label,
    plannedAmount: response.plannedAmount,
    realizedAmount: response.realizedAmount,
    displayAmount: effectiveAmount(response),
    isRealized: response.realizedAmount !== null,
    seriesId: response.seriesId,
    seriesOccurrenceIndex: response.seriesOccurrenceIndex,
    seriesEndType: seriesMeta?.seriesEndType ?? null,
    seriesOccurrenceCount: seriesMeta?.seriesOccurrenceCount ?? null,
    seriesEndYearMonth: seriesMeta?.seriesEndYearMonth ?? null,
    isSeriesException: response.isSeriesException,
  };
}
