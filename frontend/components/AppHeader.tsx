"use client";

import { usePathname } from "next/navigation";
import { MonthNavHeader } from "@/components/MonthNavHeader";
import { SettingsButton } from "@/components/SettingsButton";
import { useTranslation } from "@/lib/i18n";

export function AppHeader() {
  const pathname = usePathname();
  const { t } = useTranslation();
  const showMonthNav = pathname.startsWith("/categories") || pathname.startsWith("/reports");

  return (
    <header className="app-nav-bar app-header">
      <div className="app-nav-handle" aria-hidden="true" />
      <div className="app-nav-toolbar relative flex items-center justify-center px-4 pb-4">
        {showMonthNav ? (
          <MonthNavHeader />
        ) : (
          <h1 className="pill-title">{t("common.appTitle")}</h1>
        )}
        <div className="absolute right-4">
          <SettingsButton />
        </div>
      </div>
    </header>
  );
}
