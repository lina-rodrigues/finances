"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  getCurrentYearMonth,
  getLocaleTag,
  monthPagePath,
  nextYearMonth,
  prevYearMonth,
  type AppTab,
} from "@/lib/api";
import { useAuth } from "@/lib/AuthProvider";
import { useTranslation } from "@/lib/i18n";

function monthParts(yearMonth: string, localeTag: string) {
  const [year, month] = yearMonth.split("-");
  const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
  return {
    month: date.toLocaleDateString(localeTag, { month: "long" }),
    year,
  };
}

function resolveTab(pathname: string): AppTab {
  if (pathname.startsWith("/reports")) return "reports";
  if (pathname.startsWith("/categories")) return "categories";
  return "finance";
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
    <div className="wa-cluster wa-gap-m wa-align-items-center">
      <Link href={monthPagePath(previousMonth, tab)} aria-label={t("month.previousMonth")}>
        <wa-button appearance="plain" size="s">
          <wa-icon name="chevron-left" label={t("month.previousMonth")}></wa-icon>
        </wa-button>
      </Link>

      <div className="wa-stack wa-gap-3xs" style={{ textAlign: "center" }}>
        <strong className="wa-heading-m" style={{ textTransform: "capitalize" }}>
          {monthName}
        </strong>
        {year ? <span className="wa-caption-m wa-color-text-quiet">{year}</span> : null}
      </div>

      <Link href={monthPagePath(followingMonth, tab)} aria-label={t("month.nextMonth")}>
        <wa-button appearance="plain" size="s">
          <wa-icon name="chevron-right" label={t("month.nextMonth")}></wa-icon>
        </wa-button>
      </Link>
    </div>
  );
}
