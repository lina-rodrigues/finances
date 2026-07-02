"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createLineItem, type LineItemType } from "@/lib/api";

interface AddLineItemFormProps {
  categoryId: string;
  yearMonth: string;
}

export function AddLineItemForm({ categoryId, yearMonth }: AddLineItemFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<LineItemType>("expense");
  const [label, setLabel] = useState("");
  const [plannedAmount, setPlannedAmount] = useState("");
  const [realizedAmount, setRealizedAmount] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!label || !plannedAmount) return;

    setSaving(true);
    try {
      await createLineItem(yearMonth, {
        categoryId,
        type,
        label,
        plannedAmount: parseFloat(plannedAmount),
        realizedAmount: realizedAmount === "" ? null : parseFloat(realizedAmount),
      });
      setLabel("");
      setPlannedAmount("");
      setRealizedAmount("");
      setOpen(false);
      router.refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button className="btn btn-ghost btn-xs mt-1" onClick={() => setOpen(true)}>
        + Add item
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 flex flex-wrap items-end gap-2 rounded-lg bg-base-200 p-2">
      <select
        className="select select-bordered select-sm"
        value={type}
        onChange={(e) => setType(e.target.value as LineItemType)}
      >
        <option value="expense">Expense</option>
        <option value="income">Income</option>
      </select>
      <input
        className="input input-bordered input-sm flex-1"
        placeholder="Label"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        required
      />
      <input
        className="input input-bordered input-sm w-24"
        type="number"
        step="0.01"
        placeholder="Planned"
        value={plannedAmount}
        onChange={(e) => setPlannedAmount(e.target.value)}
        required
      />
      <input
        className="input input-bordered input-sm w-24"
        type="number"
        step="0.01"
        placeholder="Realized (optional)"
        value={realizedAmount}
        onChange={(e) => setRealizedAmount(e.target.value)}
      />
      <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
        Add
      </button>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>
        Cancel
      </button>
    </form>
  );
}
