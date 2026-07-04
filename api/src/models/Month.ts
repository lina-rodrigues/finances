import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface IMonth extends Document {
  userId: Types.ObjectId;
  yearMonth: string;
  lastMonthBalance: number;
}

const monthSchema = new Schema<IMonth>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    yearMonth: { type: String, required: true },
    lastMonthBalance: { type: Number, default: 0 },
  },
  { timestamps: true },
);

monthSchema.index({ userId: 1, yearMonth: 1 }, { unique: true });

export const Month = mongoose.model<IMonth>("Month", monthSchema);
