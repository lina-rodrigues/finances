"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  getCurrentYearMonth,
  getLocaleTag,
  monthPagePath,
  nextYearMonth,
  prevYearMonth,
} from "@/lib/api";
import { useAuth } from "@/lib/AuthProvider";
import { useTranslation } from "@/lib/i18n";

import {
  Button,
  Icon,
} from "@lina-rodrigues/cotton-candy";
function monthParts(yearMonth: string, localeTag: string) {
  const [year, month] = yearMonth.split("-");
  const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
  return {
    month: date.toLocaleDateString(localeTag, { month: "long" }).toUpperCase(),
    year,
  };
}

function resolveTab(pathname: string): "categories" | "reports" {
  return pathname.startsWith("/reports") ? "reports" : "categories";
}

function resolveYearMonth(searchParams: ReturnType<typeof useSearchParams>): string {
  const month = searchParams.get("month");
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    return month;
  }
  return getCurrentYearMonth();
}

export function MonthNavHeader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const { preferences } = useAuth();
  const localeTag = getLocaleTag(preferences.language);
  const tab = resolveTab(pathname);
  const yearMonth = resolveYearMonth(searchParams);
  const { month: monthName, year } = monthParts(yearMonth, localeTag);
  const previousMonth = prevYearMonth(yearMonth);
  const followingMonth = nextYearMonth(yearMonth);

  return (
    <div className="flex items-center justify-center gap-4">
      <Button variant="default" size="sm" className="pressable focus-ring" asChild>
        <Link href={monthPagePath(previousMonth, tab)} aria-label={t("month.previousMonth")}>
          <Icon name="chevronLeft" size="md" colorClass="text-primary-foreground" />
        </Link>
      </Button>

      <div className="text-center">
        <h1 className="text-display text-fin-balance text-xl">{monthName}</h1>
        {year && (
          <div className="text-muted-finance text-body mt-0.5 text-xs font-semibold tracking-widest">
            {year}
          </div>
        )}
      </div>

      <Button variant="default" size="sm" className="pressable focus-ring" asChild>
        <Link href={monthPagePath(followingMonth, tab)} aria-label={t("month.nextMonth")}>
          <Icon name="chevronRight" size="md" colorClass="text-primary-foreground" />
        </Link>
      </Button>
    </div>
  );
}
