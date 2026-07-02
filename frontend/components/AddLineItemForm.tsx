"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/Icon";
import { Badge } from "@/components/ui/pixelact-ui/badge";
import { Button } from "@/components/ui/pixelact-ui/button";
import { Input } from "@/components/ui/pixelact-ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/pixelact-ui/select";
import { Spinner } from "@/components/ui/pixelact-ui/spinner";
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
      <Button
        type="button"
        variant="link"
        size="sm"
        className="btn-add-item focus-ring mt-1 gap-1"
        onClick={() => setOpen(true)}
      >
        <Icon name="add" size="xs" />
        Add item
      </Button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="fade-in mt-2 flex flex-wrap items-end gap-2 bg-muted p-3"
    >
      <Select value={type} onValueChange={(v) => setType(v as LineItemType)} disabled={loading}>
        <SelectTrigger className="w-28" size="sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="expense">Expense</SelectItem>
          <SelectItem value="income">Income</SelectItem>
        </SelectContent>
      </Select>
      <Input
        className="min-w-0 flex-1"
        placeholder="Label"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        required
        disabled={loading}
      />
      <Input
        className="w-24"
        type="number"
        step="0.01"
        placeholder="Planned"
        value={plannedAmount}
        onChange={(e) => setPlannedAmount(e.target.value)}
        required
        disabled={loading}
      />
      <Input
        className="w-24"
        type="number"
        step="0.01"
        placeholder="Realized"
        value={realizedAmount}
        onChange={(e) => setRealizedAmount(e.target.value)}
        disabled={loading}
      />
      <Button type="submit" variant="default" size="sm" className="pressable focus-ring gap-1" disabled={loading}>
        {loading ? <Spinner className="size-4" /> : <Icon name="add" size="xs" />}
        Add
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="pressable focus-ring gap-1"
        onClick={() => setOpen(false)}
        disabled={loading}
      >
        <Icon name="cancel" size="xs" />
        Cancel
      </Button>
    </form>
  );
}
