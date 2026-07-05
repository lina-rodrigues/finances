import { CategoriesSection } from "@/components/CategoriesSection";
import { MonthViewSeed } from "@/components/MonthViewShell";
import { fetchMonthView } from "@/lib/api-server";

export default async function CategoriesPage({
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
      <CategoriesSection />
    </>
  );
}
