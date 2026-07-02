"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/Icon";
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
    <span
      className={`badge badge-sm gap-1 ${isIncome ? "badge-success bg-income-subtle" : "badge-error bg-expense-subtle"}`}
    >
      <Icon name={isIncome ? "income" : "expense"} size="xs" />
      {item.type}
    </span>
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
      <div className="fade-in flex flex-wrap items-center gap-2 rounded-lg bg-base-200 p-2">
        <input
          className="input input-bordered input-sm focus-ring flex-1"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          disabled={loading}
        />
        <input
          className="input input-bordered input-sm focus-ring w-24"
          type="number"
          step="0.01"
          placeholder="Planned"
          value={plannedAmount}
          onChange={(e) => setPlannedAmount(e.target.value)}
          disabled={loading}
        />
        <input
          className="input input-bordered input-sm focus-ring w-24"
          type="number"
          step="0.01"
          placeholder="Realized"
          value={realizedAmount}
          onChange={(e) => setRealizedAmount(e.target.value)}
          disabled={loading}
        />
        <button
          className={`btn btn-primary btn-sm pressable focus-ring ${loading ? "loading" : ""}`}
          onClick={handleSave}
          disabled={loading}
        >
          {!loading && <Icon name="save" size="xs" className="mr-1" colorClass="text-primary-content" />}
          Save
        </button>
        <button
          className="btn btn-ghost btn-sm pressable focus-ring"
          onClick={() => setEditing(false)}
          disabled={loading}
        >
          <Icon name="cancel" size="xs" className="mr-1" />
          Cancel
        </button>
      </div>
    );
  }

  const isIncome = item.type === "income";

  return (
    <div className="interactive-row flex items-center justify-between gap-2 px-2 py-1">
      <div className="flex items-center gap-2">
        <TypeBadge item={item} />
        <span>{item.label}</span>
        {!item.isRealized && (
          <span className="badge badge-warning badge-outline badge-sm gap-1 bg-planned-subtle">
            <Icon name="planned" size="xs" />
            planned
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span className={`text-amount ${isIncome ? "text-income" : "text-expense"}`}>
          {isIncome ? "+" : "-"}
          {formatCurrency(item.displayAmount)}
        </span>
        <div className="row-actions flex items-center gap-1">
          <button
            className="btn btn-ghost btn-xs pressable focus-ring"
            onClick={() => setEditing(true)}
            aria-label="Edit line item"
          >
            <Icon name="edit" size="xs" />
          </button>
          <button
            className="btn btn-ghost btn-xs text-error pressable focus-ring"
            onClick={handleDelete}
            disabled={loading}
            aria-label="Delete line item"
          >
            <Icon name="delete" size="xs" />
          </button>
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

  return (
    <div className="collapse collapse-arrow collapse-open collapse-smooth bg-base-100 mb-2 shadow-sm">
      <input type="checkbox" defaultChecked aria-label={`Toggle ${category.name}`} />
      <div className="collapse-title font-medium">
        <div className="flex w-full items-center justify-between pr-8">
          <span className="flex items-center gap-2">
            <Icon name={iconName} size="sm" />
            {category.name}
          </span>
          {hasContent && (
            <span className="text-amount text-sm text-muted-finance">
              {formatCurrency(categoryTotal)}
            </span>
          )}
        </div>
      </div>
      <div className="collapse-content space-y-1">
        {category.lineItems.map((item) => (
          <LineItemRow key={item.id} item={item} />
        ))}
        <AddLineItemForm categoryId={category.id} yearMonth={yearMonth} />
      </div>
    </div>
  );
}

function sumCategoryAmounts(category: Category): number {
  return category.lineItems.reduce((sum, item) => {
    const amount = item.displayAmount;
    return sum + (item.type === "income" ? amount : -amount);
  }, 0);
}
