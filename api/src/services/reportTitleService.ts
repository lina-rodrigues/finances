import type { AppLanguage } from "../models/User.js";

export function buildPlaceholderReportTitle(yearMonth: string, language: AppLanguage): string {
  const [yearPart, monthPart] = yearMonth.split("-");
  const year = Number(yearPart);
  const month = Number(monthPart);
  const date = new Date(year, month - 1, 1);
  const locale = language === "pt" ? "pt-BR" : "en-US";
  const monthLabel = date.toLocaleDateString(locale, { month: "long", year: "numeric" });
  return language === "pt" ? `Relatório — ${monthLabel}` : `Report — ${monthLabel}`;
}

export function parseGeneratedReport(raw: string): { title: string; content: string } {
  const trimmed = raw.trim();
  const titled = trimmed.match(/^#\s+([^\n\r]+)\r?\n+([\s\S]*)$/);
  if (titled) {
    const title = titled[1].trim();
    const content = titled[2].trimStart();
    if (title && content) {
      return { title, content };
    }
  }

  const firstLine = trimmed.split(/\r?\n/, 1)[0]?.trim() ?? "";
  const fallbackTitle =
    firstLine.length > 0 && firstLine.length <= 120
      ? firstLine.replace(/^#+\s*/, "")
      : "Financial report";

  return { title: fallbackTitle, content: trimmed };
}
