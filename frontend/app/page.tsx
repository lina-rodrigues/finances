import { CategoriesSection } from "@/components/CategoriesSection";
import { MonthSummary } from "@/components/MonthSummary";
import { fetchMonthView } from "@/lib/api";

export default async function HomePage({
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
    <div className="space-y-6">
      <MonthSummary month={data.month} />
      <CategoriesSection
        categories={data.categories}
        uncategorized={data.uncategorized}
        flatCategories={flatCategories}
        yearMonth={data.month.yearMonth}
      />
    </div>
  );
}
