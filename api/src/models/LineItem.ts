import mongoose, { Schema, type Document, type Types } from "mongoose";

export type LineItemType = "income" | "expense";

export interface ILineItemEntry {
  _id: Types.ObjectId;
  amount: number;
  note: string | null;
  createdAt: Date;
}

export interface ILineItem extends Document {
  monthId: Types.ObjectId;
  categoryId: Types.ObjectId | null;
  type: LineItemType;
  label: string;
  plannedAmount: number;
  realizedAmount: number | null;
  entries: ILineItemEntry[];
  seriesId: Types.ObjectId | null;
  seriesOccurrenceIndex: number | null;
  seriesException: boolean;
}

const lineItemEntrySchema = new Schema<ILineItemEntry>(
  {
    amount: { type: Number, required: true },
    note: { type: String, default: null },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const lineItemSchema = new Schema<ILineItem>(
  {
    monthId: { type: Schema.Types.ObjectId, ref: "Month", required: true },
    categoryId: { type: Schema.Types.ObjectId, ref: "Category", default: null },
    type: { type: String, enum: ["income", "expense"], required: true },
    label: { type: String, required: true },
    plannedAmount: { type: Number, required: true },
    realizedAmount: { type: Number, default: null },
    entries: { type: [lineItemEntrySchema], default: [] },
    seriesId: { type: Schema.Types.ObjectId, ref: "RecurringSeries", default: null },
    seriesOccurrenceIndex: { type: Number, default: null },
    seriesException: { type: Boolean, default: false },
  },
  { timestamps: true },
);

lineItemSchema.index({ monthId: 1, createdAt: 1 });
lineItemSchema.index({ categoryId: 1 });
lineItemSchema.index({ seriesId: 1, seriesOccurrenceIndex: 1 });

export const LineItem = mongoose.model<ILineItem>("LineItem", lineItemSchema);

export function effectiveAmount(item: {
  plannedAmount: number;
  realizedAmount: number | null;
}): number {
  return item.realizedAmount ?? item.plannedAmount;
}

export function sumEntryAmounts(entries: Pick<ILineItemEntry, "amount">[]): number {
  return entries.reduce((sum, entry) => sum + entry.amount, 0);
}

export function syncRealizedFromEntries(item: Pick<ILineItem, "entries" | "realizedAmount">): void {
  if (item.entries.length === 0) {
    item.realizedAmount = null;
    return;
  }

  item.realizedAmount = sumEntryAmounts(item.entries);
}
