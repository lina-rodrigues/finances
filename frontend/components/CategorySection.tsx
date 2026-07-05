"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BudgetBar, computeBudgetTotals } from "@/components/BudgetBar";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Icon } from "@/components/Icon";
import { RepeatConfigFields } from "@/components/RepeatConfigFields";
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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/pixelact-ui/dialog";
import { Input } from "@/components/ui/pixelact-ui/input";
import { Spinner } from "@/components/ui/pixelact-ui/spinner";
import {
  convertLineItemToRecurrence,
  deleteLineItem,
  updateLineItem,
  type Category,
  type LineItem,
} from "@/lib/api";
import { resolveCategoryIcon } from "@/lib/icons";
import {
  buildRecurrencePayload,
  type RecurrenceScope,
  type RepeatMode,
} from "@/lib/recurrence";
import { useTranslation } from "@/lib/i18n";
import { useFormatCurrency } from "@/lib/useFormatCurrency";
import { useMutationFeedback } from "@/lib/useMutationFeedback";

interface LineItemRowProps {
  item: LineItem;
  yearMonth: string;
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

function LineItemRow({ item, yearMonth }: LineItemRowProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const formatMoney = useFormatCurrency();
  const { loading, run } = useMutationFeedback();
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [scopeDialogMode, setScopeDialogMode] = useState<"edit" | "delete" | null>(null);
  const [scope, setScope] = useState<RecurrenceScope>("this");
  const [makeRecurringOpen, setMakeRecurringOpen] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>("never");
  const [startYearMonth, setStartYearMonth] = useState(yearMonth);
  const [occurrenceCount, setOccurrenceCount] = useState("12");
  const [endYearMonth, setEndYearMonth] = useState(yearMonth);
  const [label, setLabel] = useState(item.label);
  const [plannedAmount, setPlannedAmount] = useState(String(item.plannedAmount));
  const [realizedAmount, setRealizedAmount] = useState(
    item.realizedAmount !== null ? String(item.realizedAmount) : "",
  );

  async function performSave(selectedScope?: RecurrenceScope) {
    await run(
      async () => {
        await updateLineItem(item.id, {
          label,
          plannedAmount: parseFloat(plannedAmount),
          realizedAmount: realizedAmount === "" ? null : parseFloat(realizedAmount),
          ...(item.seriesId && selectedScope ? { scope: selectedScope } : {}),
        });
        setEditing(false);
        setScopeDialogMode(null);
        router.refresh();
      },
      { successMessage: t("categories.itemUpdated") },
    );
  }

  async function handleSave() {
    if (item.seriesId) {
      setScope("this");
      setScopeDialogMode("edit");
      return;
    }

    await performSave();
  }

  async function performDelete(selectedScope?: RecurrenceScope) {
    await run(
      async () => {
        await deleteLineItem(
          item.id,
          item.seriesId && selectedScope ? { scope: selectedScope } : undefined,
        );
        setConfirmingDelete(false);
        setScopeDialogMode(null);
        router.refresh();
      },
      { successMessage: t("categories.itemDeleted") },
    );
  }

  async function handleDelete() {
    if (item.seriesId) {
      setScope("this");
      setScopeDialogMode("delete");
      return;
    }

    await performDelete();
  }

  async function handleMakeRecurring(event: React.FormEvent) {
    event.preventDefault();

    const recurrence = buildRecurrencePayload(
      repeatMode,
      startYearMonth,
      occurrenceCount,
      endYearMonth,
    );

    if (!recurrence) {
      return;
    }

    await run(
      async () => {
        await convertLineItemToRecurrence(item.id, recurrence);
        setMakeRecurringOpen(false);
        router.refresh();
      },
      { successMessage: t("repeat.seriesMadeRecurring") },
    );
  }

  if (editing) {
    return (
      <>
        <div className="fade-in finance-form bg-muted p-3">
          <Input
            className="finance-form-field-grow"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            disabled={loading}
            placeholder={t("addItem.label")}
          />
          <Input
            className="finance-form-field-sm"
            type="number"
            step="0.01"
            placeholder={t("addItem.planned")}
            value={plannedAmount}
            onChange={(e) => setPlannedAmount(e.target.value)}
            disabled={loading}
          />
          <Input
            className="finance-form-field-sm"
            type="number"
            step="0.01"
            placeholder={t("categories.realized")}
            value={realizedAmount}
            onChange={(e) => setRealizedAmount(e.target.value)}
            disabled={loading}
          />
          <div className="finance-form-actions flex-wrap">
            <Button
              variant="default"
              size="sm"
              className="pressable focus-ring gap-1"
              onClick={handleSave}
              disabled={loading}
            >
              {loading ? <Spinner className="size-4" /> : <Icon name="save" size="xs" />}
              {t("common.save")}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="pressable focus-ring gap-1"
              onClick={() => setEditing(false)}
              disabled={loading}
            >
              <Icon name="cancel" size="xs" />
              {t("common.cancel")}
            </Button>
            {!item.seriesId && (
              <Button
                type="button"
                variant="link"
                size="sm"
                className="pressable focus-ring gap-1"
                onClick={() => {
                  setRepeatMode("never");
                  setStartYearMonth(yearMonth);
                  setOccurrenceCount("12");
                  setEndYearMonth(yearMonth);
                  setMakeRecurringOpen(true);
                }}
                disabled={loading}
              >
                <Icon name="repeat" size="xs" />
                {t("repeat.makeRecurring")}
              </Button>
            )}
          </div>
        </div>

        <RepeatScopeDialog
          open={scopeDialogMode === "edit"}
          onOpenChange={(open) => {
            if (!open) {
              setScopeDialogMode(null);
            }
          }}
          mode="edit"
          scope={scope}
          onScopeChange={setScope}
          loading={loading}
          onConfirm={() => performSave(scope)}
        />

        <Dialog open={makeRecurringOpen} onOpenChange={setMakeRecurringOpen}>
          <DialogContent className="max-h-[85dvh] overflow-x-hidden overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-display text-xs normal-case">
                {t("repeat.makeRecurringTitle")}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleMakeRecurring} className="space-y-3">
              <RepeatConfigFields
                idPrefix={`make-recurring-${item.id}`}
                mode={repeatMode}
                onModeChange={setRepeatMode}
                startYearMonth={startYearMonth}
                onStartYearMonthChange={setStartYearMonth}
                occurrenceCount={occurrenceCount}
                onOccurrenceCountChange={setOccurrenceCount}
                endYearMonth={endYearMonth}
                onEndYearMonthChange={setEndYearMonth}
                disabled={loading}
                hideNoneOption
                lockStartMonth
              />
              <DialogFooter className="gap-2 pt-1 sm:justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="pressable focus-ring gap-1"
                  onClick={() => setMakeRecurringOpen(false)}
                  disabled={loading}
                >
                  <Icon name="cancel" size="xs" />
                  {t("common.cancel")}
                </Button>
                <Button
                  type="submit"
                  variant="default"
                  size="sm"
                  className="pressable focus-ring gap-1"
                  disabled={loading || repeatMode === "none"}
                >
                  {loading ? <Spinner className="size-4" /> : <Icon name="repeat" size="xs" />}
                  {t("repeat.makeRecurringSubmit")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  const isIncome = item.type === "income";

  return (
    <div className="interactive-row flex items-start justify-between gap-2 px-2 py-2">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-body min-w-0 break-words font-semibold">{item.label}</span>
        <span className="flex flex-wrap items-center gap-1">
          <TypeBadge item={item} />
          <RepeatBadge item={item} />
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
            onClick={() => setEditing(true)}
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
                setScopeDialogMode("delete");
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
        open={scopeDialogMode === "delete"}
        onOpenChange={(open) => {
          if (!open) {
            setScopeDialogMode(null);
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
  addItemTestId?: string;
}

export function CategorySection({
  category,
  yearMonth,
  onAddItem,
  addItemTestId,
}: CategorySectionProps) {
  const { t } = useTranslation();
  const formatMoney = useFormatCurrency();
  const iconName = resolveCategoryIcon(category.icon);
  const hasContent = category.lineItems.length > 0;
  const categoryTotal = sumCategoryAmounts(category);
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
              <LineItemRow key={item.id} item={item} yearMonth={yearMonth} />
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

function sumCategoryAmounts(category: Category): number {
  return category.lineItems.reduce((sum, item) => {
    const amount = item.displayAmount;
    return sum + (item.type === "income" ? amount : -amount);
  }, 0);
}
