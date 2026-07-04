import { Types } from "mongoose";
import { Month } from "../models/Month.js";
import { LineItem } from "../models/LineItem.js";

export async function assertLineItemOwnedByUser(
  lineItemId: string,
  userId: string,
): Promise<{ monthId: Types.ObjectId } | null> {
  const lineItem = await LineItem.findById(lineItemId);
  if (!lineItem) {
    return null;
  }

  const month = await Month.findOne({ _id: lineItem.monthId, userId });
  if (!month) {
    return null;
  }

  return { monthId: lineItem.monthId };
}

export async function assertCategoryOwnedByUser(
  categoryId: string,
  userId: string,
): Promise<boolean> {
  const { Category } = await import("../models/Category.js");
  const category = await Category.findOne({ _id: categoryId, userId });
  return category !== null;
}

export async function assertMonthOwnedByUser(
  monthId: Types.ObjectId,
  userId: string,
): Promise<boolean> {
  const month = await Month.findOne({ _id: monthId, userId });
  return month !== null;
}
