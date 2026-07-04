import mongoose, { Schema, type Document, type Types } from "mongoose";

export type LineItemType = "income" | "expense";

export interface ILineItem extends Document {
  monthId: Types.ObjectId;
  categoryId: Types.ObjectId;
  type: LineItemType;
  label: string;
  plannedAmount: number;
  realizedAmount: number | null;
}

const lineItemSchema = new Schema<ILineItem>(
  {
    monthId: { type: Schema.Types.ObjectId, ref: "Month", required: true },
    categoryId: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    type: { type: String, enum: ["income", "expense"], required: true },
    label: { type: String, required: true },
    plannedAmount: { type: Number, required: true },
    realizedAmount: { type: Number, default: null },
  },
  { timestamps: true },
);

lineItemSchema.index({ monthId: 1, createdAt: 1 });
lineItemSchema.index({ categoryId: 1 });

export const LineItem = mongoose.model<ILineItem>("LineItem", lineItemSchema);

export function effectiveAmount(item: {
  plannedAmount: number;
  realizedAmount: number | null;
}): number {
  return item.realizedAmount ?? item.plannedAmount;
}
