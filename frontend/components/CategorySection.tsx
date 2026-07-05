"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BudgetBar } from "@/components/BudgetBar";
import { computeBudgetTotals, sumCategoryAmounts } from "@/lib/monthViewMath";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Icon } from "@/components/Icon";
import { PendingBadge } from "@/components/PendingBadge";
import { RepeatScopeDialog } from "@/components/RepeatScopeDialog";
import { Badge } from "@/components/ui/pixelact-ui/badge";
import { Button } from "@/components/ui/pixelact-ui/button";
import { Card, CardContent } from "@/components/ui/pixelact-ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/pixelact-ui/collapsible";
import {
  deleteLineItem,
  type Category,
  type LineItem,
} from "@/lib/api";
import { resolveCategoryIcon } from "@/lib/icons";
import { type RecurrenceScope } from "@/lib/recurrence";
import { useTranslation } from "@/lib/i18n";
import { useFormatCurrency } from "@/lib/useFormatCurrency";
import { useRowPending, captureMonthViewState, useMonthView, useMonthViewActions } from "@/lib/MonthViewProvider";
import { backgroundReconcile } from "@/lib/backgroundReconcile";
import { canOptimisticallyDelete } from "@/lib/optimisticGates";
import { useMutationFeedback } from "@/lib/useMutationFeedback";

interface LineItemRowProps {
  item: LineItem;
  onEditItem: (item: LineItem) => void;
}

function TypeBadge({ item }: { item: LineItem }) {
  const { t } = useTranslation();
  const isIncome = item.type === "income";
  return (
    <Badge
      font="normal"
      className={`h-4 px-1.5 text-[0.625rem] ${isIncome ? "bg-income-subtle text-foreground" : "bg-expense-subtle text-foreground"}`}
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

function LineItemRow({ item, onEditItem }: LineItemRowProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const formatMoney = useFormatCurrency();
  const monthView = useMonthView();
  const { setFromServer, removeLineItem } = useMonthViewActions();
  const { loading, run, runOptimistic } = useMutationFeedback();
  const isPending = useRowPending(item.id);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [scopeDialogOpen, setScopeDialogOpen] = useState(false);
  const [scope, setScope] = useState<RecurrenceScope>("this");

  async function performDeletePessimistic(selectedScope?: RecurrenceScope) {
    await run(
      async () => {
        await deleteLineItem(
          item.id,
          item.seriesId && selectedScope ? { scope: selectedScope } : undefined,
        );
        setConfirmingDelete(false);
        setScopeDialogOpen(false);
        router.refresh();
      },
      { successMessage: t("categories.itemDeleted") },
    );
  }

  async function performDeleteOptimistic(selectedScope?: RecurrenceScope) {
    await runOptimistic({
      snapshot: () => captureMonthViewState(monthView),
      apply: () => {
        removeLineItem(item.id);
        setConfirmingDelete(false);
        setScopeDialogOpen(false);
      },
      mutate: () =>
        deleteLineItem(
          item.id,
          item.seriesId && selectedScope ? { scope: selectedScope } : undefined,
        ),
      reconcile: () => backgroundReconcile(router),
      rollback: (snapshot) => setFromServer(snapshot),
      successMessage: t("categories.itemDeleted"),
    });
  }

  async function performDelete(selectedScope?: RecurrenceScope) {
    if (canOptimisticallyDelete(selectedScope)) {
      await performDeleteOptimistic(selectedScope);
      return;
    }
    await performDeletePessimistic(selectedScope);
  }

  async function handleDelete() {
    if (item.seriesId) {
      setScope("this");
      setScopeDialogOpen(true);
      return;
    }

    await performDelete();
  }

  const isIncome = item.type === "income";

  return (
    <div
      className={`interactive-row flex items-start justify-between gap-2 px-2 py-2${isPending ? " row-pending" : ""}`}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-body min-w-0 break-words font-semibold">{item.label}</span>
        <span className="flex flex-wrap items-center gap-1">
          <TypeBadge item={item} />
          <RepeatBadge item={item} />
          {isPending && <PendingBadge />}
          {!item.isRealized && (
            <Badge
              font="normal"
              variant="outline"
              className="bg-planned-subtle h-4 px-1.5 text-[0.625rem] text-foreground"
            >
              <span className="flex items-center gap-1">
                <Icon name="planned" size="xs" />
                {t("categories.plannedBadge")}
              </span>
            </Badge>
          )}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className={`text-amount ${isIncome ? "text-income" : "text-expense"}`}>
          {isIncome ? "+" : "-"}
          {formatMoney(item.displayAmount)}
        </span>
        <div className="row-actions flex items-center gap-1">
          <Button
            type="button"
            variant="link"
            size="sm"
            className="pressable focus-ring h-auto p-1"
            onClick={() => onEditItem(item)}
            aria-label={t("categories.editCategory")}
          >
            <Icon name="edit" size="xs" />
          </Button>
          <Button
            type="button"
            variant="link"
            size="sm"
            className="pressable focus-ring h-auto p-1 text-destructive"
            onClick={() => {
              if (item.seriesId) {
                setScope("this");
                setScopeDialogOpen(true);
              } else {
                setConfirmingDelete(true);
              }
            }}
            disabled={loading}
            aria-label={t("categories.deleteItem")}
          >
            <Icon name="delete" size="xs" colorClass="text-destructive" />
          </Button>
        </div>
      </div>
      <ConfirmDialog
        open={confirmingDelete}
        onOpenChange={setConfirmingDelete}
        title={t("categories.deleteItem")}
        description={t("categories.deleteLineItemDescription", { label: item.label })}
        loading={loading}
        onConfirm={handleDelete}
      />
      <RepeatScopeDialog
        open={scopeDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setScopeDialogOpen(false);
          }
        }}
        mode="delete"
        scope={scope}
        onScopeChange={setScope}
        loading={loading}
        onConfirm={() => performDelete(scope)}
      />
    </div>
  );
}

interface CategorySectionProps {
  category: Category;
  yearMonth: string;
  onAddItem: () => void;
  onEditItem: (item: LineItem) => void;
  addItemTestId?: string;
}

export function CategorySection({
  category,
  yearMonth,
  onAddItem,
  onEditItem,
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
                <Icon name={iconName} size="sm" />
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
              <LineItemRow key={item.id} item={item} onEditItem={onEditItem} />
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

