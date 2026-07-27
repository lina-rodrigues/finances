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
  const amountFieldId = useId();
  const amountInputRef = useRef<HTMLInputElement>(null);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !item) {
      setAmount("");
      return;
    }

    const defaultAmount = payDefaultAmount(item);
    setAmount(defaultAmount !== null ? String(defaultAmount) : "");

    const timer = window.setTimeout(() => {
      const input = amountInputRef.current;
      if (!input) {
        return;
      }
      input.focus();
      input.select();
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid="pay-entry-dialog"
        className="max-h-[85dvh] overflow-x-hidden overflow-y-auto"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          amountInputRef.current?.focus();
          amountInputRef.current?.select();
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-display text-xs normal-case">
            {t("entries.payTitle")}
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
                onFocus={(event) => event.target.select()}
                required
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
              {loading ? <Spinner className="size-4" /> : <Icon name="pay" size="xs" />}
              {t("entries.pay")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
