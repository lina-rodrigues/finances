"use client";

import { CategoryIcon } from "@/components/CategoryIcon";
import { LineItemActions } from "@/components/LineItemActions";
import { hasLineItemEntries } from "@/lib/lineItemAmounts";
import { type Category, type LineItem } from "@/lib/api";
import type { LineItemActionHandlers } from "@/lib/useLineItemDialogHost";
import { useTranslation } from "@/lib/i18n";
import { useFormatCurrency } from "@/lib/useFormatCurrency";

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
      <wa-callout variant="neutral">
        <wa-icon slot="icon" name="circle-info"></wa-icon>
        {t("finance.noUpcomingPayments")}
      </wa-callout>
    );
  }

  return (
    <div className="wa-grid wa-gap-l upcoming-payments-grid">
      {groups.map((group) => (
        <div key={group.id} className="wa-stack wa-gap-s">
          <h3 className="wa-cluster wa-gap-s wa-align-items-center wa-heading-xs">
            <CategoryIcon icon={group.icon} />
            <span style={{ minWidth: 0 }}>{group.name}</span>
          </h3>
          <ul className="wa-stack wa-gap-s" style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {group.items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className="list-row"
                  onClick={() => handlers.openDetail(item)}
                  aria-label={`${t("entries.detailTitle")}: ${item.label}`}
                >
                  <span
                    className="wa-caption-m wa-text-truncate"
                    style={{ minWidth: 0, flex: 1 }}
                  >
                    {item.label}
                  </span>
                  <span
                    className="metric-amount--inline metric-amount--expense"
                    style={{ flexShrink: 0, whiteSpace: "nowrap" }}
                  >
                    -{formatMoney(item.plannedAmount)}
                  </span>
                  <LineItemActions
                    item={item}
                    layout="inline"
                    onPay={handlers.payItem}
                    onAdd={handlers.openAdd}
                    onEdit={handlers.openEdit}
                  />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
