import { CategoriesSection } from "@/components/CategoriesSection";
import { MonthViewShell } from "@/components/MonthViewShell";
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
    <MonthViewShell initialData={{ ...data, flatCategories }}>
      <CategoriesSection />
    </MonthViewShell>
  );
}
