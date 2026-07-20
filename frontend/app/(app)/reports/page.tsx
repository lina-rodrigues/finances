import { MonthViewSeed } from "@/components/MonthViewShell";
import { ReportsPage } from "@/components/ReportsPage";
import { fetchMonthView } from "@/lib/api-server";

export default async function ReportsRoutePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParam } = await searchParams;
  const data = await fetchMonthView(monthParam);
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
      <ReportsPage />
    </>
  );
}
