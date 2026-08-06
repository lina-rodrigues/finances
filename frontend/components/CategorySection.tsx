"use client";

import { BudgetBar } from "@/components/BudgetBar";
import { computeBudgetTotals, sumCategoryAmounts } from "@/lib/monthViewMath";
import { CategoryIcon } from "@/components/CategoryIcon";
import { PendingBadge } from "@/components/PendingBadge";
import { type Category, type LineItem } from "@/lib/api";
import { getLineItemRealizedAmount, hasLineItemEntries } from "@/lib/lineItemAmounts";
import type { LineItemActionHandlers } from "@/lib/useLineItemDialogHost";
import { useTranslation } from "@/lib/i18n";
import { useFormatCurrency } from "@/lib/useFormatCurrency";
import { useRowPending } from "@/lib/MonthViewProvider";

/** Toggle line-item badges (income/expense, repeat, planned, pending) in category rows. */
const SHOW_LINE_ITEM_TAGS = false;

interface LineItemRowProps {
  item: LineItem;
  handlers: LineItemActionHandlers;
}

function TypeBadge({ item }: { item: LineItem }) {
  const { t } = useTranslation();
  const isIncome = item.type === "income";
  return (
    <wa-badge appearance="outlined" variant={isIncome ? "success" : "danger"}>
      <wa-icon
        slot="start"
        name={isIncome ? "arrow-trend-up" : "arrow-trend-down"}
      ></wa-icon>
      {isIncome ? t("categories.income") : t("categories.expense")}
    </wa-badge>
  );
}

function RepeatBadge({ item }: { item: LineItem }) {
  const { t } = useTranslation();

  if (!item.seriesId) {
    return null;
  }

  return (
    <wa-badge appearance="outlined" variant="neutral">
      <wa-icon slot="start" name="repeat"></wa-icon>
      {t("repeat.badge")}
    </wa-badge>
  );
}

function LineItemRow({ item, handlers }: LineItemRowProps) {
  const { t } = useTranslation();
  const formatMoney = useFormatCurrency();
  const isPending = useRowPending(item.id);
  const isIncome = item.type === "income";
  const spent = getLineItemRealizedAmount(item);
  const amountClass = isIncome ? "metric-amount--income" : "metric-amount--expense";

  return (
    <button
      type="button"
      className={`list-row${isPending ? " row-pending" : ""}`}
      onClick={() => handlers.openDetail(item)}
      aria-label={`${t("entries.detailTitle")}: ${item.label}`}
    >
      <div className="wa-stack wa-gap-2xs" style={{ minWidth: 0, flex: 1 }}>
        <span className="wa-caption-m" style={{ fontWeight: "var(--wa-font-weight-semibold)" }}>
          {item.label}
        </span>
        {spent !== null && (
          <span className="wa-caption-s wa-color-text-quiet">
            {t("budget.plannedOf", {
              spent: formatMoney(spent),
              planned: formatMoney(item.plannedAmount),
            })}
          </span>
        )}
        {SHOW_LINE_ITEM_TAGS && (
          <span className="wa-cluster wa-gap-2xs">
            <TypeBadge item={item} />
            <RepeatBadge item={item} />
            {isPending && <PendingBadge />}
            {!hasLineItemEntries(item) && (
              <wa-badge appearance="outlined" variant="warning">
                <wa-icon slot="start" name="clock"></wa-icon>
                {t("categories.plannedBadge")}
              </wa-badge>
            )}
          </span>
        )}
      </div>
      <span className={`metric-amount--inline ${amountClass}`} style={{ flexShrink: 0 }}>
        {isIncome ? "+" : "-"}
        {formatMoney(item.displayAmount)}
      </span>
    </button>
  );
}

interface CategorySectionProps {
  category: Category;
  onAddItem: () => void;
  handlers: LineItemActionHandlers;
  addItemTestId?: string;
}

export function CategorySection({
  category,
  onAddItem,
  handlers,
  addItemTestId,
}: CategorySectionProps) {
  const { t } = useTranslation();
  const formatMoney = useFormatCurrency();
  const hasContent = category.lineItems.length > 0;
  const categoryTotal = sumCategoryAmounts(category.lineItems);
  const { plannedTotal, realizedTotal } = computeBudgetTotals(category.lineItems);

  const totalClass =
    categoryTotal > 0
      ? "metric-amount--income"
      : categoryTotal < 0
        ? "metric-amount--expense"
        : "metric-amount--muted";
  const totalLabel = `${categoryTotal > 0 ? "+" : categoryTotal < 0 ? "-" : ""}${formatMoney(
    Math.abs(categoryTotal),
  )}`;

  return (
    <wa-details className="category-details" appearance="outlined" open>
      <span slot="summary" className="category-card-heading">
        <CategoryIcon
          icon={category.icon}
          className="category-card-heading__icon"
        />
        <span className="wa-heading-m category-card-heading__name">{category.name}</span>
        <span className={`metric-amount--inline category-card-heading__total ${totalClass}`}>
          {totalLabel}
        </span>
      </span>

      <div className="wa-stack wa-gap-m">
        {hasContent ? (
          <BudgetBar plannedTotal={plannedTotal} realizedTotal={realizedTotal} />
        ) : (
          <p className="wa-caption-m wa-color-text-quiet" style={{ margin: 0 }}>
            {t("categories.nothingPlanned")}
          </p>
        )}
        <div className="wa-stack wa-gap-s">
          {category.lineItems.map((item) => (
            <LineItemRow key={item.id} item={item} handlers={handlers} />
          ))}
        </div>
        <wa-button
          type="button"
          appearance="plain"
          size="s"
          data-testid={addItemTestId}
          onClick={onAddItem}
        >
          <wa-icon slot="start" name="plus"></wa-icon>
          {t("categories.addItem")}
        </wa-button>
      </div>
    </wa-details>
  );
}
