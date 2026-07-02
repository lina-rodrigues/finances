import Image from "next/image";
import { CategoryManager } from "@/components/CategoryManager";
import { CategorySection } from "@/components/CategorySection";
import { MonthSummary } from "@/components/MonthSummary";
import { fetchMonthView } from "@/lib/api";

export default async function HomePage() {
  const data = await fetchMonthView();
  const flatCategories = data.categories.map(({ id, name, order, icon }) => ({
    id,
    name,
    order,
    icon,
  }));

  return (
    <div className="space-y-6">
      <MonthSummary month={data.month} />
      <section>
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-display text-sm">Categories</h2>
          <CategoryManager initialCategories={flatCategories} />
        </div>
        {data.categories.length === 0 ? (
          <div className="frame-panel flex flex-col items-center gap-3 p-6 text-center">
            <Image
              src="/assets/mascot-piggy.svg"
              alt=""
              width={64}
              height={64}
              aria-hidden
            />
            <div className="toast-bubble alert alert-info max-w-sm">
              <span className="text-body">
                No categories yet. Run the seed script or add one with Manage.
              </span>
            </div>
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
