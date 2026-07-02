import type { Types } from "mongoose";
import { Category, type ICategory } from "../models/Category.js";
import { DEFAULT_CATEGORY_ICON, isAllowedCategoryIcon } from "../constants/categoryIcons.js";
import { LineItem, type ILineItem, type LineItemType } from "../models/LineItem.js";

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

function toFlatCategoryResponse(cat: ICategory): FlatCategoryResponse {
  return {
    id: cat._id.toString(),
    name: cat.name,
    order: cat.order,
    icon: normalizeIcon(cat.icon),
  };
}

function toLineItemResponse(item: ILineItem): LineItemResponse {
  const isRealized = item.realizedAmount !== null;
  return {
    id: item._id.toString(),
    type: item.type,
    label: item.label,
    plannedAmount: item.plannedAmount,
    realizedAmount: item.realizedAmount,
    displayAmount: isRealized ? item.realizedAmount! : item.plannedAmount,
    isRealized,
  };
}

/** Flatten legacy hierarchical categories (parentId) into a flat ordered list. */
export async function flattenLegacyCategories(): Promise<void> {
  const collection = Category.collection;
  const needsMigration = await collection.findOne({
    $or: [{ parentId: { $exists: true } }, { icon: { $exists: false } }],
  });

  if (!needsMigration) {
    return;
  }

  const categories = await collection.find({}).sort({ order: 1, name: 1 }).toArray();
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
}

export async function getAllCategoriesFlat(): Promise<FlatCategoryResponse[]> {
  await flattenLegacyCategories();
  const categories = await Category.find().sort({ order: 1, name: 1 });
  return categories.map(toFlatCategoryResponse);
}

export async function getCategoriesWithLineItems(
  monthId: Types.ObjectId,
): Promise<CategoryWithLineItems[]> {
  await flattenLegacyCategories();
  const categories = await Category.find().sort({ order: 1, name: 1 });
  const lineItems = await LineItem.find({ monthId }).sort({ createdAt: 1 });

  const lineItemsByCategory = new Map<string, ILineItem[]>();
  for (const item of lineItems) {
    const key = item.categoryId.toString();
    const list = lineItemsByCategory.get(key) ?? [];
    list.push(item);
    lineItemsByCategory.set(key, list);
  }

  return categories.map((cat) => ({
    ...toFlatCategoryResponse(cat),
    lineItems: (lineItemsByCategory.get(cat._id.toString()) ?? []).map(toLineItemResponse),
  }));
}

export async function reorderCategories(
  items: { id: string; order: number }[],
): Promise<FlatCategoryResponse[]> {
  for (const item of items) {
    await Category.findByIdAndUpdate(item.id, { order: item.order });
  }
  return getAllCategoriesFlat();
}
