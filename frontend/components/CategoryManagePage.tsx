"use client";

import Link from "next/link";
import { CategoryManagerEditor } from "@/components/CategoryManagerEditor";
import { categoryManagePath, navPath } from "@/lib/api";
import { useMonthView } from "@/lib/MonthViewProvider";
import { useTranslation } from "@/lib/i18n";

import {
  Icon,
} from "@lina-rodrigues/cotton-candy";
export function CategoryManagePage() {
  const { t } = useTranslation();
  const { month } = useMonthView();
  const backHref = navPath("categories", month.yearMonth);

  return (
    <div className="pb-6">
      <div className="mb-4 flex flex-col gap-3">
        <Link
          href={backHref}
          className="pressable focus-ring text-body inline-flex w-fit items-center gap-1 text-sm text-link"
        >
          <Icon name="chevronLeft" size="xs" />
          {t("categories.backToCategories")}
        </Link>
        <div>
          <h1 className="text-display text-sm">{t("categories.manageTitle")}</h1>
          <p className="text-muted-finance text-body mt-1 text-sm">{t("categories.manageHint")}</p>
        </div>
      </div>

      <CategoryManagerEditor />
    </div>
  );
}
