import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface ICategory extends Document {
  name: string;
  parentId: Types.ObjectId | null;
  order: number;
}

const categorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true },
    parentId: { type: Schema.Types.ObjectId, ref: "Category", default: null },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const Category = mongoose.model<ICategory>("Category", categorySchema);
