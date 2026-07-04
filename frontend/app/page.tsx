import Image from "next/image";
import { CategoryManager } from "@/components/CategoryManager";
import { CategorySection } from "@/components/CategorySection";
import { MonthSummary } from "@/components/MonthSummary";
import { Alert, AlertDescription } from "@/components/ui/pixelact-ui/alert";
import { Card, CardContent } from "@/components/ui/pixelact-ui/card";
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
      <section className="pt-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-display text-sm">Categories</h2>
          <CategoryManager initialCategories={flatCategories} />
        </div>
        {data.categories.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
              <Image
                src="/assets/mascot-piggy.svg"
                alt=""
                width={64}
                height={64}
                aria-hidden
              />
              <Alert className="max-w-sm">
                <AlertDescription className="text-body">
                  No categories yet. Run the seed script or add one with Manage.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
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
