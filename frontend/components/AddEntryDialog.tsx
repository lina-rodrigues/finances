"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { Button } from "@/components/ui/pixelact-ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/pixelact-ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/pixelact-ui/dialog";
import { Input } from "@/components/ui/pixelact-ui/input";
import { Spinner } from "@/components/ui/pixelact-ui/spinner";
import { addLineItemEntry, getLocaleTag, type LineItem } from "@/lib/api";
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
import { formatLineItemEntryDisplay } from "@/lib/lineItemAmounts";
import { useFormatCurrency } from "@/lib/useFormatCurrency";
import { useMutationFeedback } from "@/lib/useMutationFeedback";

interface AddEntryDialogProps {
  item: LineItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatEntryDate(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
  }).format(new Date(iso));
}

export function AddEntryDialog({
  item,
  open,
  onOpenChange,
}: AddEntryDialogProps) {
  const router = useRouter();
  const { t, locale } = useTranslation();
  const formatMoney = useFormatCurrency();
  const monthView = useMonthView();
  const { setFromServer, replaceLineItem } = useMonthViewActions();
  const { runOptimistic } = useMutationFeedback();
  const amountFieldId = useId();
  const amountInputRef = useRef<HTMLInputElement>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [recentOpen, setRecentOpen] = useState(false);

  const localeTag = getLocaleTag(locale);
  const recentEntries = item ? [...(item.entries ?? [])].slice(-3).reverse() : [];
  const amountClass = item?.type === "income" ? "text-income" : "text-expense";

  useEffect(() => {
    if (!open) {
      setAmount("");
      setNote("");
      setRecentOpen(false);
      return;
    }

    const timer = window.setTimeout(() => amountInputRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [open, item?.id]);

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
    const tempEntry = {
      id: createTempEntryId(),
      amount: parsedAmount,
      note: trimmedNote.length > 0 ? trimmedNote : null,
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
          const response = await addLineItemEntry(item.id, {
            amount: parsedAmount,
            ...(trimmedNote.length > 0 ? { note: trimmedNote } : {}),
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
        data-testid="add-entry-dialog"
        className="max-h-[85dvh] overflow-x-hidden overflow-y-auto"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          amountInputRef.current?.focus();
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-display text-xs normal-case">
            {t("entries.addTitle")}
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

          {recentEntries.length > 0 && (
            <Collapsible open={recentOpen} onOpenChange={setRecentOpen}>
              <CollapsibleTrigger asChild>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="pressable focus-ring h-auto p-0 text-sm"
                >
                  <Icon name="chevronDown" size="xs" />
                  {t("entries.recentEntries")}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 pt-2">
                {recentEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-start justify-between gap-2 rounded-sm bg-muted px-2 py-1.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className={`text-amount text-sm ${amountClass}`}>
                        {item &&
                          formatLineItemEntryDisplay(item.type, entry.amount, formatMoney)}
                      </p>
                      {entry.note && (
                        <p className="text-body text-muted-finance truncate text-xs">{entry.note}</p>
                      )}
                    </div>
                    <span className="text-body shrink-0 text-xs text-muted-finance">
                      {formatEntryDate(entry.createdAt, localeTag)}
                    </span>
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}

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
              {loading ? <Spinner className="size-4" /> : <Icon name="add" size="xs" />}
              {t("entries.addSubmit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
