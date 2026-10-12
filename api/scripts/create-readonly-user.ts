/**
 * Create a read-only login that views an existing account's finances.
 *
 * pnpm user:readonly -- --parent-email parent@example.com --email reader@example.com --name "Reader" --password "..."
 * pnpm user:readonly -- --env prod --parent-email parent@example.com --email reader@example.com --name "Reader" --password "..."
 */
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import mongoose from "mongoose";
import { connectDb } from "../src/db/connection.js";
import { User } from "../src/models/User.js";
import { hashPassword, normalizeEmail } from "../src/services/authService.js";

const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function readFlag(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  if (index === -1 || index + 1 >= process.argv.length) {
    return undefined;
  }
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) {
    return undefined;
  }
  return value;
}

function usage(): never {
  console.error(
    'Usage: pnpm user:readonly -- [--env local|prod] --parent-email <email> --email <email> --name <name> --password <password>',
  );
  process.exit(1);
}

const envName = readFlag("--env") ?? "local";
const parentEmailArg = readFlag("--parent-email");
const emailArg = readFlag("--email");
const nameArg = readFlag("--name");
const password = readFlag("--password");

if (envName !== "local" && envName !== "prod") {
  console.error("Unknown --env. Use local or prod.");
  process.exit(1);
}

if (!parentEmailArg || !emailArg || !nameArg?.trim() || !password) {
  usage();
}

if (password.length < 8) {
  console.error("Password must be at least 8 characters.");
  process.exit(1);
}

if (envName === "prod") {
  const envPath = path.resolve(apiRoot, "../.env.prod");
  if (!existsSync(envPath)) {
    console.error("Missing .env.prod");
    process.exit(1);
  }
  loadEnv({ path: envPath, quiet: true });
} else {
  loadEnv({ path: path.resolve(apiRoot, ".env"), quiet: true });
}

const parentEmail = normalizeEmail(parentEmailArg);
const email = normalizeEmail(emailArg);
const name = nameArg.trim();

async function main(): Promise<void> {
  await connectDb();
  try {
    const parent = await User.findOne({ email: parentEmail });
    if (!parent) {
      console.error("Parent account not found.");
      process.exitCode = 1;
      return;
    }
    if (parent.readOnly) {
      console.error("Parent account is read-only.");
      process.exitCode = 1;
      return;
    }
    if (email === parent.email) {
      console.error("Read-only email must be different from the parent email.");
      process.exitCode = 1;
      return;
    }

    const existing = await User.findOne({ email });
    if (existing) {
      console.error("An account with this email already exists.");
      process.exitCode = 1;
      return;
    }

    const passwordHash = await hashPassword(password);
    await User.create({
      name,
      email,
      passwordHash,
      readOnly: true,
      parentUserId: parent._id,
    });
    console.log(`Created read-only user ${email} for ${parent.email}`);
  } finally {
    await mongoose.disconnect();
  }
}

await main();
