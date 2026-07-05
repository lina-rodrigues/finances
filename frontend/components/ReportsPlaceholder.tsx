"use client";

import { useTranslation } from "@/lib/i18n";

export function ReportsPlaceholder() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center px-4 py-12 text-center">
      <p className="text-display text-3xl tracking-widest">{t("reports.soon")}</p>
      <p className="text-muted-finance text-body mt-3 text-sm">{t("reports.comingSoon")}</p>
    </div>
  );
}
