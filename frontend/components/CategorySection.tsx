"use client";

import { BudgetBar } from "@/components/BudgetBar";
import { computeBudgetTotals, sumCategoryAmounts } from "@/lib/monthViewMath";
import { CategoryIcon } from "@/components/CategoryIcon";
import { Icon } from "@/components/Icon";
import { PendingBadge } from "@/components/PendingBadge";
import { type Category, type LineItem } from "@/lib/api";
import { getLineItemRealizedAmount, hasLineItemEntries } from "@/lib/lineItemAmounts";
import { resolveCategoryIcon } from "@/lib/icons";
import type { LineItemActionHandlers } from "@/lib/useLineItemDialogHost";
import { useTranslation } from "@/lib/i18n";
import { useFormatCurrency } from "@/lib/useFormatCurrency";
import { useRowPending } from "@/lib/MonthViewProvider";

import {
  Badge,
  Button,
  Card,
  CardContent,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@lina-rodrigues/cotton-candy";
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
    <Badge
      font="normal"
      className={`h-4 px-1.5 text-[0.625rem] ${isIncome ? "bg-income-subtle text-income" : "bg-expense-subtle text-expense"}`}
    >
      <span className="flex items-center gap-1">
        <Icon name={isIncome ? "income" : "expense"} size="xs" />
        {isIncome ? t("categories.income") : t("categories.expense")}
      </span>
    </Badge>
  );
}

function RepeatBadge({ item }: { item: LineItem }) {
  const { t } = useTranslation();

  if (!item.seriesId) {
    return null;
  }

  return (
    <Badge
      font="normal"
      variant="outline"
      className="bg-muted h-4 px-1.5 text-[0.625rem] text-foreground"
    >
      <span className="flex items-center gap-1">
        <Icon name="repeat" size="xs" />
        {t("repeat.badge")}
      </span>
    </Badge>
  );
}

function LineItemRow({ item, handlers }: LineItemRowProps) {
  const { t } = useTranslation();
  const formatMoney = useFormatCurrency();
  const isPending = useRowPending(item.id);
  const isIncome = item.type === "income";
  const spent = getLineItemRealizedAmount(item);

  return (
    <button
      type="button"
      className={`interactive-row flex w-full items-start justify-between gap-2 px-2 py-2 text-left${isPending ? " row-pending" : ""}`}
      onClick={() => handlers.openDetail(item)}
      aria-label={`${t("entries.detailTitle")}: ${item.label}`}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-body min-w-0 break-words font-semibold">{item.label}</span>
        {spent !== null && (
          <span className="text-body text-muted-finance text-xs">
            {t("budget.plannedOf", {
              spent: formatMoney(spent),
              planned: formatMoney(item.plannedAmount),
            })}
          </span>
        )}
        {SHOW_LINE_ITEM_TAGS && (
          <span className="flex flex-wrap items-center gap-1">
            <TypeBadge item={item} />
            <RepeatBadge item={item} />
            {isPending && <PendingBadge />}
            {!hasLineItemEntries(item) && (
              <Badge
                font="normal"
                variant="outline"
                className="bg-planned-subtle h-4 px-1.5 text-[0.625rem] text-planned"
              >
                <span className="flex items-center gap-1">
                  <Icon name="planned" size="xs" />
                  {t("categories.plannedBadge")}
                </span>
              </Badge>
            )}
          </span>
        )}
      </div>
      <span className={`text-amount shrink-0 ${isIncome ? "text-income" : "text-expense"}`}>
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
  const iconName = resolveCategoryIcon(category.icon);
  const hasContent = category.lineItems.length > 0;
  const categoryTotal = sumCategoryAmounts(category.lineItems);
  const { plannedTotal, realizedTotal } = computeBudgetTotals(category.lineItems);

  const totalClass =
    categoryTotal > 0 ? "text-income" : categoryTotal < 0 ? "text-expense" : "text-muted-finance";
  const totalLabel = `${categoryTotal > 0 ? "+" : categoryTotal < 0 ? "-" : ""}${formatMoney(
    Math.abs(categoryTotal),
  )}`;

  return (
    <Collapsible defaultOpen>
      <Card>
        <CollapsibleTrigger className="interactive-surface group w-full cursor-pointer px-4 py-3 text-left">
          <div className="flex w-full items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-2">
              <span className="icon-slot shrink-0">
                <CategoryIcon icon={iconName} size="sm" />
              </span>
              <h3 className="text-display min-w-0 text-xs normal-case leading-snug break-words">
                {category.name}
              </h3>
            </span>
            <span className="flex shrink-0 items-center gap-2">
              <span className={`text-amount text-sm ${totalClass}`}>{totalLabel}</span>
              <Icon
                name="chevronDown"
                size="sm"
                className="transition-transform duration-200 group-data-[state=open]:rotate-180"
              />
            </span>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-1 pt-0">
            {hasContent ? (
              <BudgetBar plannedTotal={plannedTotal} realizedTotal={realizedTotal} />
            ) : (
              <p className="text-body text-muted-finance px-2 text-sm">{t("categories.nothingPlanned")}</p>
            )}
            {category.lineItems.map((item) => (
              <LineItemRow key={item.id} item={item} handlers={handlers} />
            ))}
            <Button
              type="button"
              variant="link"
              size="sm"
              className="btn-add-item focus-ring mt-1 gap-1"
              data-testid={addItemTestId}
              onClick={onAddItem}
            >
              <Icon name="add" size="xs" />
              {t("categories.addItem")}
            </Button>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
