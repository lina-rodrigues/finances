"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { addLineItemEntry, type LineItem } from "@/lib/api";
import { backgroundReconcile } from "@/lib/backgroundReconcile";
import {
  buildOptimisticAddEntry,
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
import { payDefaultAmount } from "@/lib/payLineItem";
import { useMutationFeedback } from "@/lib/useMutationFeedback";
import { useWaDialogAfterHide } from "@/lib/useWaDialogAfterHide";

interface PayEntryDialogProps {
  item: LineItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PayEntryDialog({ item, open, onOpenChange }: PayEntryDialogProps) {
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
  const [loading, setLoading] = useState(false);

  const title = t("entries.payTitle");

  useEffect(() => {
    if (!open || !item) {
      setAmount("");
      return;
    }

    const defaultAmount = payDefaultAmount(item);
    setAmount(defaultAmount !== null ? String(defaultAmount) : "");

    const timer = window.setTimeout(() => {
      const input = amountInputRef.current as (HTMLElement & { select?: () => void }) | null;
      if (!input) {
        return;
      }
      input.focus();
      input.select?.();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [open, item?.id, item]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!item) {
      return;
    }

    const parsedAmount = Number.parseFloat(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount === 0) {
      return;
    }

    const tempEntry = {
      id: createTempEntryId(),
      amount: parsedAmount,
      note: null,
      createdAt: new Date().toISOString(),
    };

    setLoading(true);
    try {
      await runOptimistic({
        snapshot: () => captureMonthViewState(monthView),
        apply: () => {
          replaceLineItem(item.id, buildOptimisticAddEntry(item, tempEntry));
          onOpenChange(false);
        },
        mutate: async () => {
          const response = await addLineItemEntry(item.id, { amount: parsedAmount });
          replaceLineItem(
            item.id,
            toLineItemFromMutation(response.lineItem, extractLineItemSeriesMeta(item)),
          );
        },
        reconcile: () => backgroundReconcile(router),
        rollback: (snapshot) => setFromServer(snapshot),
        successMessage: t("entries.paid"),
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
      data-testid="pay-entry-dialog"
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
          onFocus={(event) => {
            const target = event.target as HTMLInputElement & { select?: () => void };
            target.select?.();
          }}
          required
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
          <wa-icon slot="start" name="circle-dollar-to-slot"></wa-icon>
          {t("entries.pay")}
        </wa-button>
      </div>
    </wa-dialog>
  );
}
