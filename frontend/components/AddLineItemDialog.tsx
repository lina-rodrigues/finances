"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { CategoryCombobox, UNCATEGORIZED_LABEL } from "@/components/CategoryCombobox";
import { Icon } from "@/components/Icon";
import { Button } from "@/components/ui/pixelact-ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/pixelact-ui/dialog";
import { Input } from "@/components/ui/pixelact-ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/pixelact-ui/select";
import { Spinner } from "@/components/ui/pixelact-ui/spinner";
import {
  createCategory,
  createLineItem,
  type FlatCategory,
  type LineItemType,
} from "@/lib/api";
import { useMutationFeedback } from "@/lib/useMutationFeedback";

interface AddLineItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: FlatCategory[];
  yearMonth: string;
  initialCategoryName?: string;
}

function defaultCategoryName(initialCategoryName?: string): string {
  return initialCategoryName ?? UNCATEGORIZED_LABEL;
}

export function AddLineItemDialog({
  open,
  onOpenChange,
  categories,
  yearMonth,
  initialCategoryName,
}: AddLineItemDialogProps) {
  const router = useRouter();
  const { loading, run } = useMutationFeedback();
  const categoryFieldId = useId();
  const labelFieldId = useId();
  const [categoryName, setCategoryName] = useState(defaultCategoryName(initialCategoryName));
  const [type, setType] = useState<LineItemType>("expense");
  const [label, setLabel] = useState("");
  const [plannedAmount, setPlannedAmount] = useState("");
  const [realizedAmount, setRealizedAmount] = useState("");

  useEffect(() => {
    if (open) {
      setCategoryName(defaultCategoryName(initialCategoryName));
      setType("expense");
      setLabel("");
      setPlannedAmount("");
      setRealizedAmount("");
    }
  }, [open, initialCategoryName]);

  async function resolveCategoryId(trimmed: string): Promise<string | null> {
    if (trimmed.toLowerCase() === UNCATEGORIZED_LABEL.toLowerCase()) {
      return null;
    }

    const existing = categories.find((cat) => cat.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      return existing.id;
    }

    const created = await createCategory({ name: trimmed });
    return created.id;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmedCategory = categoryName.trim();
    if (!trimmedCategory || !label || !plannedAmount) {
      return;
    }

    await run(
      async () => {
        const categoryId = await resolveCategoryId(trimmedCategory);
        await createLineItem(yearMonth, {
          categoryId,
          type,
          label,
          plannedAmount: parseFloat(plannedAmount),
          realizedAmount: realizedAmount === "" ? null : parseFloat(realizedAmount),
        });
        onOpenChange(false);
        router.refresh();
      },
      { successMessage: "Line item added" },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid="add-line-item-dialog"
        className="max-h-[85dvh] w-[calc(100%-2rem)] max-w-md overflow-x-hidden overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle className="text-display text-xs normal-case">Add item</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="finance-dialog-form space-y-3">
          <CategoryCombobox
            id={categoryFieldId}
            value={categoryName}
            onChange={setCategoryName}
            categories={categories}
            disabled={loading}
          />

          <div className="space-y-1">
            <label htmlFor={`${categoryFieldId}-type`} className="text-body text-sm font-semibold">
              Type
            </label>
            <div className="finance-dialog-field">
              <Select value={type} onValueChange={(value) => setType(value as LineItemType)} disabled={loading}>
                <SelectTrigger id={`${categoryFieldId}-type`} size="sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor={labelFieldId} className="text-body text-sm font-semibold">
              Label
            </label>
            <div className="finance-dialog-field">
              <Input
                id={labelFieldId}
                placeholder="Label"
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor={`${labelFieldId}-planned`} className="text-body text-sm font-semibold">
              Planned
            </label>
            <div className="finance-dialog-field">
              <Input
                id={`${labelFieldId}-planned`}
                type="number"
                step="0.01"
                placeholder="Planned"
                value={plannedAmount}
                onChange={(event) => setPlannedAmount(event.target.value)}
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor={`${labelFieldId}-realized`} className="text-body text-sm font-semibold">
              Realized
            </label>
            <div className="finance-dialog-field">
              <Input
                id={`${labelFieldId}-realized`}
                type="number"
                step="0.01"
                placeholder="Realized"
                value={realizedAmount}
                onChange={(event) => setRealizedAmount(event.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 pt-1 sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="pressable focus-ring gap-1"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              <Icon name="cancel" size="xs" />
              Cancel
            </Button>
            <Button
              type="submit"
              variant="default"
              size="sm"
              className="pressable focus-ring gap-1"
              disabled={loading}
            >
              {loading ? <Spinner className="size-4" /> : <Icon name="add" size="xs" />}
              Add
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
