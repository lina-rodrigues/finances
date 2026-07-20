import mongoose, { Schema, type Document, type Types } from "mongoose";

export type FinancialReportStatus = "pending" | "completed" | "failed";

export interface IFinancialReport extends Document {
  userId: Types.ObjectId;
  yearMonth: string;
  title: string;
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
    title: { type: String, default: "", trim: true },
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

export interface FinancialReportSummaryResponse {
  id: string;
  yearMonth: string;
  title: string;
  status: FinancialReportStatus;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FinancialReportResponse extends FinancialReportSummaryResponse {
  promptUsed: string;
  content: string | null;
}

export function toFinancialReportSummary(report: IFinancialReport): FinancialReportSummaryResponse {
  return {
    id: report._id.toString(),
    yearMonth: report.yearMonth,
    title: report.title?.trim() || `Report ${report.yearMonth}`,
    status: report.status,
    error: report.error,
    createdAt: report.createdAt.toISOString(),
    updatedAt: report.updatedAt.toISOString(),
  };
}

export function toFinancialReportResponse(report: IFinancialReport): FinancialReportResponse {
  return {
    ...toFinancialReportSummary(report),
    promptUsed: report.promptUsed,
    content: report.content,
  };
}
