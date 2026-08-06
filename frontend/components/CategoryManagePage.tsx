"use client";

import Link from "next/link";
import { CategoryManagerEditor } from "@/components/CategoryManagerEditor";
import { PageTitle } from "@/components/PageTitle";
import { navPath } from "@/lib/api";
import { useMonthView } from "@/lib/MonthViewProvider";
import { useTranslation } from "@/lib/i18n";

export function CategoryManagePage() {
  const { t } = useTranslation();
  const { month } = useMonthView();
  const backHref = navPath("categories", month.yearMonth);

  return (
    <div className="wa-stack wa-gap-l">
      <div className="wa-stack wa-gap-s">
        <Link href={backHref} className="wa-cluster wa-gap-2xs wa-caption-m">
          <wa-icon name="chevron-left"></wa-icon>
          {t("categories.backToCategories")}
        </Link>
        <div className="wa-stack wa-gap-2xs">
          <PageTitle>{t("categories.manageTitle")}</PageTitle>
          <p className="wa-caption-m wa-color-text-quiet">{t("categories.manageHint")}</p>
        </div>
      </div>

      <CategoryManagerEditor />
    </div>
  );
}
