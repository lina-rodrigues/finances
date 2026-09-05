/**
 * List cleanup candidates for a failed import batch — read-only.
 * Usage: pnpm exec tsx scripts/list-import-cleanup.ts --env ../.env.prod --id <batchId>
 */
import { config as loadEnv } from "dotenv";
import path from "node:path";
import mongoose from "mongoose";
import { connectDb } from "../src/db/connection.js";
import { Category } from "../src/models/Category.js";
import { ImportBatch } from "../src/models/ImportBatch.js";
import { ImportTransactionId } from "../src/models/ImportTransactionId.js";
import { LineItem } from "../src/models/LineItem.js";
import { Month } from "../src/models/Month.js";

function parseArgs(argv: string[]): { envPath: string; batchId: string } {
  let envPath = "";
  let batchId = "";
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === "--env" && next) {
      envPath = path.resolve(next);
      i += 1;
    } else if (arg === "--id" && next) {
      batchId = next;
      i += 1;
    }
  }
  if (!envPath || !batchId) {
    console.error("Usage: tsx scripts/list-import-cleanup.ts --env <.env.prod> --id <batchId>");
    process.exit(1);
  }
  return { envPath, batchId };
}

async function main() {
  const { envPath, batchId } = parseArgs(process.argv.slice(2));
  loadEnv({ path: envPath });
  await connectDb();

  const batch = await ImportBatch.findById(batchId).lean();
  if (!batch) {
    console.log(JSON.stringify({ error: "BATCH_NOT_FOUND", batchId }, null, 2));
    process.exit(1);
  }

  const month = await Month.findOne({ userId: batch.userId, yearMonth: batch.yearMonth }).lean();
  const categories = await Category.find({ userId: batch.userId }).lean();
  const categoryById = new Map(categories.map((c) => [c._id.toString(), c.name]));

  const fitRecords = await ImportTransactionId.find({ importBatchId: batch._id }).lean();

  const appliedEntries = [];
  for (const action of batch.appliedActions ?? []) {
    if (action.kind !== "lineItemEntry" || !action.parentLineItemId || !action.entryId) {
      continue;
    }
    const parent = await LineItem.findById(action.parentLineItemId).lean();
    const entry = parent?.entries?.find((e) => e._id.toString() === action.entryId) ?? null;
    const catName = parent?.categoryId
      ? categoryById.get(parent.categoryId.toString()) ?? null
      : null;
    appliedEntries.push({
      actionKind: action.kind,
      fitId: action.fitId,
      parentLineItemId: action.parentLineItemId,
      entryId: action.entryId,
      parentStillExists: Boolean(parent),
      entryStillExists: Boolean(entry),
      parentLabel: parent?.label ?? null,
      category: catName,
      amount: entry?.amount ?? null,
      note: entry?.note ?? null,
      createdAt: entry?.createdAt?.toISOString?.() ?? null,
      proposed: (batch.proposedItems ?? []).find((p) => p.sourceFitId === action.fitId) ?? null,
    });
  }

  const appliedLineItems = [];
  for (const action of batch.appliedActions ?? []) {
    if (action.kind !== "lineItem" && action.kind !== "recurringSeries") continue;
    const item = action.lineItemId ? await LineItem.findById(action.lineItemId).lean() : null;
    appliedLineItems.push({
      actionKind: action.kind,
      fitId: action.fitId,
      lineItemId: action.lineItemId,
      seriesId: action.seriesId,
      stillExists: Boolean(item),
      label: item?.label ?? null,
      plannedAmount: item?.plannedAmount ?? null,
    });
  }

  const deletedFitIds = (batch.appliedActions ?? [])
    .filter((a) => a.kind === "deletedFitId")
    .map((a) => ({
      fitId: a.fitId,
      proposed: (batch.proposedItems ?? []).find((p) => p.sourceFitId === a.fitId) ?? null,
      fitRecord: fitRecords.find((f) => f.fitId === a.fitId) ?? null,
    }));

  // Missed active proposed rows (not in appliedActions)
  const appliedFit = new Set(
    (batch.appliedActions ?? []).map((a) => a.fitId).filter(Boolean) as string[],
  );
  const missedActive = (batch.proposedItems ?? []).filter(
    (p) => !p.deleted && (!p.sourceFitId || !appliedFit.has(p.sourceFitId)),
  );

  // Heuristic: month entries that look like missed proposed items (same category+parent/label+amount)
  // and were created around/after confirm (~2026-09-05), possibly manual recovery.
  const monthItems = month
    ? await LineItem.find({ monthId: month._id }).lean()
    : [];

  const possibleManualDupes = [];
  for (const proposed of missedActive) {
    const targetLabel =
      proposed.type === "LineItemEntry" ? proposed.parent : proposed.label;
    if (!targetLabel || proposed.realized == null) continue;

    for (const item of monthItems) {
      const catName = item.categoryId
        ? categoryById.get(item.categoryId.toString()) ?? null
        : null;
      if (catName !== proposed.category) continue;
      if (item.label !== targetLabel) continue;

      for (const entry of item.entries ?? []) {
        if (Math.abs(entry.amount - proposed.realized) > 0.001) continue;
        // Skip entries that are exactly the applied import entries
        if (appliedEntries.some((a) => a.entryId === entry._id.toString())) continue;
        possibleManualDupes.push({
          reason: "matches_missed_proposed_amount_on_same_parent",
          proposedId: proposed.id,
          proposedType: proposed.type,
          proposedLabel: targetLabel,
          proposedCategory: proposed.category,
          proposedRealized: proposed.realized,
          proposedNotes: proposed.notes,
          proposedFitId: proposed.sourceFitId,
          lineItemId: item._id.toString(),
          entryId: entry._id.toString(),
          entryAmount: entry.amount,
          entryNote: entry.note,
          entryCreatedAt: entry.createdAt?.toISOString?.() ?? null,
        });
      }
    }
  }

  const report = {
    batch: {
      id: batchId,
      status: batch.status,
      error: batch.error,
      yearMonth: batch.yearMonth,
      fileName: batch.fileName,
      appliedActionsCount: batch.appliedActions?.length ?? 0,
    },
    cleanupFromImportUndo: {
      description:
        "These are exactly what import Undo would remove. Prefer Undo in the app unless Undo is broken.",
      entriesWrittenByImport: appliedEntries,
      lineItemsWrittenByImport: appliedLineItems,
      deletedFitIdMarkers: deletedFitIds.map((d) => ({
        fitId: d.fitId,
        wasProposedDeleted: Boolean(d.proposed?.deleted),
        proposedLabel: d.proposed?.label ?? d.proposed?.parent ?? null,
        proposedCategory: d.proposed?.category ?? null,
        fitRecordStatus: d.fitRecord?.status ?? null,
      })),
      importTransactionIdCount: fitRecords.length,
    },
    brokenProposedRow: (batch.proposedItems ?? []).find(
      (p) =>
        p.type === "LineItemEntry" &&
        !p.parent &&
        !p.deleted &&
        p.notes === "Negociação IRPF",
    ),
    missedActiveSummary: {
      count: missedActive.length,
      realizedSum:
        Math.round(
          missedActive.reduce((s, p) => s + (p.realized ?? 0), 0) * 100,
        ) / 100,
      rows: missedActive.map((p) => ({
        type: p.type,
        label: p.label,
        parent: p.parent,
        category: p.category,
        realized: p.realized,
        notes: p.notes,
        fitId: p.sourceFitId,
      })),
    },
    possibleManualRecoveryEntries: {
      description:
        "Entries in the month that match missed proposed rows (same parent/label+category+amount) but were NOT written by this import's appliedActions. Review carefully — may be intentional manual adds or duplicates.",
      count: possibleManualDupes.length,
      rows: possibleManualDupes,
    },
  };

  console.log(JSON.stringify(report, null, 2));
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
