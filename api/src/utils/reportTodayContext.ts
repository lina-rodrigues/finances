const DEFAULT_REPORT_TIMEZONE = "America/Sao_Paulo";

export interface ReportMonthProgress {
  dayOfMonth: number;
  daysInMonth: number;
  daysRemaining: number;
  percentElapsed: number;
}

export interface ReportTodayContext {
  /** Calendar date when the report is generated (YYYY-MM-DD). */
  date: string;
  /** Weekday name in English; translate naturally in the report per `language`. */
  weekday: string;
  /** IANA timezone used for `date`. */
  timezone: string;
  /** True when `yearMonth` is the same calendar month as `date`. */
  isReportMonthCurrent: boolean;
  /** Pacing through the month under review; only set when `isReportMonthCurrent`. */
  monthProgress?: ReportMonthProgress;
}

function resolveReportTimezone(): string {
  return process.env.REPORT_TIMEZONE?.trim() || DEFAULT_REPORT_TIMEZONE;
}

function formatDateInTimezone(date: Date, timeZone: string): string {
  return date.toLocaleDateString("en-CA", { timeZone });
}

function formatWeekdayInTimezone(date: Date, timeZone: string): string {
  return date.toLocaleDateString("en-US", { timeZone, weekday: "long" });
}

function parseYearMonth(yearMonth: string): { year: number; month: number } {
  const [yearPart, monthPart] = yearMonth.split("-");
  return {
    year: Number.parseInt(yearPart, 10),
    month: Number.parseInt(monthPart, 10),
  };
}

function daysInCalendarMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function buildReportTodayContext(
  yearMonth: string,
  now: Date = new Date(),
): ReportTodayContext {
  const timezone = resolveReportTimezone();
  const date = formatDateInTimezone(now, timezone);
  const weekday = formatWeekdayInTimezone(now, timezone);

  const { year: reportYear, month: reportMonth } = parseYearMonth(yearMonth);
  const todayYear = Number.parseInt(date.slice(0, 4), 10);
  const todayMonth = Number.parseInt(date.slice(5, 7), 10);
  const isReportMonthCurrent = reportYear === todayYear && reportMonth === todayMonth;

  const context: ReportTodayContext = {
    date,
    weekday,
    timezone,
    isReportMonthCurrent,
  };

  if (isReportMonthCurrent) {
    const dayOfMonth = Number.parseInt(date.slice(8, 10), 10);
    const daysInMonth = daysInCalendarMonth(todayYear, todayMonth);
    const daysRemaining = Math.max(0, daysInMonth - dayOfMonth);

    context.monthProgress = {
      dayOfMonth,
      daysInMonth,
      daysRemaining,
      percentElapsed: Math.round((dayOfMonth / daysInMonth) * 100),
    };
  }

  return context;
}
