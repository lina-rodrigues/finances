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
  const { categories, uncategorized } = useMonthView();

  if (pathname !== "/" && pathname !== "/categories") {
    return null;
  }

  const lastAt = maxEntryCreatedAt(categories, uncategorized);
  if (!lastAt) {
    return null;
  }

  const formatted = formatLastInteractionDate(lastAt, getLocaleTag(locale));

  return (
    <wa-callout variant="neutral" appearance="plain">
      <wa-icon slot="icon" name="clock"></wa-icon>
      {t("common.lastInteraction", { date: formatted })}
    </wa-callout>
  );
}
