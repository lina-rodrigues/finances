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
import { useWaDialogAfterHide } from "@/lib/useWaDialogAfterHide";

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
  const formId = useId();
  const amountFieldId = useId();
  const amountInputRef = useRef<HTMLElement | null>(null);
  const dialogRef = useRef<HTMLElement | null>(null);
  useWaDialogAfterHide(dialogRef, open, onOpenChange);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const isEdit = entry !== null;
  const title = t(isEdit ? "entries.editEntryTitle" : "entries.addTitle");

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
    <wa-dialog
      ref={dialogRef}
      label={title}
      open={open || undefined}
      light-dismiss
      data-testid={isEdit ? "edit-entry-dialog" : "add-entry-dialog"}
      style={{ "--width": "32rem" } as React.CSSProperties}
    >
      {item ? (
        <p className="wa-caption-l wa-color-text-quiet" style={{ margin: "0 0 var(--wa-space-m)" }}>
          {item.label}
        </p>
      ) : null}

      <form id={formId} onSubmit={handleSubmit} className="wa-stack wa-gap-m">
        <wa-input
          ref={amountInputRef}
          id={amountFieldId}
          label={t("entries.addAmount")}
          type="number"
          step="0.01"
          placeholder={t("entries.addAmount")}
          value={amount}
          onInput={(event) => setAmount((event.target as HTMLInputElement).value)}
          required
          disabled={loading || undefined}
        ></wa-input>

        <wa-input
          id={`${amountFieldId}-note`}
          label={t("entries.addNote")}
          placeholder={t("entries.addNote")}
          value={note}
          onInput={(event) => setNote((event.target as HTMLInputElement).value)}
          disabled={loading || undefined}
        ></wa-input>
      </form>

      <div slot="footer" className="wa-cluster wa-gap-s">
        <wa-button
          type="button"
          variant="neutral"
          appearance="outlined"
          size="s"
          disabled={loading || undefined}
          onClick={() => onOpenChange(false)}
        >
          <wa-icon slot="start" name="xmark"></wa-icon>
          {t("common.cancel")}
        </wa-button>
        <wa-button
          type="submit"
          form={formId}
          variant="brand"
          size="s"
          loading={loading || undefined}
          disabled={loading || undefined}
        >
          <wa-icon slot="start" name={isEdit ? "floppy-disk" : "plus"}></wa-icon>
          {t(isEdit ? "entries.editSubmit" : "entries.addSubmit")}
        </wa-button>
      </div>
    </wa-dialog>
  );
}
