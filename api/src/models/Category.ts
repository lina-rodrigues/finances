import mongoose, { Schema, type Document, type Types } from "mongoose";
import { DEFAULT_CATEGORY_ICON } from "../constants/categoryIcons.js";
import type { BudgetGroup } from "../constants/budgetGroup.js";

export interface ICategory extends Document {
  userId: Types.ObjectId;
  name: string;
  order: number;
  icon: string;
  budgetGroup: BudgetGroup | null;
}

const categorySchema = new Schema<ICategory>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true },
    order: { type: Number, default: 0 },
    icon: { type: String, default: DEFAULT_CATEGORY_ICON },
    budgetGroup: {
      type: String,
      default: null,
    },
  },
  { timestamps: true },
);

categorySchema.index({ userId: 1, order: 1 });

export const Category = mongoose.model<ICategory>("Category", categorySchema);
