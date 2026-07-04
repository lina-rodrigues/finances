import { Category, type ICategory } from "../models/Category.js";
import { DEFAULT_CATEGORY_ICON, isAllowedCategoryIcon } from "../constants/categoryIcons.js";
import { effectiveAmount, type ILineItem, type LineItemType } from "../models/LineItem.js";
import type { Types } from "mongoose";

export interface LineItemResponse {
  id: string;
  type: LineItemType;
  label: string;
  plannedAmount: number;
  realizedAmount: number | null;
  displayAmount: number;
  isRealized: boolean;
}

export interface CategoryWithLineItems {
  id: string;
  name: string;
  order: number;
  icon: string;
  lineItems: LineItemResponse[];
}

export interface FlatCategoryResponse {
  id: string;
  name: string;
  order: number;
  icon: string;
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
  };
}

function toLineItemResponse(item: ILineItem): LineItemResponse {
  return {
    id: item._id.toString(),
    type: item.type,
    label: item.label,
    plannedAmount: item.plannedAmount,
    realizedAmount: item.realizedAmount,
    displayAmount: effectiveAmount(item),
    isRealized: item.realizedAmount !== null,
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
      lineItems: (lineItemsByCategory.get(cat._id.toString()) ?? []).map(toLineItemResponse),
    })),
    uncategorized: uncategorized.map(toLineItemResponse),
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
