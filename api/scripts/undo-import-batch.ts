/**
 * Undo an import batch in the DB (same logic as POST /imports/:id/undo).
 * Usage: pnpm exec tsx scripts/undo-import-batch.ts --env ../.env.prod --id <batchId>
 */
import { config as loadEnv } from "dotenv";
import path from "node:path";
import mongoose from "mongoose";
import { connectDb } from "../src/db/connection.js";
import { ImportBatch } from "../src/models/ImportBatch.js";
import { ImportTransactionId } from "../src/models/ImportTransactionId.js";
import { LineItem } from "../src/models/LineItem.js";
import { undoImportBatch } from "../src/services/importApplyService.js";

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
    console.error("Usage: tsx scripts/undo-import-batch.ts --env <.env.prod> --id <batchId>");
    process.exit(1);
  }
  return { envPath, batchId };
}

const ENTRY_IDS = [
  "6a9c29dc8e99ba7d0726cd4f",
  "6a9c29dc8e99ba7d0726cd56",
  "6a9c29dc8e99ba7d0726cd5e",
  "6a9c29dc8e99ba7d0726cd65",
  "6a9c29dc8e99ba7d0726cd6d",
];

async function main() {
  const { envPath, batchId } = parseArgs(process.argv.slice(2));
  loadEnv({ path: envPath });
  await connectDb();

  const before = await ImportBatch.findById(batchId).lean();
  if (!before) {
    console.log(JSON.stringify({ error: "BATCH_NOT_FOUND", batchId }));
    process.exit(1);
  }

  const userId = before.userId.toString();
  const result = await undoImportBatch(userId, batchId);

  const remainingFitIds = await ImportTransactionId.countDocuments({ importBatchId: batchId });
  const remainingEntries = [];
  for (const entryId of ENTRY_IDS) {
    const parent = await LineItem.findOne({ "entries._id": entryId }).lean();
    if (parent) {
      remainingEntries.push({ entryId, parentId: parent._id.toString(), label: parent.label });
    }
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        batchId,
        beforeStatus: before.status,
        afterStatus: result.status,
        afterError: result.error,
        afterAppliedActions: result.appliedActions.length,
        remainingFitIds,
        remainingImportEntries: remainingEntries,
      },
      null,
      2,
    ),
  );

  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
