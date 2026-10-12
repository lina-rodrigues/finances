"use client";

import { PageTitle } from "@/components/PageTitle";
import { useAuth } from "@/lib/AuthProvider";
import { useTranslation } from "@/lib/i18n";

export default function ImportsLayout({ children }: { children: React.ReactNode }) {
  const { readOnly, loading } = useAuth();
  const { t } = useTranslation();

  if (loading) {
    return null;
  }

  if (readOnly) {
    return (
      <div className="wa-stack wa-gap-l">
        <PageTitle>{t("imports.title")}</PageTitle>
        <wa-callout variant="neutral">{t("imports.readOnlyUnavailable")}</wa-callout>
      </div>
    );
  }

  return children;
}
