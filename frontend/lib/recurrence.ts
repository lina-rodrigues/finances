export type RecurrenceEndType = "never" | "count" | "until";

export type RepeatMode = "none" | RecurrenceEndType;

export type RecurrenceScope = "this" | "future" | "all";

export interface RecurrenceInput {
  startYearMonth: string;
  endType: RecurrenceEndType;
  occurrenceCount?: number;
  endYearMonth?: string;
}

export function buildRecurrencePayload(
  mode: RepeatMode,
  startYearMonth: string,
  occurrenceCount: string,
  endYearMonth: string,
): RecurrenceInput | undefined {
  if (mode === "none") {
    return undefined;
  }

  if (mode === "never") {
    return { startYearMonth, endType: "never" };
  }

  if (mode === "count") {
    const count = parseInt(occurrenceCount, 10);
    if (!Number.isFinite(count) || count < 1) {
      return undefined;
    }
    return { startYearMonth, endType: "count", occurrenceCount: count };
  }

  if (!endYearMonth || endYearMonth < startYearMonth) {
    return undefined;
  }

  return { startYearMonth, endType: "until", endYearMonth };
}

export function formatYearMonthLabel(yearMonth: string, locale: string): string {
  const [year, month] = yearMonth.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString(locale, { month: "long", year: "numeric" });
}

export type SeriesBadgeLabel =
  | { key: "repeat.installmentOf"; vars: { current: string; total: string } }
  | { key: "repeat.occurrenceUntil"; vars: { current: string; month: string } }
  | { key: "repeat.occurrenceOngoing"; vars: { current: string } }
  | { key: "repeat.badge"; vars?: undefined };

/** Label for this month’s place in a recurring series (detail dialog badge). */
export function getSeriesBadgeLabel(
  item: {
    seriesId: string | null;
    seriesOccurrenceIndex: number | null;
    seriesEndType: RecurrenceEndType | null;
    seriesOccurrenceCount: number | null;
    seriesEndYearMonth: string | null;
  },
  locale: string,
): SeriesBadgeLabel | null {
  if (!item.seriesId) {
    return null;
  }

  const current = item.seriesOccurrenceIndex;

  if (
    item.seriesEndType === "count" &&
    current != null &&
    item.seriesOccurrenceCount != null
  ) {
    return {
      key: "repeat.installmentOf",
      vars: {
        current: String(current),
        total: String(item.seriesOccurrenceCount),
      },
    };
  }

  if (item.seriesEndType === "until" && item.seriesEndYearMonth) {
    const month = formatYearMonthLabel(item.seriesEndYearMonth, locale);
    if (current != null) {
      return {
        key: "repeat.occurrenceUntil",
        vars: { current: String(current), month },
      };
    }
    return { key: "repeat.badge" };
  }

  if (current != null) {
    return {
      key: "repeat.occurrenceOngoing",
      vars: { current: String(current) },
    };
  }

  return { key: "repeat.badge" };
}
