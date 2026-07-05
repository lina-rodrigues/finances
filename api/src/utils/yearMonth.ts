export function getCurrentYearMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function nextYearMonth(yearMonth: string): string {
  const [yearStr, monthStr] = yearMonth.split("-");
  let year = parseInt(yearStr, 10);
  let month = parseInt(monthStr, 10) + 1;
  if (month > 12) {
    month = 1;
    year += 1;
  }
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function previousYearMonth(yearMonth: string): string {
  const [yearStr, monthStr] = yearMonth.split("-");
  let year = parseInt(yearStr, 10);
  let month = parseInt(monthStr, 10) - 1;
  if (month < 1) {
    month = 12;
    year -= 1;
  }
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function isValidYearMonth(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

export function compareYearMonth(a: string, b: string): number {
  return a.localeCompare(b);
}

export function addYearMonths(yearMonth: string, count: number): string {
  let current = yearMonth;
  for (let i = 0; i < count; i += 1) {
    current = nextYearMonth(current);
  }
  return current;
}

export function minYearMonth(a: string, b: string): string {
  return compareYearMonth(a, b) <= 0 ? a : b;
}

export function maxYearMonth(a: string, b: string): string {
  return compareYearMonth(a, b) >= 0 ? a : b;
}

export function yearMonthRange(start: string, end: string): string[] {
  if (compareYearMonth(start, end) > 0) {
    return [];
  }
  const months: string[] = [];
  let current = start;
  while (compareYearMonth(current, end) <= 0) {
    months.push(current);
    if (current === end) {
      break;
    }
    current = nextYearMonth(current);
  }
  return months;
}
