import mongoose, { Schema, type Document, type Types } from "mongoose";

export type ImportBatchStatus = "pending" | "waiting" | "done" | "failed";

export interface IImportSourceLine {
  fitId: string;
  date: string;
  amount: number;
  name: string;
  memo: string | null;
  skippedDuplicate: boolean;
}

export interface IImportProposedRecurrence {
  endType: "never" | "count" | "until";
  occurrenceCount?: number | null;
  startYearMonth?: string | null;
  endYearMonth?: string | null;
}

export interface IImportProposedItem {
  id: string;
  type: "LineItem" | "LineItemEntry";
  label: string | null;
  category: string;
  parent: string | null;
  planned: number | null;
  realized: number | null;
  recurrent: boolean;
  recurrence: IImportProposedRecurrence | null;
  deleted: boolean;
  sourceFitId: string | null;
  notes: string | null;
}

export interface IImportReviewCategory {
  id: string;
  name: string;
}

export interface IImportReviewLineItem {
  id: string;
  label: string;
  categoryName: string | null;
}

export type ImportAppliedActionKind =
  | "lineItem"
  | "lineItemEntry"
  | "recurringSeries"
  | "deletedFitId";

export interface IImportAppliedAction {
  kind: ImportAppliedActionKind;
  fitId: string | null;
  lineItemId: string | null;
  entryId: string | null;
  seriesId: string | null;
  parentLineItemId: string | null;
}

export interface IImportBatch extends Document {
  userId: Types.ObjectId;
  yearMonth: string;
  fileName: string;
  status: ImportBatchStatus;
  rawOfx: string;
  sourceLines: IImportSourceLine[];
  proposedItems: IImportProposedItem[];
  reviewCategories: IImportReviewCategory[];
  reviewLineItems: IImportReviewLineItem[];
  appliedActions: IImportAppliedAction[];
  promptUsed: string | null;
  aiRawResponse: string | null;
  error: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const sourceLineSchema = new Schema<IImportSourceLine>(
  {
    fitId: { type: String, required: true },
    date: { type: String, required: true },
    amount: { type: Number, required: true },
    name: { type: String, required: true },
    memo: { type: String, default: null },
    skippedDuplicate: { type: Boolean, default: false },
  },
  { _id: false },
);

const proposedRecurrenceSchema = new Schema<IImportProposedRecurrence>(
  {
    endType: { type: String, enum: ["never", "count", "until"], required: true },
    occurrenceCount: { type: Number, default: null },
    startYearMonth: { type: String, default: null },
    endYearMonth: { type: String, default: null },
  },
  { _id: false },
);

const proposedItemSchema = new Schema<IImportProposedItem>(
  {
    id: { type: String, required: true },
    type: { type: String, enum: ["LineItem", "LineItemEntry"], required: true },
    label: { type: String, default: null },
    category: { type: String, required: true },
    parent: { type: String, default: null },
    planned: { type: Number, default: null },
    realized: { type: Number, default: null },
    recurrent: { type: Boolean, default: false },
    recurrence: { type: proposedRecurrenceSchema, default: null },
    deleted: { type: Boolean, default: false },
    sourceFitId: { type: String, default: null },
    notes: { type: String, default: null },
  },
  { _id: false },
);

const reviewCategorySchema = new Schema<IImportReviewCategory>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
  },
  { _id: false },
);

const reviewLineItemSchema = new Schema<IImportReviewLineItem>(
  {
    id: { type: String, required: true },
    label: { type: String, required: true },
    categoryName: { type: String, default: null },
  },
  { _id: false },
);

const appliedActionSchema = new Schema<IImportAppliedAction>(
  {
    kind: {
      type: String,
      enum: ["lineItem", "lineItemEntry", "recurringSeries", "deletedFitId"],
      required: true,
    },
    fitId: { type: String, default: null },
    lineItemId: { type: String, default: null },
    entryId: { type: String, default: null },
    seriesId: { type: String, default: null },
    parentLineItemId: { type: String, default: null },
  },
  { _id: false },
);

const importBatchSchema = new Schema<IImportBatch>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    yearMonth: { type: String, required: true },
    fileName: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "waiting", "done", "failed"],
      required: true,
    },
    rawOfx: { type: String, required: true },
    sourceLines: { type: [sourceLineSchema], default: [] },
    proposedItems: { type: [proposedItemSchema], default: [] },
    reviewCategories: { type: [reviewCategorySchema], default: [] },
    reviewLineItems: { type: [reviewLineItemSchema], default: [] },
    appliedActions: { type: [appliedActionSchema], default: [] },
    promptUsed: { type: String, default: null },
    aiRawResponse: { type: String, default: null },
    error: { type: String, default: null },
  },
  { timestamps: true },
);

importBatchSchema.index({ userId: 1, createdAt: -1 });

export const ImportBatch = mongoose.model<IImportBatch>("ImportBatch", importBatchSchema);

export interface ImportBatchSummaryResponse {
  id: string;
  yearMonth: string;
  fileName: string;
  status: ImportBatchStatus;
  error: string | null;
  sourceCount: number;
  duplicateCount: number;
  proposedCount: number;
  deletedCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ImportBatchDetailResponse extends ImportBatchSummaryResponse {
  sourceLines: IImportSourceLine[];
  proposedItems: IImportProposedItem[];
  reviewCategories: IImportReviewCategory[];
  reviewLineItems: IImportReviewLineItem[];
  appliedActions: IImportAppliedAction[];
  promptUsed: string | null;
  aiRawResponse: string | null;
}

function countsFromBatch(batch: IImportBatch) {
  const sourceCount = batch.sourceLines.length;
  const duplicateCount = batch.sourceLines.filter((line) => line.skippedDuplicate).length;
  const proposedCount = batch.proposedItems.length;
  const deletedCount = batch.proposedItems.filter((item) => item.deleted).length;
  return { sourceCount, duplicateCount, proposedCount, deletedCount };
}

export function toImportBatchSummary(batch: IImportBatch): ImportBatchSummaryResponse {
  return {
    id: batch._id.toString(),
    yearMonth: batch.yearMonth,
    fileName: batch.fileName,
    status: batch.status,
    error: batch.error,
    ...countsFromBatch(batch),
    createdAt: batch.createdAt.toISOString(),
    updatedAt: batch.updatedAt.toISOString(),
  };
}

export function toImportBatchDetail(batch: IImportBatch): ImportBatchDetailResponse {
  return {
    ...toImportBatchSummary(batch),
    sourceLines: batch.sourceLines,
    proposedItems: batch.proposedItems,
    reviewCategories: batch.reviewCategories,
    reviewLineItems: batch.reviewLineItems,
    appliedActions: batch.appliedActions,
    promptUsed: batch.promptUsed,
    aiRawResponse: batch.aiRawResponse,
  };
}
