#!/usr/bin/env node
/**
 * Restore MongoDB from a mongodump backup.
 *
 * Usage:
 *   pnpm db:restore -- --path backups/finance-... --confirm
 */

import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { getDbName, loadMongoUri, root } from "./env.mjs";

function commandExists(command) {
  try {
    execSync(`command -v ${command}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function dockerComposeAvailable() {
  try {
    execSync("docker compose version", { stdio: "ignore", cwd: root });
    return true;
  } catch {
    return false;
  }
}

function printHelp() {
  console.log(`Usage: pnpm db:restore -- --path <backup-dir> --confirm

Restores a mongodump backup created by pnpm db:backup.
Requires --confirm to prevent accidental data loss.`);
}

function parseArgs(argv) {
  const options = { backupPath: null, confirm: false };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--") {
      continue;
    }
    if (arg === "--path") {
      options.backupPath = argv[index + 1] ?? null;
      index += 1;
    } else if (arg === "--confirm") {
      options.confirm = true;
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

function main() {
  const options = parseArgs(process.argv.slice(2));

  if (!options.backupPath) {
    console.error("--path is required.");
    printHelp();
    process.exit(1);
  }

  if (!options.confirm) {
    console.error("Refusing to restore without --confirm.");
    process.exit(1);
  }

  const backupPath = path.isAbsolute(options.backupPath)
    ? options.backupPath
    : path.join(root, options.backupPath);

  if (!existsSync(backupPath)) {
    console.error(`Backup path not found: ${backupPath}`);
    process.exit(1);
  }

  const uri = loadMongoUri();
  const dbName = getDbName(uri);
  const dumpDbPath = path.join(backupPath, dbName);

  if (!existsSync(dumpDbPath)) {
    console.error(`Expected database folder not found: ${dumpDbPath}`);
    process.exit(1);
  }

  console.log(`Restoring "${dbName}" from ${backupPath} ...`);
  console.log("WARNING: This drops existing collections in the target database.");

  if (commandExists("mongorestore")) {
    try {
      execSync(`mongorestore --uri="${uri}" --drop "${dumpDbPath}"`, {
        stdio: "inherit",
      });
      console.log("\nRestore complete.");
      return;
    } catch {
      console.error("\nmongorestore failed.");
      process.exit(1);
    }
  }

  if (dockerComposeAvailable()) {
    const containerBackup = `/tmp/finance-restore-${Date.now()}`;
    try {
      execSync(`docker compose cp "${dumpDbPath}" mongodb:${containerBackup}`, {
        stdio: "inherit",
        cwd: root,
      });
      execSync(
        `docker compose exec -T mongodb mongorestore --uri="${uri}" --drop "${containerBackup}/${dbName}"`,
        { stdio: "inherit", cwd: root },
      );
      execSync(`docker compose exec -T mongodb rm -rf "${containerBackup}"`, {
        stdio: "ignore",
        cwd: root,
      });
      console.log("\nRestore complete (via Docker).");
      return;
    } catch {
      console.error("\nDocker mongorestore failed.");
      process.exit(1);
    }
  }

  console.error("mongorestore not found and Docker Compose unavailable.");
  process.exit(1);
}

main();
