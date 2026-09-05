"use client";

import { AccountantExportSection } from "@/components/AccountantExportSection";
import { Budget503020Section } from "@/components/Budget503020Section";
import { AiAssistantSection } from "@/components/AiAssistantSection";
import { PageTitle } from "@/components/PageTitle";
import { useMonthView } from "@/lib/MonthViewProvider";
import { useTranslation } from "@/lib/i18n";

export function ReportsPage() {
  const { month } = useMonthView();
  const { t } = useTranslation();

  return (
    <div className="wa-stack wa-gap-xl">
      <PageTitle>{t("nav.reports")}</PageTitle>
      <Budget503020Section yearMonth={month.yearMonth} />
      <AccountantExportSection yearMonth={month.yearMonth} />
      <AiAssistantSection yearMonth={month.yearMonth} />
    </div>
  );
}
