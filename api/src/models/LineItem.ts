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

export function sumEntryAmounts(entries: Pick<ILineItemEntry, "amount">[]): number {
  return entries.reduce((sum, entry) => sum + entry.amount, 0);
}

export function getRealizedAmount(item: { entries?: ILineItemEntry[] }): number | null {
  const entries = item.entries ?? [];
  if (entries.length === 0) {
    return null;
  }
  return sumEntryAmounts(entries);
}

export function isRealized(item: { entries?: ILineItemEntry[] }): boolean {
  return (item.entries?.length ?? 0) > 0;
}

export function effectiveAmount(item: {
  plannedAmount: number;
  entries?: ILineItemEntry[];
}): number {
  return getRealizedAmount(item) ?? item.plannedAmount;
}

export function ensureEntriesArray(item: Pick<ILineItem, "entries">): ILineItemEntry[] {
  if (!item.entries) {
    item.entries = [];
  }
  return item.entries;
}

export function pushRealizedEntry(
  item: Pick<ILineItem, "entries">,
  amount: number,
  note: string | null = null,
): ILineItemEntry {
  const entries = ensureEntriesArray(item);
  const entry = {
    _id: new mongoose.Types.ObjectId(),
    amount,
    note,
    createdAt: new Date(),
  } as ILineItemEntry;
  entries.push(entry);
  return entry;
}

export function clearEntries(item: Pick<ILineItem, "entries">): void {
  item.entries = [];
}

export function applyRealizedAmountWrite(
  item: Pick<ILineItem, "entries">,
  realizedAmount: number | null,
): void {
  if (realizedAmount === null) {
    return;
  }

  if ((item.entries?.length ?? 0) > 0) {
    throw new Error("ENTRIES_MANAGED");
  }

  pushRealizedEntry(item, realizedAmount);
}
