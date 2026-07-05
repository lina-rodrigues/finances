import { FinanceOverview } from "@/components/FinanceOverview";
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
    <FinanceOverview
      month={data.month}
      categories={data.categories}
      uncategorized={data.uncategorized}
      flatCategories={flatCategories}
    />
  );
}
