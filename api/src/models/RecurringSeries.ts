import mongoose, { Schema, type Document, type Types } from "mongoose";
import type { LineItemType } from "./LineItem.js";

export type RecurrenceEndType = "never" | "count" | "until";

export interface IRecurringSeries extends Document {
  userId: Types.ObjectId;
  categoryId: Types.ObjectId | null;
  type: LineItemType;
  label: string;
  plannedAmount: number;
  startYearMonth: string;
  endType: RecurrenceEndType;
  occurrenceCount: number | null;
  endYearMonth: string | null;
  cancelledAt: Date | null;
  generatedThroughYearMonth: string;
}

const recurringSeriesSchema = new Schema<IRecurringSeries>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    categoryId: { type: Schema.Types.ObjectId, ref: "Category", default: null },
    type: { type: String, enum: ["income", "expense"], required: true },
    label: { type: String, required: true },
    plannedAmount: { type: Number, required: true },
    startYearMonth: { type: String, required: true },
    endType: { type: String, enum: ["never", "count", "until"], required: true },
    occurrenceCount: { type: Number, default: null },
    endYearMonth: { type: String, default: null },
    cancelledAt: { type: Date, default: null },
    generatedThroughYearMonth: { type: String, required: true },
  },
  { timestamps: true },
);

recurringSeriesSchema.index({ userId: 1, startYearMonth: 1 });

export const RecurringSeries = mongoose.model<IRecurringSeries>(
  "RecurringSeries",
  recurringSeriesSchema,
);
