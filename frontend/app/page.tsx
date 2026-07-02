import { CategorySection } from "@/components/CategorySection";
import { MonthSummary } from "@/components/MonthSummary";
import { fetchMonthView } from "@/lib/api";

export default async function HomePage() {
  const data = await fetchMonthView();

  return (
    <div className="space-y-6">
      <MonthSummary month={data.month} />
      <section>
        <h2 className="mb-4 text-lg font-semibold">Categories</h2>
        {data.categories.length === 0 ? (
          <div className="alert">
            <span>No categories found. Run the seed script to populate default categories.</span>
          </div>
        ) : (
          <div className="space-y-2">
            {data.categories.map((category) => (
              <CategorySection
                key={category.id}
                category={category}
                yearMonth={data.month.yearMonth}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
