"use client";

import { Budget503020Section } from "@/components/Budget503020Section";
import { AiAssistantSection } from "@/components/AiAssistantSection";
import { useMonthView } from "@/lib/MonthViewProvider";

export function ReportsPage() {
  const { month } = useMonthView();

  return (
    <div className="space-y-8">
      <Budget503020Section yearMonth={month.yearMonth} />
      <AiAssistantSection yearMonth={month.yearMonth} />
    </div>
  );
}
