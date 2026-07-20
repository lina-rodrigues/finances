import mongoose, { Schema, type Document, type Types } from "mongoose";

export type FinancialReportStatus = "pending" | "completed" | "failed";

export interface IFinancialReport extends Document {
  userId: Types.ObjectId;
  yearMonth: string;
  status: FinancialReportStatus;
  promptUsed: string;
  content: string | null;
  error: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const financialReportSchema = new Schema<IFinancialReport>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    yearMonth: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      required: true,
    },
    promptUsed: { type: String, required: true },
    content: { type: String, default: null },
    error: { type: String, default: null },
  },
  { timestamps: true },
);

financialReportSchema.index({ userId: 1, yearMonth: -1, createdAt: -1 });

export const FinancialReport = mongoose.model<IFinancialReport>(
  "FinancialReport",
  financialReportSchema,
);

export interface FinancialReportResponse {
  id: string;
  yearMonth: string;
  status: FinancialReportStatus;
  promptUsed: string;
  content: string | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

export function toFinancialReportResponse(report: IFinancialReport): FinancialReportResponse {
  return {
    id: report._id.toString(),
    yearMonth: report.yearMonth,
    status: report.status,
    promptUsed: report.promptUsed,
    content: report.content,
    error: report.error,
    createdAt: report.createdAt.toISOString(),
    updatedAt: report.updatedAt.toISOString(),
  };
}
