import mongoose, { Schema, type Document } from "mongoose";

export interface IMonth extends Document {
  yearMonth: string;
  lastMonthBalance: number;
}

const monthSchema = new Schema<IMonth>(
  {
    yearMonth: { type: String, required: true, unique: true },
    lastMonthBalance: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const Month = mongoose.model<IMonth>("Month", monthSchema);
