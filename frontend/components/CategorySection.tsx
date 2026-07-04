"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BudgetBar, computeBudgetTotals } from "@/components/BudgetBar";
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
    <Badge className={isIncome ? "bg-income-subtle text-foreground" : "bg-expense-subtle text-foreground"}>
      <span className="flex items-center gap-1">
        <Icon name={isIncome ? "income" : "expense"} size="xs" />
        {item.type}
      </span>
    </Badge>
  );
}

export function LineItemRow({ item }: LineItemRowProps) {
  const router = useRouter();
  const { loading, run } = useMutationFeedback();
  const [editing, setEditing] = useState(false);
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
    if (!confirm("Delete this line item?")) return;
    await run(
      async () => {
        await deleteLineItem(item.id);
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
    <div className="interactive-row flex flex-col gap-2 px-2 py-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <TypeBadge item={item} />
        <span className="text-body min-w-0 break-words">{item.label}</span>
        {!item.isRealized && (
          <Badge variant="outline" className="bg-planned-subtle text-foreground">
            <span className="flex items-center gap-1">
              <Icon name="planned" size="xs" />
              planned
            </span>
          </Badge>
        )}
      </div>
      <div className="flex shrink-0 items-center justify-between gap-2 sm:justify-end">
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
            onClick={handleDelete}
            disabled={loading}
            aria-label="Delete line item"
          >
            <Icon name="delete" size="xs" colorClass="text-destructive" />
          </Button>
        </div>
      </div>
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

  return (
    <Collapsible defaultOpen className="mb-3">
      <Card>
        <CollapsibleTrigger className="w-full cursor-pointer px-4 py-3 text-left">
          <div className="flex w-full flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
            <span className="flex min-w-0 items-center gap-2">
              <span className="icon-slot shrink-0">
                <Icon name={iconName} size="sm" />
              </span>
              <span className="text-display truncate text-xs normal-case">{category.name}</span>
            </span>
            {hasContent && (
              <span className="text-amount shrink-0 text-sm text-muted-finance sm:text-right">
                {formatCurrency(categoryTotal)}
              </span>
            )}
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-1 pt-0">
            {hasContent && <BudgetBar plannedTotal={plannedTotal} realizedTotal={realizedTotal} />}
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
