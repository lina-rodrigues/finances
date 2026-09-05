"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { MonthNavHeader } from "@/components/MonthNavHeader";
import { useTranslation } from "@/lib/i18n";
import { resolveAppPageSize } from "@/lib/pageSize";

function AppShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  const month = searchParams.get("month");
  const monthQuery = month && /^\d{4}-\d{2}$/.test(month) ? `?month=${month}` : "";
  const pageSize = resolveAppPageSize(pathname);

  const financeActive = pathname === "/";
  const categoriesActive = pathname.startsWith("/categories");
  const importsActive = pathname.startsWith("/imports");
  const reportsActive = pathname.startsWith("/reports");
  const settingsActive = pathname.startsWith("/settings");
  const showMonthNav = financeActive || categoriesActive || reportsActive;

  if (!ready) {
    return (
      <div className="app-main" data-size={pageSize} style={{ padding: "var(--wa-space-xl)" }}>
        <div className="wa-stack wa-gap-l">{children}</div>
      </div>
    );
  }

  return (
    <wa-page>
      <header slot="header" className="app-header">
        <div className="app-header__start wa-cluster wa-gap-s wa-align-items-center">
          <wa-button data-toggle-nav appearance="plain" className="wa-mobile-only">
            <wa-icon name="bars" label={t("nav.label")}></wa-icon>
          </wa-button>
          {showMonthNav ? <MonthNavHeader /> : null}
        </div>

        <strong className="app-header__title wa-heading-l">{t("common.appTitle")}</strong>

        <div className="app-header__end wa-cluster wa-gap-s wa-align-items-center">
          <Link href="/settings" data-drawer="close" aria-label={t("settings.title")}>
            <wa-button appearance="plain">
              <wa-icon name="gear" label={t("settings.title")}></wa-icon>
            </wa-button>
          </Link>
        </div>
      </header>

      <nav slot="navigation" className="wa-stack wa-gap-s" aria-label={t("nav.label")}>
        <Link
          href={monthQuery ? `/${monthQuery}` : "/"}
          data-drawer="close"
          className="nav-link"
          aria-current={financeActive ? "page" : undefined}
        >
          <wa-icon name="chart-pie"></wa-icon>
          <span>{t("nav.finance")}</span>
        </Link>
        <Link
          href={`/categories${monthQuery}`}
          data-drawer="close"
          className="nav-link"
          aria-current={categoriesActive ? "page" : undefined}
        >
          <wa-icon name="list"></wa-icon>
          <span>{t("nav.categories")}</span>
        </Link>
        <Link
          href="/imports"
          data-drawer="close"
          className="nav-link"
          aria-current={importsActive ? "page" : undefined}
        >
          <wa-icon name="upload"></wa-icon>
          <span>{t("nav.imports")}</span>
        </Link>
        <Link
          href={`/reports${monthQuery}`}
          data-drawer="close"
          className="nav-link"
          aria-current={reportsActive ? "page" : undefined}
        >
          <wa-icon name="chart-line"></wa-icon>
          <span>{t("nav.reports")}</span>
        </Link>
        <Link
          href="/settings"
          data-drawer="close"
          className="nav-link"
          aria-current={settingsActive ? "page" : undefined}
        >
          <wa-icon name="gear"></wa-icon>
          <span>{t("settings.title")}</span>
        </Link>
      </nav>

      <div className="app-main" data-size={pageSize}>
        <div className="wa-stack wa-gap-l">{children}</div>
      </div>
    </wa-page>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="app-main" style={{ padding: "var(--wa-space-xl)" }}>
          <div className="wa-stack wa-gap-l">{children}</div>
        </div>
      }
    >
      <AppShellInner>{children}</AppShellInner>
    </Suspense>
  );
}
