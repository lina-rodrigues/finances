/**
 * One-off: diagnose a failed import batch against prod.
 * Usage: pnpm exec tsx scripts/diagnose-import-batch.ts --env ../../.env.prod --id <batchId>
 */
import { config as loadEnv } from "dotenv";
import path from "node:path";
import mongoose from "mongoose";
import { connectDb } from "../src/db/connection.js";
import { Category } from "../src/models/Category.js";
import { ImportBatch } from "../src/models/ImportBatch.js";
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
    console.error("Usage: tsx scripts/diagnose-import-batch.ts --env <.env.prod> --id <batchId>");
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
    const recent = await ImportBatch.find({})
      .sort({ createdAt: -1 })
      .limit(20)
      .select("_id status yearMonth fileName error appliedActions proposedItems sourceLines createdAt updatedAt")
      .lean();
    console.log(
      JSON.stringify(
        {
          error: "BATCH_NOT_FOUND",
          batchId,
          dbName: mongoose.connection.db?.databaseName,
          recent: recent.map((b) => ({
            id: String(b._id),
            status: b.status,
            error: b.error,
            yearMonth: b.yearMonth,
            fileName: b.fileName,
            createdAt: b.createdAt,
            updatedAt: b.updatedAt,
            proposed: b.proposedItems?.length ?? 0,
            deleted: (b.proposedItems ?? []).filter((i) => i.deleted).length,
            applied: b.appliedActions?.length ?? 0,
            sources: b.sourceLines?.length ?? 0,
          })),
        },
        null,
        2,
      ),
    );
    process.exit(1);
  }

  const categories = await Category.find({ userId: batch.userId }).lean();
  const categoryNames = new Set(categories.map((c) => c.name));
  const month = await Month.findOne({ userId: batch.userId, yearMonth: batch.yearMonth }).lean();
  const existingItems = month
    ? await LineItem.find({ monthId: month._id }).populate("categoryId", "name").lean()
    : [];

  const existingByKey = new Map<string, string>();
  for (const item of existingItems) {
    const catName =
      item.categoryId && typeof item.categoryId === "object" && "name" in item.categoryId
        ? (item.categoryId as { name: string }).name
        : null;
    existingByKey.set(`${catName}||${item.label}`, item._id.toString());
  }

  const createdInBatch = new Map<string, boolean>();
  const issues: Array<Record<string, unknown>> = [];
  let wouldFailAt: Record<string, unknown> | null = null;

  for (let i = 0; i < batch.proposedItems.length; i += 1) {
    const item = batch.proposedItems[i];
    const row = {
      index: i,
      id: item.id,
      type: item.type,
      label: item.label,
      parent: item.parent,
      category: item.category,
      planned: item.planned,
      realized: item.realized,
      recurrent: item.recurrent,
      deleted: item.deleted,
      sourceFitId: item.sourceFitId,
      notes: item.notes,
    };

    if (item.deleted) {
      issues.push({ ...row, status: "ok_deleted" });
      continue;
    }

    if (!categoryNames.has(item.category)) {
      const issue = { ...row, status: "fail", reason: "CATEGORY_NOT_FOUND" };
      issues.push(issue);
      wouldFailAt ??= issue;
      continue;
    }

    if (item.type === "LineItemEntry") {
      if (!item.parent || item.realized == null) {
        const issue = {
          ...row,
          status: "fail",
          reason: !item.parent ? "MISSING_PARENT" : "MISSING_REALIZED",
        };
        issues.push(issue);
        wouldFailAt ??= issue;
        continue;
      }
      const key = `${item.category}||${item.parent}`;
      const exists = existingByKey.has(key) || createdInBatch.has(key);
      if (!exists) {
        const issue = { ...row, status: "fail", reason: "PARENT_NOT_FOUND", lookupKey: key };
        issues.push(issue);
        wouldFailAt ??= issue;
        continue;
      }
      issues.push({ ...row, status: "ok_entry" });
      continue;
    }

    if (!item.label || item.planned == null) {
      const issue = {
        ...row,
        status: "fail",
        reason: !item.label ? "MISSING_LABEL" : "MISSING_PLANNED",
      };
      issues.push(issue);
      wouldFailAt ??= issue;
      continue;
    }

    if (item.recurrent) {
      const rec = item.recurrence;
      if (rec?.endType === "count" && rec.occurrenceCount == null) {
        const issue = { ...row, status: "fail", reason: "RECURRENCE_COUNT_MISSING" };
        issues.push(issue);
        wouldFailAt ??= issue;
        continue;
      }
      if (rec?.endType === "until" && !rec.endYearMonth) {
        const issue = { ...row, status: "fail", reason: "RECURRENCE_UNTIL_MISSING" };
        issues.push(issue);
        wouldFailAt ??= issue;
        continue;
      }
    }

    createdInBatch.set(`${item.category}||${item.label}`, true);
    issues.push({ ...row, status: item.recurrent ? "ok_recurring" : "ok_lineitem" });
  }

  const applied = batch.appliedActions ?? [];
  const failed = issues.filter((x) => x.status === "fail");
  const ok = issues.filter((x) => String(x.status).startsWith("ok"));
  const active = batch.proposedItems.filter((x) => !x.deleted);

  const appliedFitIds = new Set(applied.map((a) => a.fitId).filter(Boolean));
  const missedActive = active
    .filter((item) => !item.sourceFitId || !appliedFitIds.has(item.sourceFitId))
    .map((item) => ({
      id: item.id,
      type: item.type,
      label: item.label,
      parent: item.parent,
      category: item.category,
      planned: item.planned,
      realized: item.realized,
      sourceFitId: item.sourceFitId,
      simulated: issues.find((i) => i.id === item.id),
    }));

  // Rows that would have been applied before first failure in order
  const beforeFirstFail =
    wouldFailAt == null
      ? issues
      : issues.filter((x) => (x.index as number) < (wouldFailAt.index as number));
  const afterIncludingFail =
    wouldFailAt == null
      ? []
      : issues.filter((x) => (x.index as number) >= (wouldFailAt.index as number));

  const summary = {
    batchId,
    status: batch.status,
    error: batch.error,
    yearMonth: batch.yearMonth,
    fileName: batch.fileName,
    sourceCount: batch.sourceLines?.length ?? 0,
    proposedCount: batch.proposedItems.length,
    deletedCount: batch.proposedItems.filter((x) => x.deleted).length,
    activeCount: active.length,
    appliedActionsCount: applied.length,
    appliedKinds: applied.reduce<Record<string, number>>((acc, a) => {
      acc[a.kind] = (acc[a.kind] ?? 0) + 1;
      return acc;
    }, {}),
    simulatedOk: ok.length,
    simulatedFail: failed.length,
    firstFailure: wouldFailAt,
    allFailures: failed,
    rowsBeforeFirstFail: beforeFirstFail.length,
    rowsFromFailOnward: afterIncludingFail.filter((x) => x.status !== "ok_deleted").length,
    appliedFitIds: applied.map((a) => ({
      kind: a.kind,
      fitId: a.fitId,
      lineItemId: a.lineItemId,
      entryId: a.entryId,
      parentLineItemId: a.parentLineItemId,
    })),
    missedActiveCount: missedActive.length,
    missedActive,
    categoryNames: [...categoryNames].sort(),
  };

  console.log(JSON.stringify(summary, null, 2));
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
