"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { getCurrentYearMonth, navPath, type AppTab } from "@/lib/api";
import { useTranslation } from "@/lib/i18n";

import {
  Icon,
  type IconName,
} from "@lina-rodrigues/cotton-candy";
const tabs: { id: AppTab; icon: IconName; labelKey: string }[] = [
  { id: "finance", icon: "navFinance", labelKey: "nav.finance" },
  { id: "categories", icon: "navCategories", labelKey: "nav.categories" },
  { id: "reports", icon: "navReports", labelKey: "nav.reports" },
];

function resolveActiveTab(pathname: string): AppTab {
  if (pathname.startsWith("/categories")) {
    return "categories";
  }
  if (pathname.startsWith("/reports")) {
    return "reports";
  }
  return "finance";
}

function resolveYearMonth(searchParams: ReturnType<typeof useSearchParams>): string {
  const month = searchParams.get("month");
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    return month;
  }
  return getCurrentYearMonth();
}

export function BottomNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const activeTab = resolveActiveTab(pathname);
  const yearMonth = resolveYearMonth(searchParams);

  return (
    <nav className="app-bottom-nav" aria-label={t("nav.label")}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        const href =
          tab.id === "finance" ? navPath("finance") : navPath(tab.id, yearMonth);
        return (
          <Link
            key={tab.id}
            href={href}
            className={`app-bottom-nav-item pressable focus-ring ${isActive ? "app-bottom-nav-item-active" : ""}`}
            aria-current={isActive ? "page" : undefined}
          >
            <span className="app-bottom-nav-icon" aria-hidden>
              <Icon
                name={tab.icon}
                size="md"
                colorClass={isActive ? "text-fin-balance" : "text-muted-finance"}
              />
            </span>
            <span className="app-bottom-nav-label">{t(tab.labelKey)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
