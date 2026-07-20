#!/usr/bin/env node
/**
 * Backup MongoDB to backups/finance-<timestamp>/
 *
 * Usage:
 *   pnpm db:backup
 *
 * Requires mongodump (MongoDB Database Tools).
 */

import { execSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
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

function timestampLabel() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function printHelp() {
  console.log(`Usage: pnpm db:backup

Creates a mongodump archive under backups/finance-<timestamp>/

Requires mongodump in PATH (MongoDB Database Tools).
Docker fallback: docker compose exec -T mongodb mongodump --uri=... --out=/tmp/backup`);
}

function main() {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    printHelp();
    process.exit(0);
  }

  const uri = loadMongoUri();
  const dbName = getDbName(uri);
  const backupDir = path.join(root, "backups", `finance-${timestampLabel()}`);

  if (existsSync(backupDir)) {
    console.error(`Backup path already exists: ${backupDir}`);
    process.exit(1);
  }

  mkdirSync(backupDir, { recursive: true });

  console.log(`Backing up database "${dbName}" to ${backupDir} ...`);

  if (commandExists("mongodump")) {
    try {
      execSync(`mongodump --uri="${uri}" --out="${backupDir}"`, {
        stdio: "inherit",
      });
      console.log("\nBackup complete.");
      console.log(`Restore with: pnpm db:restore -- --path ${backupDir} --confirm`);
      return;
    } catch {
      console.error("\nmongodump failed.");
      process.exit(1);
    }
  }

  if (dockerComposeAvailable()) {
    const containerBackup = `/tmp/finance-backup-${Date.now()}`;
    try {
      execSync(
        `docker compose exec -T mongodb mongodump --uri="${uri}" --out="${containerBackup}"`,
        { stdio: "inherit", cwd: root },
      );
      execSync(`docker compose cp mongodb:${containerBackup}/. "${backupDir}"`, {
        stdio: "inherit",
        cwd: root,
      });
      execSync(`docker compose exec -T mongodb rm -rf "${containerBackup}"`, {
        stdio: "ignore",
        cwd: root,
      });
      console.log("\nBackup complete (via Docker).");
      console.log(`Restore with: pnpm db:restore -- --path ${backupDir} --confirm`);
      return;
    } catch {
      console.error("\nDocker mongodump failed.");
      process.exit(1);
    }
  }

  console.error("mongodump not found and Docker Compose unavailable.");
  console.error("Install MongoDB Database Tools or start Docker Compose mongodb.");
  process.exit(1);
}

main();
