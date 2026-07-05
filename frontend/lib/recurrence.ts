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
