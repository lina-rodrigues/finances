#!/usr/bin/env node
/**
 * Capture full-page screenshots at common viewports.
 * Requires the dev server at http://localhost:3000 (pnpm dev).
 *
 * Usage: pnpm responsive-check
 * Output: .responsive-audit/*.png
 */

import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, ".responsive-audit");
const url = process.env.RESPONSIVE_CHECK_URL ?? "http://localhost:3000";

const viewports = [
  { name: "iphone-se", width: 375, height: 667 },
  { name: "iphone-14", width: 390, height: 844 },
  { name: "iphone-14-pro-max", width: 430, height: 932 },
  { name: "ipad-mini", width: 768, height: 1024 },
  { name: "ipad-pro", width: 1024, height: 1366 },
  { name: "laptop", width: 1280, height: 800 },
  { name: "desktop", width: 1440, height: 900 },
  { name: "wide", width: 1920, height: 1080 },
];

async function assertDevServer() {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
  } catch {
    console.error(`Could not reach ${url}. Start the app first:\n\n  pnpm dev\n`);
    process.exit(1);
  }
}

await assertDevServer();
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage();

console.log(`Capturing ${viewports.length} viewports from ${url}`);
console.log(`Output: ${outDir}/\n`);

for (const vp of viewports) {
  await page.setViewportSize({ width: vp.width, height: vp.height });
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);

  const file = path.join(outDir, `${vp.name}-${vp.width}x${vp.height}.png`);
  await page.screenshot({ path: file, fullPage: true });
  console.log(`saved ${path.relative(root, file)}`);
}

await browser.close();

console.log("\nDone. Open .responsive-audit/ to review screenshots.");
