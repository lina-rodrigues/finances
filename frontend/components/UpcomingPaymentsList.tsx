"use client";

import { CategoryIcon } from "@/components/CategoryIcon";
import { Alert, AlertDescription } from "@/components/ui/pixelact-ui/alert";
import { type Category, type LineItem } from "@/lib/api";
import { useTranslation } from "@/lib/i18n";
import { useFormatCurrency } from "@/lib/useFormatCurrency";

interface UpcomingItem {
  item: LineItem;
  icon: string;
}

function collectUpcoming(categories: Category[], uncategorized: LineItem[]): UpcomingItem[] {
  const upcoming: UpcomingItem[] = [];

  for (const category of categories) {
    for (const item of category.lineItems) {
      if (item.type === "expense" && !item.isRealized) {
        upcoming.push({ item, icon: category.icon });
      }
    }
  }

  for (const item of uncategorized) {
    if (item.type === "expense" && !item.isRealized) {
      upcoming.push({ item, icon: "category" });
    }
  }

  return upcoming.sort((a, b) => a.item.label.localeCompare(b.item.label));
}

interface UpcomingPaymentsListProps {
  categories: Category[];
  uncategorized: LineItem[];
}

export function UpcomingPaymentsList({ categories, uncategorized }: UpcomingPaymentsListProps) {
  const { t } = useTranslation();
  const formatMoney = useFormatCurrency();
  const upcoming = collectUpcoming(categories, uncategorized);

  if (upcoming.length === 0) {
    return (
      <Alert>
        <AlertDescription className="text-body">{t("finance.noUpcomingPayments")}</AlertDescription>
      </Alert>
    );
  }

  return (
    <ul className="responsive-list-columns">
      {upcoming.map(({ item, icon }) => (
        <li
          key={item.id}
          className="inventory-slot flex min-w-0 items-center gap-3 px-3 py-2.5"
        >
          <div className="icon-slot shrink-0">
            <CategoryIcon icon={icon} size="md" />
          </div>
          <span className="text-body min-w-0 flex-1 truncate font-medium">{item.label}</span>
          <span className="text-amount text-expense shrink-0 whitespace-nowrap">
            -{formatMoney(item.plannedAmount)}
          </span>
        </li>
      ))}
    </ul>
  );
}
