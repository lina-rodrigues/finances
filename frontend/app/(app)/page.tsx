import { FinanceOverview } from "@/components/FinanceOverview";
import { MonthViewSeed } from "@/components/MonthViewShell";
import { fetchMonthView } from "@/lib/api-server";

export default async function FinancePage() {
  const data = await fetchMonthView();
  const flatCategories = data.categories.map(({ id, name, order, icon, budgetGroup }) => ({
    id,
    name,
    order,
    icon,
    budgetGroup,
  }));

  return (
    <>
      <MonthViewSeed initialData={{ ...data, flatCategories }} />
      <FinanceOverview />
    </>
  );
}
