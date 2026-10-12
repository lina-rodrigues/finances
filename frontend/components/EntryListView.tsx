"use client";

import { useMemo } from "react";
import { getLocaleTag, type Category, type LineItem } from "@/lib/api";
import {
  entryAmountTone,
  formatLineItemEntryDisplay,
} from "@/lib/lineItemAmounts";
import type { LineItemActionHandlers } from "@/lib/useLineItemDialogHost";
import { useTranslation } from "@/lib/i18n";
import { useFormatCurrency } from "@/lib/useFormatCurrency";

interface EntryRow {
  id: string;
  createdAt: string;
  categoryName: string;
  item: LineItem;
  note: string | null;
  amount: number;
}

function collectEntryRows(
  categories: Category[],
  uncategorized: LineItem[],
  uncategorizedLabel: string,
  localeTag: string,
): EntryRow[] {
  const rows: EntryRow[] = [];

  const pushItem = (item: LineItem, categoryName: string) => {
    for (const entry of item.entries ?? []) {
      rows.push({
        id: `${item.id}:${entry.id}`,
        createdAt: entry.createdAt,
        categoryName,
        item,
        note: entry.note,
        amount: entry.amount,
      });
    }
  };

  for (const category of categories) {
    for (const item of category.lineItems) {
      pushItem(item, category.name);
    }
  }
  for (const item of uncategorized) {
    pushItem(item, uncategorizedLabel);
  }

  rows.sort((a, b) => {
    const byTime = Date.parse(b.createdAt) - Date.parse(a.createdAt);
    if (byTime !== 0) {
      return byTime;
    }
    const byCategory = a.categoryName.localeCompare(b.categoryName, localeTag);
    if (byCategory !== 0) {
      return byCategory;
    }
    return a.item.label.localeCompare(b.item.label, localeTag);
  });

  return rows;
}

function formatEntryTime(iso: string, localeTag: string): string {
  return new Intl.DateTimeFormat(localeTag, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

interface EntryListViewProps {
  categories: Category[];
  uncategorized: LineItem[];
  uncategorizedLabel: string;
  handlers: LineItemActionHandlers;
}

export function EntryListView({
  categories,
  uncategorized,
  uncategorizedLabel,
  handlers,
}: EntryListViewProps) {
  const { t, locale } = useTranslation();
  const formatMoney = useFormatCurrency();
  const localeTag = getLocaleTag(locale);
  const rows = useMemo(
    () => collectEntryRows(categories, uncategorized, uncategorizedLabel, localeTag),
    [categories, uncategorized, uncategorizedLabel, localeTag],
  );

  if (rows.length === 0) {
    return (
      <wa-card>
        <p className="wa-caption-m wa-color-text-quiet" style={{ margin: 0 }}>
          {t("categories.listEmpty")}
        </p>
      </wa-card>
    );
  }

  return (
    <wa-card>
      <div className="entry-list-scroll">
        <table className="entry-list">
          <thead>
            <tr>
              <th className="wa-caption-s wa-color-text-quiet">{t("categories.listTime")}</th>
              <th className="wa-caption-s wa-color-text-quiet">{t("categories.listCategory")}</th>
              <th className="wa-caption-s wa-color-text-quiet">{t("categories.listItem")}</th>
              <th className="wa-caption-s wa-color-text-quiet">{t("categories.listNote")}</th>
              <th className="wa-caption-s wa-color-text-quiet entry-list__amount">
                {t("categories.listAmount")}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className="entry-list__row"
                tabIndex={0}
                aria-label={`${t("entries.detailTitle")}: ${row.item.label}`}
                onClick={() => handlers.openDetail(row.item)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    handlers.openDetail(row.item);
                  }
                }}
              >
                <td className="entry-list__time">{formatEntryTime(row.createdAt, localeTag)}</td>
                <td>{row.categoryName}</td>
                <td>{row.item.label}</td>
                <td>{row.note?.trim() ? row.note : "—"}</td>
                <td className={`entry-list__amount ${entryAmountTone(row.item.type, row.amount)}`}>
                  {formatLineItemEntryDisplay(row.item.type, row.amount, formatMoney)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </wa-card>
  );
}
