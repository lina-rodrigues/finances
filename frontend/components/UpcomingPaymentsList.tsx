"use client";

import { CategoryIcon } from "@/components/CategoryIcon";
import { LineItemActions } from "@/components/LineItemActions";
import { Alert, AlertDescription } from "@/components/ui/pixelact-ui/alert";
import { type Category, type LineItem } from "@/lib/api";
import type { LineItemActionHandlers } from "@/lib/useLineItemDialogHost";
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
  handlers: LineItemActionHandlers;
}

export function UpcomingPaymentsList({
  categories,
  uncategorized,
  handlers,
}: UpcomingPaymentsListProps) {
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
        <li key={item.id}>
          <div className="inventory-slot interactive-surface relative flex min-w-0 w-full items-center gap-3 px-2 py-2 sm:px-3 sm:py-2.5">
            <button
              type="button"
              className="pressable focus-ring absolute inset-0 z-0 cursor-pointer border-0 bg-transparent p-0"
              onClick={() => handlers.openDetail(item)}
              aria-label={`${t("entries.detailTitle")}: ${item.label}`}
            />
            <CategoryIcon icon={icon} size="sm" className="relative z-10 shrink-0 pointer-events-none" />
            <span className="text-body relative z-10 min-w-0 flex-1 truncate font-medium pointer-events-none">
              {item.label}
            </span>
            <span className="text-amount text-expense relative z-10 shrink-0 whitespace-nowrap pointer-events-none">
              -{formatMoney(item.plannedAmount)}
            </span>
            <div className="relative z-10 shrink-0">
              <LineItemActions
                item={item}
                layout="inline"
                onPay={handlers.payItem}
                onAdd={handlers.openAdd}
                onEdit={handlers.openEdit}
              />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
