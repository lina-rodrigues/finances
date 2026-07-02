"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/Icon";
import { createLineItem, type LineItemType } from "@/lib/api";
import { useMutationFeedback } from "@/lib/useMutationFeedback";

interface AddLineItemFormProps {
  categoryId: string;
  yearMonth: string;
}

export function AddLineItemForm({ categoryId, yearMonth }: AddLineItemFormProps) {
  const router = useRouter();
  const { loading, run } = useMutationFeedback();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<LineItemType>("expense");
  const [label, setLabel] = useState("");
  const [plannedAmount, setPlannedAmount] = useState("");
  const [realizedAmount, setRealizedAmount] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!label || !plannedAmount) return;

    await run(
      async () => {
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
      },
      { successMessage: "Line item added" },
    );
  }

  if (!open) {
    return (
      <button
        className="btn btn-ghost btn-xs btn-add-item focus-ring mt-1 gap-1"
        onClick={() => setOpen(true)}
      >
        <Icon name="add" size="xs" />
        Add item
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="fade-in mt-2 flex flex-wrap items-end gap-2 rounded-lg bg-base-200 p-2"
    >
      <select
        className="select select-bordered select-sm focus-ring"
        value={type}
        onChange={(e) => setType(e.target.value as LineItemType)}
        disabled={loading}
      >
        <option value="expense">Expense</option>
        <option value="income">Income</option>
      </select>
      <input
        className="input input-bordered input-sm focus-ring flex-1"
        placeholder="Label"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        required
        disabled={loading}
      />
      <input
        className="input input-bordered input-sm focus-ring w-24"
        type="number"
        step="0.01"
        placeholder="Planned"
        value={plannedAmount}
        onChange={(e) => setPlannedAmount(e.target.value)}
        required
        disabled={loading}
      />
      <input
        className="input input-bordered input-sm focus-ring w-24"
        type="number"
        step="0.01"
        placeholder="Realized (optional)"
        value={realizedAmount}
        onChange={(e) => setRealizedAmount(e.target.value)}
        disabled={loading}
      />
      <button
        type="submit"
        className={`btn btn-primary btn-sm pressable focus-ring ${loading ? "loading" : ""}`}
        disabled={loading}
      >
        {!loading && <Icon name="add" size="xs" className="mr-1" colorClass="text-primary-content" />}
        Add
      </button>
      <button
        type="button"
        className="btn btn-ghost btn-sm pressable focus-ring"
        onClick={() => setOpen(false)}
        disabled={loading}
      >
        <Icon name="cancel" size="xs" className="mr-1" />
        Cancel
      </button>
    </form>
  );
}
