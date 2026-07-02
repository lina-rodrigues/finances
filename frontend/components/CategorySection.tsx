"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  createLineItem,
  deleteLineItem,
  formatCurrency,
  updateLineItem,
  type CategoryNode,
  type LineItem,
  type LineItemType,
} from "@/lib/api";
import { AddLineItemForm } from "./AddLineItemForm";

interface LineItemRowProps {
  item: LineItem;
  yearMonth: string;
}

export function LineItemRow({ item, yearMonth }: LineItemRowProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(item.label);
  const [plannedAmount, setPlannedAmount] = useState(String(item.plannedAmount));
  const [realizedAmount, setRealizedAmount] = useState(
    item.realizedAmount !== null ? String(item.realizedAmount) : "",
  );
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await updateLineItem(item.id, {
        label,
        plannedAmount: parseFloat(plannedAmount),
        realizedAmount: realizedAmount === "" ? null : parseFloat(realizedAmount),
      });
      setEditing(false);
      router.refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this line item?")) return;
    try {
      await deleteLineItem(item.id);
      router.refresh();
    } catch (err) {
      console.error(err);
    }
  }

  if (editing) {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-lg bg-base-200 p-2">
        <input
          className="input input-bordered input-sm flex-1"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
        <input
          className="input input-bordered input-sm w-24"
          type="number"
          step="0.01"
          placeholder="Planned"
          value={plannedAmount}
          onChange={(e) => setPlannedAmount(e.target.value)}
        />
        <input
          className="input input-bordered input-sm w-24"
          type="number"
          step="0.01"
          placeholder="Realized"
          value={realizedAmount}
          onChange={(e) => setRealizedAmount(e.target.value)}
        />
        <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
          Save
        </button>
        <button className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg px-2 py-1 hover:bg-base-200">
      <div className="flex items-center gap-2">
        <span
          className={`badge badge-sm ${item.type === "income" ? "badge-success" : "badge-error"}`}
        >
          {item.type}
        </span>
        <span>{item.label}</span>
        {!item.isRealized && (
          <span className="badge badge-warning badge-outline badge-sm">planned</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span
          className={`font-mono ${item.type === "income" ? "text-success" : "text-error"}`}
        >
          {item.type === "income" ? "+" : "-"}
          {formatCurrency(item.displayAmount)}
        </span>
        <button className="btn btn-ghost btn-xs" onClick={() => setEditing(true)}>
          Edit
        </button>
        <button className="btn btn-ghost btn-xs text-error" onClick={handleDelete}>
          Delete
        </button>
      </div>
    </div>
  );
}

interface CategorySectionProps {
  category: CategoryNode;
  yearMonth: string;
  depth?: number;
}

export function CategorySection({ category, yearMonth, depth = 0 }: CategorySectionProps) {
  const hasContent = category.lineItems.length > 0 || category.children.length > 0;
  const categoryTotal = sumCategoryAmounts(category);

  return (
    <div className={depth > 0 ? "ml-4 border-l border-base-300 pl-3" : ""}>
      <details className="collapse collapse-arrow bg-base-100 mb-2 shadow-sm" open={depth === 0}>
        <summary className="collapse-title font-medium flex items-center justify-between pr-12">
          <span>{category.name}</span>
          {hasContent && (
            <span className="font-mono text-sm opacity-70">{formatCurrency(categoryTotal)}</span>
          )}
        </summary>
        <div className="collapse-content space-y-1">
          {category.lineItems.map((item) => (
            <LineItemRow key={item.id} item={item} yearMonth={yearMonth} />
          ))}
          {category.children.map((child) => (
            <CategorySection
              key={child.id}
              category={child}
              yearMonth={yearMonth}
              depth={depth + 1}
            />
          ))}
          <AddLineItemForm categoryId={category.id} yearMonth={yearMonth} />
        </div>
      </details>
    </div>
  );
}

function sumCategoryAmounts(category: CategoryNode): number {
  let total = category.lineItems.reduce((sum, item) => {
    const amount = item.displayAmount;
    return sum + (item.type === "income" ? amount : -amount);
  }, 0);

  for (const child of category.children) {
    total += sumCategoryAmounts(child);
  }

  return total;
}
