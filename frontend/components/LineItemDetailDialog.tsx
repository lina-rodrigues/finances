"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AddEntryDialog } from "@/components/AddEntryDialog";
import { BudgetBar } from "@/components/BudgetBar";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EntryActionsMenu } from "@/components/EntryActionsMenu";
import { LineItemActions } from "@/components/LineItemActions";
import {
  deleteLineItemEntry,
  getLocaleTag,
  type LineItem,
  type LineItemEntry,
} from "@/lib/api";
import type { LineItemActionHandlers } from "@/lib/useLineItemDialogHost";
import { backgroundReconcile } from "@/lib/backgroundReconcile";
import { useTranslation } from "@/lib/i18n";
import {
  buildOptimisticRemoveEntry,
  extractLineItemSeriesMeta,
  toLineItemFromMutation,
} from "@/lib/lineItemMappers";
import { collectAllLineItems } from "@/lib/monthViewMath";
import {
  captureMonthViewState,
  useMonthView,
  useMonthViewActions,
} from "@/lib/MonthViewProvider";
import { formatLineItemEntryDisplay, getLineItemRealizedAmount } from "@/lib/lineItemAmounts";
import { useFormatCurrency } from "@/lib/useFormatCurrency";
import { useMutationFeedback } from "@/lib/useMutationFeedback";

import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Icon,
} from "@lina-rodrigues/cotton-candy";

interface LineItemDetailDialogProps {
  item: LineItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  handlers: LineItemActionHandlers;
  paying?: boolean;
}

function formatEntryDateTime(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function LineItemDetailDialog({
  item,
  open,
  onOpenChange,
  handlers,
  paying = false,
}: LineItemDetailDialogProps) {
  const router = useRouter();
  const { t, locale } = useTranslation();
  const formatMoney = useFormatCurrency();
  const monthView = useMonthView();
  const { setFromServer, replaceLineItem } = useMonthViewActions();
  const { runOptimistic } = useMutationFeedback();
  const localeTag = getLocaleTag(locale);
  const [editingEntry, setEditingEntry] = useState<LineItemEntry | null>(null);
  const [deletingEntry, setDeletingEntry] = useState<LineItemEntry | null>(null);
  const [deleting, setDeleting] = useState(false);

  const liveItem =
    item === null
      ? null
      : collectAllLineItems(monthView.categories, monthView.uncategorized).find(
          (candidate) => candidate.id === item.id,
        ) ?? item;

  useEffect(() => {
    if (!open) {
      setEditingEntry(null);
      setDeletingEntry(null);
    }
  }, [open, item?.id]);

  if (!liveItem) {
    return null;
  }

  const isIncome = liveItem.type === "income";
  const amountClass = isIncome ? "text-income" : "text-expense";
  const amountPrefix = isIncome ? "+" : "-";
  const entries = [...(liveItem.entries ?? [])].reverse();
  const spent = getLineItemRealizedAmount(liveItem);

  async function handleDeleteEntry() {
    if (!liveItem || !deletingEntry) {
      return;
    }

    const entryId = deletingEntry.id;
    setDeleting(true);
    try {
      await runOptimistic({
        snapshot: () => captureMonthViewState(monthView),
        apply: () => {
          replaceLineItem(liveItem.id, buildOptimisticRemoveEntry(liveItem, entryId));
          setDeletingEntry(null);
        },
        mutate: async () => {
          const response = await deleteLineItemEntry(liveItem.id, entryId);
          replaceLineItem(
            liveItem.id,
            toLineItemFromMutation(response, extractLineItemSeriesMeta(liveItem)),
          );
        },
        reconcile: () => backgroundReconcile(router),
        rollback: (snapshot) => setFromServer(snapshot),
        successMessage: t("entries.deleted"),
      });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          data-testid="line-item-detail-dialog"
          className="flex max-h-[85dvh] flex-col overflow-hidden"
        >
          <DialogHeader className="shrink-0">
            <DialogTitle className="text-display text-xs normal-case">
              {t("entries.detailTitle")}
            </DialogTitle>
            <p className="text-body pt-1 text-sm font-semibold">{liveItem.label}</p>
          </DialogHeader>

          <div className="shrink-0 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                font="normal"
                className={`h-5 px-2 text-xs ${isIncome ? "bg-income-subtle text-income" : "bg-expense-subtle text-expense"}`}
              >
                <span className="flex items-center gap-1">
                  <Icon name={isIncome ? "income" : "expense"} size="xs" />
                  {isIncome ? t("categories.income") : t("categories.expense")}
                </span>
              </Badge>
              {liveItem.seriesId && (
                <Badge font="normal" variant="outline" className="bg-muted h-5 px-2 text-xs text-foreground">
                  <span className="flex items-center gap-1">
                    <Icon name="repeat" size="xs" />
                    {t("repeat.badge")}
                  </span>
                </Badge>
              )}
            </div>

            <dl className="grid grid-cols-2 gap-3">
              <div>
                <dt className="text-body text-muted-finance text-xs">{t("entries.plannedLabel")}</dt>
                <dd className={`text-amount text-sm ${amountClass}`}>
                  {amountPrefix}
                  {formatMoney(liveItem.plannedAmount)}
                </dd>
              </div>
              <div>
                <dt className="text-body text-muted-finance text-xs">{t("entries.spentLabel")}</dt>
                <dd className={`text-amount text-sm ${amountClass}`}>
                  {spent === null ? (
                    <span className="text-muted-finance">—</span>
                  ) : (
                    <>
                      {amountPrefix}
                      {formatMoney(spent)}
                    </>
                  )}
                </dd>
              </div>
            </dl>

            {liveItem.plannedAmount > 0 && (
              <BudgetBar
                plannedTotal={liveItem.plannedAmount}
                realizedTotal={spent ?? 0}
              />
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
            <h3 className="text-body mb-2 text-sm font-semibold">{t("entries.detailsTitle")}</h3>
            {entries.length === 0 ? (
              <p className="text-body text-muted-finance text-sm">{t("entries.detailsEmpty")}</p>
            ) : (
              <ul className="space-y-2">
                {entries.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex items-start justify-between gap-2 rounded-sm bg-muted px-2 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className={`text-amount text-sm ${amountClass}`}>
                        {formatLineItemEntryDisplay(liveItem.type, entry.amount, formatMoney)}
                      </p>
                      {entry.note && (
                        <p className="text-body text-muted-finance break-words text-xs">{entry.note}</p>
                      )}
                      <p className="text-body text-muted-finance text-xs">
                        {formatEntryDateTime(entry.createdAt, localeTag)}
                      </p>
                    </div>
                    <EntryActionsMenu
                      onEdit={() => setEditingEntry(entry)}
                      onDelete={() => setDeletingEntry(entry)}
                      disabled={deleting}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>

          <DialogFooter className="shrink-0 flex-col gap-3 border-t border-border pt-3 sm:flex-col sm:items-stretch">
            <LineItemActions
              item={liveItem}
              layout="footer"
              loading={paying}
              onPay={handlers.payItem}
              onAdd={handlers.openAdd}
              onEdit={handlers.openEdit}
              onDelete={handlers.requestDelete}
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="pressable focus-ring w-full gap-1 sm:w-auto sm:self-end"
              onClick={() => onOpenChange(false)}
            >
              <Icon name="cancel" size="xs" />
              {t("common.cancel")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AddEntryDialog
        item={liveItem}
        entry={editingEntry}
        open={editingEntry !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setEditingEntry(null);
          }
        }}
      />

      <ConfirmDialog
        open={deletingEntry !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setDeletingEntry(null);
          }
        }}
        title={t("entries.deleteEntry")}
        description={t("entries.deleteEntryDescription", { label: liveItem.label })}
        loading={deleting}
        onConfirm={() => {
          void handleDeleteEntry();
        }}
      />
    </>
  );
}
