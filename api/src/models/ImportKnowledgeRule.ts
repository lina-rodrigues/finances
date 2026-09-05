import mongoose, { Schema, type Document, type Types } from "mongoose";

export type ImportKnowledgeItemType = "LineItem" | "LineItemEntry";

export interface IImportKnowledgeRule extends Document {
  userId: Types.ObjectId;
  ofxName: string;
  type: ImportKnowledgeItemType;
  category: string;
  parent: string | null;
  label: string | null;
  sourceBatchId: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const importKnowledgeRuleSchema = new Schema<IImportKnowledgeRule>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    ofxName: { type: String, required: true, trim: true },
    type: { type: String, enum: ["LineItem", "LineItemEntry"], required: true },
    category: { type: String, required: true, trim: true },
    parent: { type: String, default: null },
    label: { type: String, default: null },
    sourceBatchId: { type: Schema.Types.ObjectId, ref: "ImportBatch", default: null },
  },
  { timestamps: true },
);

importKnowledgeRuleSchema.index({ userId: 1, ofxName: 1 }, { unique: true });
importKnowledgeRuleSchema.index({ userId: 1, sourceBatchId: 1 });

export interface ImportKnowledgeRuleResponse {
  id: string;
  ofxName: string;
  type: ImportKnowledgeItemType;
  category: string;
  parent: string | null;
  label: string | null;
  sourceBatchId: string | null;
  createdAt: string;
  updatedAt: string;
}

export function toImportKnowledgeRule(rule: IImportKnowledgeRule): ImportKnowledgeRuleResponse {
  return {
    id: rule._id.toString(),
    ofxName: rule.ofxName,
    type: rule.type,
    category: rule.category,
    parent: rule.parent,
    label: rule.label,
    sourceBatchId: rule.sourceBatchId ? rule.sourceBatchId.toString() : null,
    createdAt: rule.createdAt.toISOString(),
    updatedAt: rule.updatedAt.toISOString(),
  };
}

export const ImportKnowledgeRule = mongoose.model<IImportKnowledgeRule>(
  "ImportKnowledgeRule",
  importKnowledgeRuleSchema,
);
