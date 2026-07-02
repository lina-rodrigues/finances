import mongoose, { Schema, type Document } from "mongoose";
import { DEFAULT_CATEGORY_ICON } from "../constants/categoryIcons.js";

export interface ICategory extends Document {
  name: string;
  order: number;
  icon: string;
}

const categorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true },
    order: { type: Number, default: 0 },
    icon: { type: String, default: DEFAULT_CATEGORY_ICON },
  },
  { timestamps: true },
);

export const Category = mongoose.model<ICategory>("Category", categorySchema);
