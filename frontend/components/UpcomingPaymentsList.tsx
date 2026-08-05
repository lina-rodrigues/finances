"use client";

import { CategoryIcon } from "@/components/CategoryIcon";
import { LineItemActions } from "@/components/LineItemActions";
import { hasLineItemEntries } from "@/lib/lineItemAmounts";
import { type Category, type LineItem } from "@/lib/api";
import type { LineItemActionHandlers } from "@/lib/useLineItemDialogHost";
import { useTranslation } from "@/lib/i18n";
import { useFormatCurrency } from "@/lib/useFormatCurrency";

import {
  Alert,
  AlertDescription,
} from "@lina-rodrigues/cotton-candy";

interface UpcomingGroup {
  id: string;
  name: string;
  icon: string;
  items: LineItem[];
}

function isUpcomingExpense(item: LineItem): boolean {
  return item.type === "expense" && !hasLineItemEntries(item);
}

function collectUpcomingGroups(
  categories: Category[],
  uncategorized: LineItem[],
  uncategorizedLabel: string,
): UpcomingGroup[] {
  const groups: UpcomingGroup[] = [];

  for (const category of categories) {
    const items = category.lineItems
      .filter(isUpcomingExpense)
      .sort((a, b) => a.label.localeCompare(b.label));
    if (items.length === 0) {
      continue;
    }
    groups.push({
      id: category.id,
      name: category.name,
      icon: category.icon,
      items,
    });
  }

  const uncategorizedItems = uncategorized
    .filter(isUpcomingExpense)
    .sort((a, b) => a.label.localeCompare(b.label));
  if (uncategorizedItems.length > 0) {
    groups.push({
      id: "__uncategorized__",
      name: uncategorizedLabel,
      icon: "category",
      items: uncategorizedItems,
    });
  }

  return groups;
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
  const groups = collectUpcomingGroups(categories, uncategorized, t("common.uncategorized"));

  if (groups.length === 0) {
    return (
      <Alert>
        <AlertDescription className="text-body">{t("finance.noUpcomingPayments")}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <div key={group.id} className="space-y-2">
          <h3 className="text-display flex min-w-0 items-center gap-2 text-xs normal-case leading-snug">
            <span className="icon-slot shrink-0">
              <CategoryIcon icon={group.icon} size="sm" />
            </span>
            <span className="min-w-0 break-words">{group.name}</span>
          </h3>
          <ul className="responsive-list-columns">
            {group.items.map((item) => (
              <li key={item.id}>
                <div className="inventory-slot interactive-surface relative flex min-w-0 w-full items-center gap-3 px-2 py-2 sm:px-3 sm:py-2.5">
                  <button
                    type="button"
                    className="pressable focus-ring absolute inset-0 z-0 cursor-pointer border-0 bg-transparent p-0"
                    onClick={() => handlers.openDetail(item)}
                    aria-label={`${t("entries.detailTitle")}: ${item.label}`}
                  />
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
        </div>
      ))}
    </div>
  );
}
