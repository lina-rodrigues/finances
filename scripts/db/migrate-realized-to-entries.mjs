#!/usr/bin/env node
/**
 * Migrate line item realizedAmount scalar into entries, then unset the field.
 *
 * Usage:
 *   pnpm db:migrate:realized-to-entries -- --check
 *   pnpm db:migrate:realized-to-entries -- --dry-run
 *   pnpm db:migrate:realized-to-entries -- --apply
 */

import { MongoClient, ObjectId } from "mongodb";
import { loadMongoUri } from "./env.mjs";

const CATEGORIES = {
  MISMATCH: "MISMATCH",
  ORPHAN_ENTRIES: "ORPHAN_ENTRIES",
  WILL_CONVERT: "WILL_CONVERT",
  ALREADY_MIGRATED: "ALREADY_MIGRATED",
  UNREALIZED: "UNREALIZED",
};

function printHelp() {
  console.log(`Usage: pnpm db:migrate:realized-to-entries -- [--check | --dry-run | --apply] [--json] [--force]

Modes:
  --check     Read-only mismatch report (default if no mode given)
  --dry-run   Show planned conversions without writing
  --apply     Perform migration (blocked when blocking issues exist unless --force)

Options:
  --json      Machine-readable output
  --force     Apply even when blocking issues exist (not recommended)
  -h, --help  Show this help`);
}

function parseArgs(argv) {
  const options = {
    mode: "check",
    json: false,
    force: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--") {
      continue;
    }
    if (arg === "--check") {
      options.mode = "check";
    } else if (arg === "--dry-run") {
      options.mode = "dry-run";
    } else if (arg === "--apply") {
      options.mode = "apply";
    } else if (arg === "--json") {
      options.json = true;
    } else if (arg === "--force") {
      options.force = true;
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else {
      console.error(`Unknown argument: ${arg}`);
      printHelp();
      process.exit(1);
    }
  }

  return options;
}

function hasRealizedField(doc) {
  return Object.prototype.hasOwnProperty.call(doc, "realizedAmount");
}

function sumEntries(entries) {
  return (entries ?? []).reduce((sum, entry) => sum + (entry.amount ?? 0), 0);
}

function classifyLineItem(doc) {
  const entries = doc.entries ?? [];
  const entryCount = entries.length;
  const entrySum = sumEntries(entries);
  const hasField = hasRealizedField(doc);
  const realizedAmount = hasField ? doc.realizedAmount ?? null : null;

  if (!hasField) {
    if (entryCount > 0) {
      return { category: CATEGORIES.ALREADY_MIGRATED, blocking: false, entrySum, entryCount, realizedAmount: null };
    }
    return { category: CATEGORIES.UNREALIZED, blocking: false, entrySum, entryCount, realizedAmount: null };
  }

  if (realizedAmount !== null && entryCount > 0 && entrySum !== realizedAmount) {
    return { category: CATEGORIES.MISMATCH, blocking: true, entrySum, entryCount, realizedAmount };
  }

  if (realizedAmount === null && entryCount > 0) {
    return { category: CATEGORIES.ORPHAN_ENTRIES, blocking: true, entrySum, entryCount, realizedAmount };
  }

  if (realizedAmount !== null && entryCount === 0) {
    return { category: CATEGORIES.WILL_CONVERT, blocking: false, entrySum, entryCount, realizedAmount };
  }

  return { category: CATEGORIES.UNREALIZED, blocking: false, entrySum, entryCount, realizedAmount };
}

function buildEntryFromRealized(doc, realizedAmount) {
  return {
    _id: new ObjectId(),
    amount: realizedAmount,
    note: null,
    createdAt: doc.updatedAt ?? doc.createdAt ?? new Date(),
  };
}

async function loadLineItems(db) {
  const lineItems = db.collection("lineitems");
  const months = db.collection("months");
  const docs = await lineItems.find({}).toArray();
  const monthIds = [...new Set(docs.map((doc) => doc.monthId?.toString()).filter(Boolean))];
  const monthDocs = monthIds.length
    ? await months.find({ _id: { $in: monthIds.map((id) => new ObjectId(id)) } }).toArray()
    : [];
  const monthById = new Map(monthDocs.map((month) => [month._id.toString(), month]));

  return docs.map((doc) => ({
    ...doc,
    userId: monthById.get(doc.monthId?.toString() ?? "")?.userId?.toString() ?? null,
  }));
}

function initSummary() {
  return {
    total: 0,
    MISMATCH: 0,
    ORPHAN_ENTRIES: 0,
    WILL_CONVERT: 0,
    ALREADY_MIGRATED: 0,
    UNREALIZED: 0,
    blocking: [],
  };
}

function analyze(docs) {
  const summary = initSummary();
  summary.total = docs.length;

  for (const doc of docs) {
    const result = classifyLineItem(doc);
    summary[result.category] += 1;

    if (result.blocking) {
      summary.blocking.push({
        category: result.category,
        lineItemId: doc._id.toString(),
        userId: doc.userId,
        monthId: doc.monthId?.toString() ?? null,
        label: doc.label ?? "",
        realizedAmount: result.realizedAmount,
        entrySum: result.entrySum,
        entryCount: result.entryCount,
      });
    }
  }

  return summary;
}

function printSummary(summary, { json }) {
  if (json) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  console.log(`Check complete: ${summary.total} line items scanned`);
  console.log(`  WILL_CONVERT:     ${summary.WILL_CONVERT}`);
  console.log(`  UNREALIZED:       ${summary.UNREALIZED}`);
  console.log(`  ALREADY_MIGRATED: ${summary.ALREADY_MIGRATED}`);
  console.log(`  MISMATCH:         ${summary.MISMATCH}${summary.MISMATCH ? "  <- blocking" : ""}`);
  console.log(`  ORPHAN_ENTRIES:   ${summary.ORPHAN_ENTRIES}${summary.ORPHAN_ENTRIES ? "  <- blocking" : ""}`);

  for (const row of summary.blocking) {
    console.log("");
    console.log(
      `${row.category}  lineItemId=${row.lineItemId}  userId=${row.userId ?? "?"}  monthId=${row.monthId ?? "?"}  label="${row.label}"`,
    );
    console.log(
      `          realizedAmount=${row.realizedAmount}  entrySum=${row.entrySum}  entryCount=${row.entryCount}`,
    );
  }
}

async function runMigration(db, docs, { dryRun }) {
  const lineItems = db.collection("lineitems");
  let converted = 0;
  let unset = 0;
  let skipped = 0;

  for (const doc of docs) {
    const result = classifyLineItem(doc);

    if (result.blocking) {
      skipped += 1;
      continue;
    }

    if (!hasRealizedField(doc)) {
      continue;
    }

    if (result.category === CATEGORIES.WILL_CONVERT) {
      const entry = buildEntryFromRealized(doc, result.realizedAmount);
      if (dryRun) {
        console.log(
          `[dry-run] convert ${doc._id.toString()} "${doc.label}" realizedAmount=${result.realizedAmount} -> 1 entry`,
        );
      } else {
        await lineItems.updateOne(
          { _id: doc._id },
          {
            $push: { entries: entry },
            $unset: { realizedAmount: "" },
          },
        );
      }
      converted += 1;
      unset += 1;
      continue;
    }

    if (result.category === CATEGORIES.UNREALIZED || result.realizedAmount === null) {
      if (dryRun) {
        console.log(`[dry-run] unset realizedAmount on ${doc._id.toString()} "${doc.label}"`);
      } else {
        await lineItems.updateOne({ _id: doc._id }, { $unset: { realizedAmount: "" } });
      }
      unset += 1;
    }
  }

  return { converted, unset, skipped };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const uri = loadMongoUri();
  const client = new MongoClient(uri);

  await client.connect();
  const db = client.db();

  try {
    const docs = await loadLineItems(db);
    const summary = analyze(docs);

    if (options.mode === "check") {
      printSummary(summary, options);
      process.exitCode = summary.blocking.length > 0 ? 1 : 0;
      return;
    }

    if (summary.blocking.length > 0 && !options.force) {
      console.error("Blocking issues found. Fix them and re-run --check, or use --force.");
      printSummary(summary, options);
      process.exit(1);
    }

    if (options.mode === "dry-run") {
      console.log("Dry run — no writes will be performed.\n");
      const stats = await runMigration(db, docs, { dryRun: true });
      printSummary(summary, options);
      console.log("");
      console.log(`Would convert: ${stats.converted}, unset field: ${stats.unset}, skipped: ${stats.skipped}`);
      return;
    }

    console.log("Applying migration...\n");
    const stats = await runMigration(db, docs, { dryRun: false });
    const afterSummary = analyze(await loadLineItems(db));
    printSummary(afterSummary, options);
    console.log("");
    console.log(`Converted: ${stats.converted}, unset field: ${stats.unset}, skipped: ${stats.skipped}`);
    console.log("Migration complete.");
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
