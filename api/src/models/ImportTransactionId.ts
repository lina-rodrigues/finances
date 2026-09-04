import mongoose, { Schema, type Document, type Types } from "mongoose";

export type ImportTransactionStatus = "applied" | "deleted";

export interface IImportTransactionId extends Document {
  userId: Types.ObjectId;
  fitId: string;
  status: ImportTransactionStatus;
  importBatchId: Types.ObjectId | null;
  appliedAt: Date;
}

const importTransactionIdSchema = new Schema<IImportTransactionId>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    fitId: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["applied", "deleted"],
      required: true,
    },
    importBatchId: { type: Schema.Types.ObjectId, ref: "ImportBatch", default: null },
    appliedAt: { type: Date, default: Date.now },
  },
  { timestamps: false },
);

importTransactionIdSchema.index({ userId: 1, fitId: 1 }, { unique: true });
importTransactionIdSchema.index({ importBatchId: 1 });

export const ImportTransactionId = mongoose.model<IImportTransactionId>(
  "ImportTransactionId",
  importTransactionIdSchema,
);
