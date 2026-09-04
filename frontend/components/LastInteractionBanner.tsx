"use client";

import { usePathname } from "next/navigation";
import { getLocaleTag, type Category, type LineItem } from "@/lib/api";
import { useTranslation } from "@/lib/i18n";
import { collectAllLineItems } from "@/lib/monthViewMath";
import { useMonthView } from "@/lib/MonthViewProvider";

function formatLastInteractionDate(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

function formatMonthName(yearMonth: string, locale: string): string {
  const [year, month] = yearMonth.split("-");
  const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
  return date.toLocaleDateString(locale, { month: "long" });
}

function maxEntryCreatedAt(categories: Category[], uncategorized: LineItem[]): string | null {
  let max: string | null = null;
  for (const item of collectAllLineItems(categories, uncategorized)) {
    for (const entry of item.entries ?? []) {
      if (max === null || entry.createdAt > max) {
        max = entry.createdAt;
      }
    }
  }
  return max;
}

export function LastInteractionBanner() {
  const pathname = usePathname();
  const { t, locale } = useTranslation();
  const { month, categories, uncategorized } = useMonthView();

  if (pathname !== "/" && pathname !== "/categories") {
    return null;
  }

  const localeTag = getLocaleTag(locale);
  const lastAt = maxEntryCreatedAt(categories, uncategorized);
  const message = lastAt
    ? t("common.lastInteraction", { date: formatLastInteractionDate(lastAt, localeTag) })
    : t("common.noLastInteraction", { month: formatMonthName(month.yearMonth, localeTag) });

  return (
    <wa-callout variant="neutral" appearance="plain">
      <wa-icon slot="icon" name="clock"></wa-icon>
      {message}
    </wa-callout>
  );
}
