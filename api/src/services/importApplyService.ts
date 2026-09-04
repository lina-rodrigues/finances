import { Category } from "../models/Category.js";
import {
  ImportBatch,
  type IImportAppliedAction,
  type IImportBatch,
  type IImportProposedItem,
} from "../models/ImportBatch.js";
import { ImportTransactionId } from "../models/ImportTransactionId.js";
import { LineItem, applyRealizedAmountWrite, pushRealizedEntry } from "../models/LineItem.js";
import { RecurringSeries } from "../models/RecurringSeries.js";
import { IMPORT_ERROR_CODES, ImportServiceError } from "../constants/importErrors.js";
import { cascadeBalanceFrom, ensureMonth } from "./balanceService.js";
import { createRecurringSeries } from "./recurrenceService.js";
import type { RecurrenceInput } from "../schemas/recurrence.js";

async function resolveCategoryId(userId: string, name: string): Promise<string> {
  const category = await Category.findOne({ userId, name });
  if (!category) {
    throw new ImportServiceError(IMPORT_ERROR_CODES.APPLY_FAILED, 400);
  }
  return category._id.toString();
}

function buildRecurrenceInput(item: IImportProposedItem, yearMonth: string): RecurrenceInput {
  const rec = item.recurrence;
  if (!rec) {
    return { startYearMonth: yearMonth, endType: "never" };
  }
  const startYearMonth = rec.startYearMonth ?? yearMonth;
  if (rec.endType === "count") {
    if (rec.occurrenceCount == null) {
      throw new ImportServiceError(IMPORT_ERROR_CODES.APPLY_FAILED, 400);
    }
    return {
      startYearMonth,
      endType: "count",
      occurrenceCount: rec.occurrenceCount,
    };
  }
  if (rec.endType === "until") {
    if (!rec.endYearMonth) {
      throw new ImportServiceError(IMPORT_ERROR_CODES.APPLY_FAILED, 400);
    }
    return {
      startYearMonth,
      endType: "until",
      endYearMonth: rec.endYearMonth,
    };
  }
  return { startYearMonth, endType: "never" };
}

async function upsertFitId(params: {
  userId: string;
  fitId: string;
  status: "applied" | "deleted";
  importBatchId: string;
}): Promise<void> {
  await ImportTransactionId.findOneAndUpdate(
    { userId: params.userId, fitId: params.fitId },
    {
      $set: {
        status: params.status,
        importBatchId: params.importBatchId,
        appliedAt: new Date(),
      },
    },
    { upsert: true, new: true },
  );
}

async function applyProposedItem(
  userId: string,
  yearMonth: string,
  item: IImportProposedItem,
  batchId: string,
): Promise<IImportAppliedAction[]> {
  const actions: IImportAppliedAction[] = [];

  if (item.deleted) {
    if (item.sourceFitId) {
      await upsertFitId({
        userId,
        fitId: item.sourceFitId,
        status: "deleted",
        importBatchId: batchId,
      });
      actions.push({
        kind: "deletedFitId",
        fitId: item.sourceFitId,
        lineItemId: null,
        entryId: null,
        seriesId: null,
        parentLineItemId: null,
      });
    }
    return actions;
  }

  const categoryId = await resolveCategoryId(userId, item.category);
  const month = await ensureMonth(userId, yearMonth);

  if (item.type === "LineItemEntry") {
    if (!item.parent || item.realized == null) {
      throw new ImportServiceError(IMPORT_ERROR_CODES.APPLY_FAILED, 400);
    }
    const parent = await LineItem.findOne({
      monthId: month._id,
      label: item.parent,
      categoryId,
    });
    if (!parent) {
      throw new ImportServiceError(IMPORT_ERROR_CODES.APPLY_FAILED, 400);
    }
    const entry = pushRealizedEntry(parent, item.realized, item.notes ?? null);
    await parent.save();
    if (item.sourceFitId) {
      await upsertFitId({
        userId,
        fitId: item.sourceFitId,
        status: "applied",
        importBatchId: batchId,
      });
    }
    actions.push({
      kind: "lineItemEntry",
      fitId: item.sourceFitId,
      lineItemId: null,
      entryId: entry._id.toString(),
      seriesId: null,
      parentLineItemId: parent._id.toString(),
    });
    return actions;
  }

  if (!item.label || item.planned == null) {
    throw new ImportServiceError(IMPORT_ERROR_CODES.APPLY_FAILED, 400);
  }

  if (item.recurrent) {
    const recurrence = buildRecurrenceInput(item, yearMonth);
    const { firstItem, series } = await createRecurringSeries(userId, {
      categoryId,
      type: "expense",
      label: item.label,
      plannedAmount: item.planned,
      realizedAmount: item.realized,
      recurrence,
    });
    if (item.sourceFitId) {
      await upsertFitId({
        userId,
        fitId: item.sourceFitId,
        status: "applied",
        importBatchId: batchId,
      });
    }
    actions.push({
      kind: "recurringSeries",
      fitId: item.sourceFitId,
      lineItemId: firstItem._id.toString(),
      entryId: null,
      seriesId: series._id.toString(),
      parentLineItemId: null,
    });
    return actions;
  }

  const lineItem = await LineItem.create({
    monthId: month._id,
    categoryId,
    type: "expense",
    label: item.label,
    plannedAmount: item.planned,
    entries: [],
  });

  if (item.realized != null) {
    applyRealizedAmountWrite(lineItem, item.realized);
    await lineItem.save();
  }

  if (item.sourceFitId) {
    await upsertFitId({
      userId,
      fitId: item.sourceFitId,
      status: "applied",
      importBatchId: batchId,
    });
  }

  actions.push({
    kind: "lineItem",
    fitId: item.sourceFitId,
    lineItemId: lineItem._id.toString(),
    entryId: null,
    seriesId: null,
    parentLineItemId: null,
  });
  return actions;
}

export async function confirmImportBatch(userId: string, batchId: string): Promise<IImportBatch> {
  const batch = await ImportBatch.findOne({ _id: batchId, userId });
  if (!batch) {
    throw new ImportServiceError(IMPORT_ERROR_CODES.NOT_FOUND, 404);
  }
  if (batch.status !== "waiting") {
    throw new ImportServiceError(IMPORT_ERROR_CODES.INVALID_STATUS, 409);
  }

  const appliedActions: IImportAppliedAction[] = [];

  try {
    for (const item of batch.proposedItems) {
      const actions = await applyProposedItem(userId, batch.yearMonth, item, batchId);
      appliedActions.push(...actions);
    }

    batch.appliedActions = appliedActions;
    batch.status = "done";
    batch.error = null;
    await batch.save();
    await cascadeBalanceFrom(userId, batch.yearMonth);
    return batch;
  } catch (error) {
    // Best-effort: record what was applied so undo can still clean up
    batch.appliedActions = appliedActions;
    batch.status = "failed";
    batch.error = IMPORT_ERROR_CODES.APPLY_FAILED;
    await batch.save();
    if (appliedActions.length > 0) {
      await cascadeBalanceFrom(userId, batch.yearMonth);
    }
    throw error instanceof ImportServiceError
      ? error
      : new ImportServiceError(IMPORT_ERROR_CODES.APPLY_FAILED, 500);
  }
}

export async function undoImportBatch(userId: string, batchId: string): Promise<IImportBatch> {
  const batch = await ImportBatch.findOne({ _id: batchId, userId });
  if (!batch) {
    throw new ImportServiceError(IMPORT_ERROR_CODES.NOT_FOUND, 404);
  }
  if (batch.status !== "done" && !(batch.status === "failed" && batch.appliedActions.length > 0)) {
    throw new ImportServiceError(IMPORT_ERROR_CODES.INVALID_STATUS, 409);
  }

  const actions = [...batch.appliedActions].reverse();

  for (const action of actions) {
    if (action.kind === "lineItemEntry" && action.parentLineItemId && action.entryId) {
      const parent = await LineItem.findById(action.parentLineItemId);
      if (parent) {
        parent.entries = parent.entries.filter((entry) => entry._id.toString() !== action.entryId);
        await parent.save();
      }
      continue;
    }

    if (action.kind === "lineItem" && action.lineItemId) {
      await LineItem.findByIdAndDelete(action.lineItemId);
      continue;
    }

    if (action.kind === "recurringSeries" && action.seriesId) {
      await LineItem.deleteMany({ seriesId: action.seriesId });
      await RecurringSeries.findByIdAndDelete(action.seriesId);
    }
  }

  await ImportTransactionId.deleteMany({ importBatchId: batch._id });

  batch.appliedActions = [];
  batch.status = "waiting";
  batch.error = null;
  await batch.save();
  await cascadeBalanceFrom(userId, batch.yearMonth);
  return batch;
}

export async function deleteImportBatch(userId: string, batchId: string): Promise<void> {
  const batch = await ImportBatch.findOne({ _id: batchId, userId });
  if (!batch) {
    throw new ImportServiceError(IMPORT_ERROR_CODES.NOT_FOUND, 404);
  }
  if (batch.status === "done") {
    throw new ImportServiceError(IMPORT_ERROR_CODES.MUST_UNDO_FIRST, 409);
  }
  if (batch.appliedActions.length > 0) {
    // Failed mid-apply: force undo path first
    throw new ImportServiceError(IMPORT_ERROR_CODES.MUST_UNDO_FIRST, 409);
  }

  await ImportBatch.deleteOne({ _id: batch._id, userId });
}
