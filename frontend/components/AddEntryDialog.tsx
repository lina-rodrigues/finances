"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import {
  addLineItemEntry,
  updateLineItemEntry,
  type LineItem,
  type LineItemEntry,
} from "@/lib/api";
import { backgroundReconcile } from "@/lib/backgroundReconcile";
import {
  buildOptimisticAddEntry,
  buildOptimisticUpdateEntry,
  createTempEntryId,
  extractLineItemSeriesMeta,
  toLineItemFromMutation,
} from "@/lib/lineItemMappers";
import { useTranslation } from "@/lib/i18n";
import {
  captureMonthViewState,
  useMonthView,
  useMonthViewActions,
} from "@/lib/MonthViewProvider";
import { useMutationFeedback } from "@/lib/useMutationFeedback";

import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Spinner,
  Icon,
} from "@lina-rodrigues/cotton-candy";

interface AddEntryDialogProps {
  item: LineItem | null;
  entry?: LineItemEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddEntryDialog({
  item,
  entry = null,
  open,
  onOpenChange,
}: AddEntryDialogProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const monthView = useMonthView();
  const { setFromServer, replaceLineItem } = useMonthViewActions();
  const { runOptimistic } = useMutationFeedback();
  const amountFieldId = useId();
  const amountInputRef = useRef<HTMLInputElement>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const isEdit = entry !== null;

  useEffect(() => {
    if (!open) {
      setAmount("");
      setNote("");
      return;
    }

    if (entry) {
      setAmount(String(entry.amount));
      setNote(entry.note ?? "");
    } else {
      setAmount("");
      setNote("");
    }

    const timer = window.setTimeout(() => amountInputRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [open, item?.id, entry?.id]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!item) {
      return;
    }

    const parsedAmount = Number.parseFloat(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount === 0) {
      return;
    }

    const trimmedNote = note.trim();
    const nextNote = trimmedNote.length > 0 ? trimmedNote : null;

    setLoading(true);
    try {
      if (isEdit && entry) {
        const previousNote = entry.note;
        const patch: { amount: number; note?: string | null } = {
          amount: parsedAmount,
        };
        if (nextNote !== previousNote) {
          patch.note = nextNote;
        }

        await runOptimistic({
          snapshot: () => captureMonthViewState(monthView),
          apply: () => {
            replaceLineItem(
              item.id,
              buildOptimisticUpdateEntry(item, entry.id, {
                amount: parsedAmount,
                note: nextNote,
              }),
            );
            onOpenChange(false);
          },
          mutate: async () => {
            const response = await updateLineItemEntry(item.id, entry.id, patch);
            replaceLineItem(
              item.id,
              toLineItemFromMutation(response.lineItem, extractLineItemSeriesMeta(item)),
            );
          },
          reconcile: () => backgroundReconcile(router),
          rollback: (snapshot) => setFromServer(snapshot),
          successMessage: t("entries.updated"),
        });
        return;
      }

      const tempEntry = {
        id: createTempEntryId(),
        amount: parsedAmount,
        note: nextNote,
        createdAt: new Date().toISOString(),
      };

      await runOptimistic({
        snapshot: () => captureMonthViewState(monthView),
        apply: () => {
          replaceLineItem(item.id, buildOptimisticAddEntry(item, tempEntry));
          onOpenChange(false);
        },
        mutate: async () => {
          const response = await addLineItemEntry(item.id, {
            amount: parsedAmount,
            ...(nextNote ? { note: nextNote } : {}),
          });
          replaceLineItem(
            item.id,
            toLineItemFromMutation(response.lineItem, extractLineItemSeriesMeta(item)),
          );
        },
        reconcile: () => backgroundReconcile(router),
        rollback: (snapshot) => setFromServer(snapshot),
        successMessage: t("entries.added"),
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid={isEdit ? "edit-entry-dialog" : "add-entry-dialog"}
        className="max-h-[85dvh] overflow-x-hidden overflow-y-auto"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          amountInputRef.current?.focus();
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-display text-xs normal-case">
            {t(isEdit ? "entries.editEntryTitle" : "entries.addTitle")}
          </DialogTitle>
          {item && (
            <p className="text-body text-muted-finance pt-1 text-sm">{item.label}</p>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="finance-dialog-form space-y-3">
          <div className="space-y-1">
            <label htmlFor={amountFieldId} className="text-body text-sm font-semibold">
              {t("entries.addAmount")}
            </label>
            <div className="finance-dialog-field">
              <Input
                ref={amountInputRef}
                id={amountFieldId}
                type="number"
                step="0.01"
                placeholder={t("entries.addAmount")}
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor={`${amountFieldId}-note`} className="text-body text-sm font-semibold">
              {t("entries.addNote")}
            </label>
            <div className="finance-dialog-field">
              <Input
                id={`${amountFieldId}-note`}
                placeholder={t("entries.addNote")}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 border-t border-border pt-3 sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="pressable focus-ring gap-1"
              onClick={() => onOpenChange(false)}
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
              disabled={loading}
            >
              {loading ? (
                <Spinner className="size-4" />
              ) : (
                <Icon name={isEdit ? "save" : "add"} size="xs" />
              )}
              {t(isEdit ? "entries.editSubmit" : "entries.addSubmit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
