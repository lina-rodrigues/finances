import { Category, type ICategory } from "../models/Category.js";
import { DEFAULT_CATEGORY_ICON, isAllowedCategoryIcon } from "../constants/categoryIcons.js";
import type { BudgetGroup } from "../constants/budgetGroup.js";
import { resolveBudgetGroup } from "../constants/budgetGroup.js";
import { effectiveAmount, getRealizedAmount, isRealized, type ILineItem, type LineItemType } from "../models/LineItem.js";
import type { IRecurringSeries, RecurrenceEndType } from "../models/RecurringSeries.js";
import type { Types } from "mongoose";

export interface LineItemResponse {
  id: string;
  type: LineItemType;
  label: string;
  plannedAmount: number;
  realizedAmount: number | null;
  displayAmount: number;
  isRealized: boolean;
  entries: {
    id: string;
    amount: number;
    note: string | null;
    createdAt: string;
  }[];
  entryCount: number;
  seriesId: string | null;
  seriesOccurrenceIndex: number | null;
  seriesEndType: RecurrenceEndType | null;
  seriesOccurrenceCount: number | null;
  seriesEndYearMonth: string | null;
  seriesStartYearMonth: string | null;
  seriesCancelled: boolean;
  isSeriesException: boolean;
}

export interface CategoryWithLineItems {
  id: string;
  name: string;
  order: number;
  icon: string;
  budgetGroup: BudgetGroup | null;
  lineItems: LineItemResponse[];
}

export interface FlatCategoryResponse {
  id: string;
  name: string;
  order: number;
  icon: string;
  budgetGroup: BudgetGroup | null;
}

function normalizeIcon(icon: string | undefined): string {
  if (icon && isAllowedCategoryIcon(icon)) {
    return icon;
  }
  return DEFAULT_CATEGORY_ICON;
}

export function toFlatCategoryResponse(cat: ICategory): FlatCategoryResponse {
  return {
    id: cat._id.toString(),
    name: cat.name,
    order: cat.order,
    icon: normalizeIcon(cat.icon),
    budgetGroup: cat.budgetGroup ?? null,
  };
}

export { resolveBudgetGroup };

function toLineItemResponse(
  item: ILineItem,
  seriesById?: Map<string, IRecurringSeries>,
): LineItemResponse {
  const series = item.seriesId
    ? seriesById?.get(item.seriesId.toString())
    : undefined;

  return {
    id: item._id.toString(),
    type: item.type,
    label: item.label,
    plannedAmount: item.plannedAmount,
    realizedAmount: getRealizedAmount(item),
    displayAmount: effectiveAmount(item),
    isRealized: isRealized(item),
    entries: (item.entries ?? []).map((entry) => ({
      id: entry._id.toString(),
      amount: entry.amount,
      note: entry.note,
      createdAt: entry.createdAt.toISOString(),
    })),
    entryCount: item.entries?.length ?? 0,
    seriesId: item.seriesId?.toString() ?? null,
    seriesOccurrenceIndex: item.seriesOccurrenceIndex,
    seriesEndType: series?.endType ?? null,
    seriesOccurrenceCount: series?.occurrenceCount ?? null,
    seriesEndYearMonth: series?.endYearMonth ?? null,
    seriesStartYearMonth: series?.startYearMonth ?? null,
    seriesCancelled: series?.cancelledAt != null,
    isSeriesException: item.seriesException,
  };
}

let legacyMigrationDone = false;

/** Flatten legacy hierarchical categories (parentId) into a flat ordered list. */
export async function flattenLegacyCategories(userId: Types.ObjectId | string): Promise<void> {
  if (legacyMigrationDone) {
    return;
  }

  const collection = Category.collection;
  const needsMigration = await collection.findOne({
    userId,
    $or: [{ parentId: { $exists: true } }, { icon: { $exists: false } }],
  });

  if (!needsMigration) {
    legacyMigrationDone = true;
    return;
  }

  const categories = await collection
    .find({ userId })
    .sort({ order: 1, name: 1 })
    .toArray();
  let order = 0;

  for (const cat of categories) {
    const doc = cat as Record<string, unknown>;
    const updates: Record<string, unknown> = { order: order++ };
    if (!doc.icon || typeof doc.icon !== "string") {
      updates.icon = DEFAULT_CATEGORY_ICON;
    }
    await collection.updateOne(
      { _id: cat._id },
      {
        $set: updates,
        $unset: { parentId: "" },
      },
    );
  }

  legacyMigrationDone = true;
}

export async function getAllCategoriesFlat(
  userId: Types.ObjectId | string,
): Promise<FlatCategoryResponse[]> {
  await flattenLegacyCategories(userId);
  const categories = await Category.find({ userId }).sort({ order: 1, name: 1 });
  return categories.map(toFlatCategoryResponse);
}

export async function getCategoriesWithLineItems(
  userId: Types.ObjectId | string,
  lineItems: ILineItem[],
  seriesById?: Map<string, IRecurringSeries>,
): Promise<{
  categories: CategoryWithLineItems[];
  uncategorized: LineItemResponse[];
}> {
  await flattenLegacyCategories(userId);
  const categories = await Category.find({ userId }).sort({ order: 1, name: 1 });

  const uncategorized: ILineItem[] = [];
  const lineItemsByCategory = new Map<string, ILineItem[]>();
  for (const item of lineItems) {
    if (!item.categoryId) {
      uncategorized.push(item);
      continue;
    }
    const key = item.categoryId.toString();
    const list = lineItemsByCategory.get(key) ?? [];
    list.push(item);
    lineItemsByCategory.set(key, list);
  }

  return {
    categories: categories.map((cat) => ({
      ...toFlatCategoryResponse(cat),
      lineItems: (lineItemsByCategory.get(cat._id.toString()) ?? []).map((item) =>
        toLineItemResponse(item, seriesById),
      ),
    })),
    uncategorized: uncategorized.map((item) => toLineItemResponse(item, seriesById)),
  };
}

export async function reorderCategories(
  userId: Types.ObjectId | string,
  items: { id: string; order: number }[],
): Promise<FlatCategoryResponse[]> {
  await Category.bulkWrite(
    items.map((item) => ({
      updateOne: {
        filter: { _id: item.id, userId },
        update: { $set: { order: item.order } },
      },
    })),
  );
  return getAllCategoriesFlat(userId);
}
