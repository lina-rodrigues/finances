"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BudgetBar, computeBudgetTotals } from "@/components/BudgetBar";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Icon } from "@/components/Icon";
import { Badge } from "@/components/ui/pixelact-ui/badge";
import { Button } from "@/components/ui/pixelact-ui/button";
import { Card, CardContent } from "@/components/ui/pixelact-ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/pixelact-ui/collapsible";
import { Input } from "@/components/ui/pixelact-ui/input";
import { Spinner } from "@/components/ui/pixelact-ui/spinner";
import {
  deleteLineItem,
  formatCurrency,
  updateLineItem,
  type Category,
  type LineItem,
} from "@/lib/api";
import { resolveCategoryIcon } from "@/lib/icons";
import { useMutationFeedback } from "@/lib/useMutationFeedback";
import { AddLineItemForm } from "./AddLineItemForm";

interface LineItemRowProps {
  item: LineItem;
}

function TypeBadge({ item }: { item: LineItem }) {
  const isIncome = item.type === "income";
  return (
    <Badge
      font="normal"
      className={`h-4 px-1.5 text-[0.625rem] ${isIncome ? "bg-income-subtle text-foreground" : "bg-expense-subtle text-foreground"}`}
    >
      <span className="flex items-center gap-1">
        <Icon name={isIncome ? "income" : "expense"} size="xs" />
        {item.type}
      </span>
    </Badge>
  );
}

function LineItemRow({ item }: LineItemRowProps) {
  const router = useRouter();
  const { loading, run } = useMutationFeedback();
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [label, setLabel] = useState(item.label);
  const [plannedAmount, setPlannedAmount] = useState(String(item.plannedAmount));
  const [realizedAmount, setRealizedAmount] = useState(
    item.realizedAmount !== null ? String(item.realizedAmount) : "",
  );

  async function handleSave() {
    await run(
      async () => {
        await updateLineItem(item.id, {
          label,
          plannedAmount: parseFloat(plannedAmount),
          realizedAmount: realizedAmount === "" ? null : parseFloat(realizedAmount),
        });
        setEditing(false);
        router.refresh();
      },
      { successMessage: "Line item updated" },
    );
  }

  async function handleDelete() {
    await run(
      async () => {
        await deleteLineItem(item.id);
        setConfirmingDelete(false);
        router.refresh();
      },
      { successMessage: "Line item deleted" },
    );
  }

  if (editing) {
    return (
      <div className="fade-in finance-form bg-muted p-3">
        <Input
          className="finance-form-field-grow"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          disabled={loading}
          placeholder="Label"
        />
        <Input
          className="finance-form-field-sm"
          type="number"
          step="0.01"
          placeholder="Planned"
          value={plannedAmount}
          onChange={(e) => setPlannedAmount(e.target.value)}
          disabled={loading}
        />
        <Input
          className="finance-form-field-sm"
          type="number"
          step="0.01"
          placeholder="Realized"
          value={realizedAmount}
          onChange={(e) => setRealizedAmount(e.target.value)}
          disabled={loading}
        />
        <div className="finance-form-actions">
          <Button
            variant="default"
            size="sm"
            className="pressable focus-ring gap-1"
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? <Spinner className="size-4" /> : <Icon name="save" size="xs" />}
            Save
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="pressable focus-ring gap-1"
            onClick={() => setEditing(false)}
            disabled={loading}
          >
            <Icon name="cancel" size="xs" />
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  const isIncome = item.type === "income";

  return (
    <div className="interactive-row flex items-start justify-between gap-2 px-2 py-2">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-body min-w-0 break-words font-semibold">{item.label}</span>
        <span className="flex flex-wrap items-center gap-1">
          <TypeBadge item={item} />
          {!item.isRealized && (
            <Badge
              font="normal"
              variant="outline"
              className="bg-planned-subtle h-4 px-1.5 text-[0.625rem] text-foreground"
            >
              <span className="flex items-center gap-1">
                <Icon name="planned" size="xs" />
                planned
              </span>
            </Badge>
          )}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className={`text-amount ${isIncome ? "text-income" : "text-expense"}`}>
          {isIncome ? "+" : "-"}
          {formatCurrency(item.displayAmount)}
        </span>
        <div className="row-actions flex items-center gap-1">
          <Button
            type="button"
            variant="link"
            size="sm"
            className="pressable focus-ring h-auto p-1"
            onClick={() => setEditing(true)}
            aria-label="Edit line item"
          >
            <Icon name="edit" size="xs" />
          </Button>
          <Button
            type="button"
            variant="link"
            size="sm"
            className="pressable focus-ring h-auto p-1 text-destructive"
            onClick={() => setConfirmingDelete(true)}
            disabled={loading}
            aria-label="Delete line item"
          >
            <Icon name="delete" size="xs" colorClass="text-destructive" />
          </Button>
        </div>
      </div>
      <ConfirmDialog
        open={confirmingDelete}
        onOpenChange={setConfirmingDelete}
        title="Delete line item?"
        description={`"${item.label}" will be removed from this month.`}
        loading={loading}
        onConfirm={handleDelete}
      />
    </div>
  );
}

interface CategorySectionProps {
  category: Category;
  yearMonth: string;
}

export function CategorySection({ category, yearMonth }: CategorySectionProps) {
  const iconName = resolveCategoryIcon(category.icon);
  const hasContent = category.lineItems.length > 0;
  const categoryTotal = sumCategoryAmounts(category);
  const { plannedTotal, realizedTotal } = computeBudgetTotals(category.lineItems);

  const totalClass =
    categoryTotal > 0 ? "text-income" : categoryTotal < 0 ? "text-expense" : "text-muted-finance";
  const totalLabel = `${categoryTotal > 0 ? "+" : categoryTotal < 0 ? "-" : ""}${formatCurrency(
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
              <h3 className="text-display truncate text-xs normal-case">{category.name}</h3>
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
              <p className="text-body text-muted-finance px-2 text-sm">Nothing planned yet.</p>
            )}
            {category.lineItems.map((item) => (
              <LineItemRow key={item.id} item={item} />
            ))}
            <AddLineItemForm categoryId={category.id} yearMonth={yearMonth} />
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
