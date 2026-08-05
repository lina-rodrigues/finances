/**
 * Import a credit-card JSON mapping into MongoDB.
 *
 * Usage (from repo root):
 *   pnpm --filter api exec tsx scripts/import-credit-card.ts \
 *     --json ../credit-card-08-2026.json \
 *     --env ../.env.prod
 *
 * Or from api/:
 *   pnpm exec tsx scripts/import-credit-card.ts --json ../../credit-card-08-2026.json --env ../../.env.prod
 *
 * Hard gate: sum(items[].realized) must equal expectedTotal or the script exits with no DB writes.
 */
import { config as loadEnv } from "dotenv";
import { readFileSync } from "node:fs";
import path from "node:path";
import mongoose from "mongoose";
import { connectDb } from "../src/db/connection.js";
import { Category } from "../src/models/Category.js";
import { LineItem, applyRealizedAmountWrite, pushRealizedEntry } from "../src/models/LineItem.js";
import { Month } from "../src/models/Month.js";
import { User } from "../src/models/User.js";
import { cascadeBalanceFrom, ensureMonth } from "../src/services/balanceService.js";
import { createRecurringSeries } from "../src/services/recurrenceService.js";
import type { RecurrenceInput } from "../src/schemas/recurrence.js";

interface ImportRecurrence {
  endType: "never" | "count" | "until";
  occurrenceCount?: number;
  startYearMonth?: string;
  endYearMonth?: string;
  materialize?: unknown[];
}

interface ImportItem {
  id: number;
  type: "LineItem" | "LineItemEntry";
  label: string | null;
  category: string;
  parent: string | null;
  planned: number | null;
  realized: number | null;
  recurrent: boolean;
  recurrence: ImportRecurrence | null;
  notes?: string;
}

interface ImportFile {
  yearMonth: string;
  source?: string;
  expectedTotal: number;
  skipped?: unknown[];
  items: ImportItem[];
}

function parseArgs(argv: string[]): { jsonPath: string; envPath: string; userEmail: string | null } {
  let jsonPath = "";
  let envPath = "";
  let userEmail: string | null = null;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === "--json" && next) {
      jsonPath = path.resolve(next);
      i += 1;
    } else if (arg === "--env" && next) {
      envPath = path.resolve(next);
      i += 1;
    } else if (arg === "--user-email" && next) {
      userEmail = next;
      i += 1;
    }
  }

  if (!jsonPath || !envPath) {
    console.error(
      "Usage: tsx scripts/import-credit-card.ts --json <file.json> --env <.env.prod> [--user-email email]",
    );
    process.exit(1);
  }

  return { jsonPath, envPath, userEmail };
}

/** Cent-safe money sum (avoids float drift). */
function toCents(value: number): number {
  return Math.round(value * 100);
}

function fromCents(cents: number): number {
  return cents / 100;
}

function sumRealized(items: ImportItem[]): number {
  let cents = 0;
  for (const item of items) {
    if (item.realized != null) {
      cents += toCents(item.realized);
    }
  }
  return fromCents(cents);
}

function assertTotal(file: ImportFile): void {
  const computed = sumRealized(file.items);
  const expected = file.expectedTotal;
  if (toCents(computed) !== toCents(expected)) {
    const diff = fromCents(toCents(computed) - toCents(expected));
    console.error("TOTAL MISMATCH — aborting with no DB writes.");
    console.error(`  computed realized sum: ${computed.toFixed(2)}`);
    console.error(`  expectedTotal:         ${expected.toFixed(2)}`);
    console.error(`  diff:                  ${diff > 0 ? "+" : ""}${diff.toFixed(2)}`);
    process.exit(1);
  }
  console.log(`Total check OK: realized sum ${computed.toFixed(2)} === expectedTotal ${expected.toFixed(2)}`);
}

async function resolveUserId(explicitEmail: string | null): Promise<string> {
  const email = explicitEmail ?? process.env.IMPORT_USER_EMAIL ?? null;
  if (email) {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      throw new Error(`User not found for email: ${email}`);
    }
    console.log(`Using user: ${user.email}`);
    return user._id.toString();
  }

  const lazer = await Category.find({ name: "Lazer" });
  if (lazer.length === 1) {
    const user = await User.findById(lazer[0].userId);
    console.log(`Using user from Lazer category: ${user?.email ?? lazer[0].userId}`);
    return lazer[0].userId.toString();
  }

  if (lazer.length === 0) {
    throw new Error('No category named "Lazer" found. Pass --user-email or set IMPORT_USER_EMAIL.');
  }

  throw new Error(
    `Multiple users have a "Lazer" category (${lazer.length}). Pass --user-email or set IMPORT_USER_EMAIL.`,
  );
}

async function resolveCategoryId(userId: string, name: string): Promise<string> {
  const category = await Category.findOne({ userId, name });
  if (!category) {
    throw new Error(`Category not found for user: ${name}`);
  }
  return category._id.toString();
}

async function findParentLineItem(
  userId: string,
  yearMonth: string,
  parentLabel: string,
  categoryName: string,
): Promise<InstanceType<typeof LineItem>> {
  const month = await Month.findOne({ userId, yearMonth });
  if (!month) {
    throw new Error(`Month ${yearMonth} not found for user (needed for parent "${parentLabel}")`);
  }

  const categoryId = await resolveCategoryId(userId, categoryName);
  const parent = await LineItem.findOne({
    monthId: month._id,
    categoryId,
    label: parentLabel,
  });

  if (!parent) {
    throw new Error(
      `Parent LineItem "${parentLabel}" not found in ${yearMonth} / ${categoryName}. Create it first or fix the JSON.`,
    );
  }

  return parent;
}

function buildRecurrenceInput(item: ImportItem, yearMonth: string): RecurrenceInput {
  const rec = item.recurrence;
  if (!rec) {
    throw new Error(`Item #${item.id} is recurrent but has no recurrence config`);
  }

  const startYearMonth = rec.startYearMonth ?? yearMonth;

  if (rec.endType === "count") {
    if (rec.occurrenceCount == null) {
      throw new Error(`Item #${item.id} recurrence.count missing occurrenceCount`);
    }
    return {
      startYearMonth,
      endType: "count",
      occurrenceCount: rec.occurrenceCount,
    };
  }

  if (rec.endType === "until") {
    if (!rec.endYearMonth) {
      throw new Error(`Item #${item.id} recurrence.until missing endYearMonth`);
    }
    return {
      startYearMonth,
      endType: "until",
      endYearMonth: rec.endYearMonth,
    };
  }

  return { startYearMonth, endType: "never" };
}

async function importLineItem(
  userId: string,
  yearMonth: string,
  item: ImportItem,
): Promise<void> {
  if (!item.label) {
    throw new Error(`Item #${item.id} LineItem missing label`);
  }
  if (item.planned == null) {
    throw new Error(`Item #${item.id} LineItem missing planned`);
  }

  const categoryId = await resolveCategoryId(userId, item.category);
  const month = await ensureMonth(userId, yearMonth);

  const existing = await LineItem.findOne({
    monthId: month._id,
    label: item.label,
    categoryId,
  });
  if (existing) {
    throw new Error(
      `LineItem already exists in ${yearMonth}: "${item.label}" (${existing._id}). Aborting to avoid duplicates.`,
    );
  }

  if (item.recurrent) {
    const recurrence = buildRecurrenceInput(item, yearMonth);
    const { firstItem } = await createRecurringSeries(userId, {
      categoryId,
      type: "expense",
      label: item.label,
      plannedAmount: item.planned,
      realizedAmount: item.realized,
      recurrence,
    });
    console.log(
      `  [#${item.id}] series LineItem "${item.label}" planned=${item.planned} realized=${item.realized} → ${firstItem._id}`,
    );
    return;
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

  console.log(
    `  [#${item.id}] LineItem "${item.label}" planned=${item.planned} realized=${item.realized} → ${lineItem._id}`,
  );
}

async function importLineItemEntry(
  userId: string,
  yearMonth: string,
  item: ImportItem,
): Promise<void> {
  if (!item.parent) {
    throw new Error(`Item #${item.id} LineItemEntry missing parent`);
  }
  if (item.realized == null) {
    throw new Error(`Item #${item.id} LineItemEntry missing realized`);
  }

  const parent = await findParentLineItem(userId, yearMonth, item.parent, item.category);
  pushRealizedEntry(parent, item.realized, item.notes ?? null);
  await parent.save();

  console.log(
    `  [#${item.id}] Entry on "${item.parent}" amount=${item.realized} → parent ${parent._id}`,
  );
}

async function main(): Promise<void> {
  const { jsonPath, envPath, userEmail } = parseArgs(process.argv.slice(2));

  const envResult = loadEnv({ path: envPath });
  if (envResult.error) {
    console.error(`Failed to load env file: ${envPath}`);
    console.error(envResult.error.message);
    process.exit(1);
  }

  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI missing after loading env file (no secrets printed).");
    process.exit(1);
  }

  const file = JSON.parse(readFileSync(jsonPath, "utf8")) as ImportFile;
  if (!file.yearMonth || !Array.isArray(file.items) || file.expectedTotal == null) {
    console.error("Invalid import JSON: need yearMonth, expectedTotal, items[]");
    process.exit(1);
  }

  console.log(`Import file: ${jsonPath}`);
  console.log(`Target month: ${file.yearMonth}`);
  if (file.source) {
    console.log(`Source: ${file.source}`);
  }

  assertTotal(file);

  await connectDb();

  try {
    const userId = await resolveUserId(userEmail);
    await ensureMonth(userId, file.yearMonth);

    console.log(`Importing ${file.items.length} rows…`);

    for (const item of file.items) {
      if (item.type === "LineItem") {
        await importLineItem(userId, file.yearMonth, item);
      } else if (item.type === "LineItemEntry") {
        await importLineItemEntry(userId, file.yearMonth, item);
      } else {
        throw new Error(`Item #${item.id} unknown type: ${(item as ImportItem).type}`);
      }
    }

    await cascadeBalanceFrom(userId, file.yearMonth);
    console.log(`Balance cascade from ${file.yearMonth} complete.`);
    console.log("Import finished successfully.");
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
