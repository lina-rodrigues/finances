#!/usr/bin/env node
/**
 * Capture full-page screenshots at common viewports, in light and dark
 * mode, across the three seeded months (previous, current, next).
 * Requires the dev server at http://localhost:3000 (pnpm dev).
 *
 * Usage: pnpm responsive-check
 * Output: .responsive-audit/<theme>/<month>/<viewport>.png
 */

import { chromium } from "playwright";
import { mkdir, rm } from "node:fs/promises";
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

const themes = ["light", "dark"];

// Mirrors getCurrentYearMonth / prevYearMonth / nextYearMonth in frontend/lib/api.ts
function shiftYearMonth(offset) {
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

const months = [
  { name: "current-month", query: "" },
  { name: "previous-month", query: `?month=${shiftYearMonth(-1)}` },
  { name: "next-month", query: `?month=${shiftYearMonth(1)}` },
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
await rm(outDir, { recursive: true, force: true });

const browser = await chromium.launch();
const page = await browser.newPage();

const total = themes.length * months.length * viewports.length;
console.log(
  `Capturing ${total} screenshots (${themes.length} themes x ${months.length} months x ${viewports.length} viewports) from ${url}`,
);
console.log(`Output: ${outDir}/\n`);

for (const theme of themes) {
  await page.emulateMedia({ colorScheme: theme });

  for (const month of months) {
    const dir = path.join(outDir, theme, month.name);
    await mkdir(dir, { recursive: true });

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(`${url}/${month.query}`, { waitUntil: "networkidle" });
      await page.waitForTimeout(500);

      const file = path.join(dir, `${vp.name}-${vp.width}x${vp.height}.png`);
      await page.screenshot({ path: file, fullPage: true });
      console.log(`saved ${path.relative(root, file)}`);
    }
  }
}

await browser.close();

console.log("\nDone. Open .responsive-audit/ to review screenshots.");
