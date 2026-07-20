"use client";

import { BudgetBar } from "@/components/BudgetBar";
import { Icon } from "@/components/Icon";
import { LineItemActions } from "@/components/LineItemActions";
import { Badge } from "@/components/ui/pixelact-ui/badge";
import { Button } from "@/components/ui/pixelact-ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/pixelact-ui/dialog";
import { getLocaleTag, type LineItem } from "@/lib/api";
import type { LineItemActionHandlers } from "@/lib/useLineItemDialogHost";
import { useTranslation } from "@/lib/i18n";
import { collectAllLineItems } from "@/lib/monthViewMath";
import { useMonthView } from "@/lib/MonthViewProvider";
import { formatLineItemEntryDisplay, getLineItemRealizedAmount } from "@/lib/lineItemAmounts";
import { useFormatCurrency } from "@/lib/useFormatCurrency";

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
  const { t, locale } = useTranslation();
  const formatMoney = useFormatCurrency();
  const monthView = useMonthView();
  const localeTag = getLocaleTag(locale);

  const liveItem =
    item === null
      ? null
      : collectAllLineItems(monthView.categories, monthView.uncategorized).find(
          (candidate) => candidate.id === item.id,
        ) ?? item;

  if (!liveItem) {
    return null;
  }

  const isIncome = liveItem.type === "income";
  const amountClass = isIncome ? "text-income" : "text-expense";
  const amountPrefix = isIncome ? "+" : "-";
  const entries = [...(liveItem.entries ?? [])].reverse();
  const spent = getLineItemRealizedAmount(liveItem);

  return (
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
                  className="rounded-sm bg-muted px-2 py-2"
                >
                  <p className={`text-amount text-sm ${amountClass}`}>
                    {formatLineItemEntryDisplay(liveItem.type, entry.amount, formatMoney)}
                  </p>
                  {entry.note && (
                    <p className="text-body text-muted-finance break-words text-xs">{entry.note}</p>
                  )}
                  <p className="text-body text-muted-finance text-xs">
                    {formatEntryDateTime(entry.createdAt, localeTag)}
                  </p>
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
  );
}
