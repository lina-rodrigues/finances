import { FinanceOverview } from "@/components/FinanceOverview";
import { MonthViewShell } from "@/components/MonthViewShell";
import { fetchMonthView } from "@/lib/api-server";

export default async function FinancePage() {
  const data = await fetchMonthView();
  const flatCategories = data.categories.map(({ id, name, order, icon }) => ({
    id,
    name,
    order,
    icon,
  }));

  return (
    <MonthViewShell initialData={{ ...data, flatCategories }}>
      <FinanceOverview />
    </MonthViewShell>
  );
}
