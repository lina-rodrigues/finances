"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AddEntryDialog } from "@/components/AddEntryDialog";
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
import { getSeriesBadgeLabel } from "@/lib/recurrence";
import { useFormatCurrency } from "@/lib/useFormatCurrency";
import { useMutationFeedback } from "@/lib/useMutationFeedback";

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
  const dialogRef = useRef<HTMLElement | null>(null);
  const openRef = useRef(open);
  openRef.current = open;
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
    const el = dialogRef.current;
    if (!el) return;
    const onAfterHide = () => {
      if (openRef.current) onOpenChange(false);
    };
    el.addEventListener("wa-after-hide", onAfterHide);
    return () => el.removeEventListener("wa-after-hide", onAfterHide);
  }, [onOpenChange]);

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
  const amountClass = isIncome ? "metric-amount--income" : "metric-amount--expense";
  const amountPrefix = isIncome ? "+" : "-";
  const entries = [...(liveItem.entries ?? [])].reverse();
  const spent = getLineItemRealizedAmount(liveItem);
  const seriesBadge = getSeriesBadgeLabel(liveItem, localeTag);

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
      <wa-dialog
        ref={dialogRef}
        label={t("entries.detailTitle")}
        open={open || undefined}
        light-dismiss
        data-testid="line-item-detail-dialog"
        style={{ "--width": "32rem" } as React.CSSProperties}
      >
        <div className="wa-stack wa-gap-m">
          <p style={{ margin: 0, fontWeight: 600 }}>{liveItem.label}</p>

          <div className="wa-cluster wa-gap-s">
            <wa-badge variant={isIncome ? "success" : "danger"} appearance="outlined">
              <span className="wa-cluster wa-gap-2xs wa-align-items-center">
                <wa-icon name={isIncome ? "money-bill" : "credit-card"}></wa-icon>
                {isIncome ? t("categories.income") : t("categories.expense")}
              </span>
            </wa-badge>
            {seriesBadge ? (
              <wa-badge variant="neutral" appearance="outlined">
                <span className="wa-cluster wa-gap-2xs wa-align-items-center">
                  <wa-icon name="arrows-rotate"></wa-icon>
                  {t(seriesBadge.key, seriesBadge.vars)}
                </span>
              </wa-badge>
            ) : null}
          </div>

          <dl
            className="wa-grid wa-gap-m"
            style={{ gridTemplateColumns: "1fr 1fr", margin: 0 }}
          >
            <div>
              <dt className="wa-caption-m wa-color-text-quiet">{t("entries.plannedLabel")}</dt>
              <dd className={amountClass} style={{ margin: 0, fontVariantNumeric: "tabular-nums" }}>
                {amountPrefix}
                {formatMoney(liveItem.plannedAmount)}
              </dd>
            </div>
            <div>
              <dt className="wa-caption-m wa-color-text-quiet">{t("entries.spentLabel")}</dt>
              <dd className={amountClass} style={{ margin: 0, fontVariantNumeric: "tabular-nums" }}>
                {spent === null ? (
                  <span className="wa-color-text-quiet">—</span>
                ) : (
                  <>
                    {amountPrefix}
                    {formatMoney(spent)}
                  </>
                )}
              </dd>
            </div>
          </dl>

          <div>
            <h3 className="wa-heading-s" style={{ margin: "0 0 var(--wa-space-s)" }}>
              {t("entries.detailsTitle")}
            </h3>
            {entries.length === 0 ? (
              <p className="wa-caption-s wa-color-text-quiet" style={{ margin: 0 }}>
                {t("entries.detailsEmpty")}
              </p>
            ) : (
              <ul className="wa-stack wa-gap-s" style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {entries.map((entry) => (
                  <li
                    key={entry.id}
                    className="wa-cluster wa-gap-s"
                    style={{
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      padding: "var(--wa-space-s)",
                      background: "var(--wa-color-neutral-fill-quiet)",
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p
                        className={amountClass}
                        style={{ margin: 0, fontVariantNumeric: "tabular-nums" }}
                      >
                        {formatLineItemEntryDisplay(liveItem.type, entry.amount, formatMoney)}
                      </p>
                      {entry.note ? (
                        <p
                          className="wa-caption-m wa-color-text-quiet"
                          style={{ margin: 0, overflowWrap: "anywhere" }}
                        >
                          {entry.note}
                        </p>
                      ) : null}
                      <p className="wa-caption-m wa-color-text-quiet" style={{ margin: 0 }}>
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
        </div>

        <div slot="footer">
          <LineItemActions
            item={liveItem}
            layout="footer"
            loading={paying}
            onPay={handlers.payItem}
            onAdd={handlers.openAdd}
            onEdit={handlers.openEdit}
            onDelete={handlers.requestDelete}
          />
        </div>
      </wa-dialog>

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
