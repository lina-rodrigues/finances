import { CategoryManagePage } from "@/components/CategoryManagePage";
import { MonthViewSeed } from "@/components/MonthViewShell";
import { fetchMonthView } from "@/lib/api-server";

export default async function ManageCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParam } = await searchParams;
  const data = await fetchMonthView(monthParam);
  const flatCategories = data.categories.map(({ id, name, order, icon }) => ({
    id,
    name,
    order,
    icon,
  }));

  return (
    <>
      <MonthViewSeed initialData={{ ...data, flatCategories }} />
      <CategoryManagePage />
    </>
  );
}
