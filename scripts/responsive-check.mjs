#!/usr/bin/env node
/**
 * Capture full-page screenshots at common viewports, in light and dark
 * mode, across the three seeded months (previous, current, next).
 * Also captures add-item modal and combobox-open states on current-month.
 * Requires the dev server at http://localhost:3000 (pnpm dev).
 *
 * Playwright reports env(safe-area-inset-*) as 0, so phone-sized viewports
 * also get a safe-area/ pass with injected insets (typical Android status bar).
 *
 * Usage: pnpm responsive-check
 * Output:
 *   .responsive-audit/<theme>/<month>/<viewport>.png
 *   .responsive-audit/<theme>/<month>/add-item-modal/<viewport>-modal.png
 *   .responsive-audit/<theme>/<month>/add-item-modal/<viewport>-combobox-open.png
 *   .responsive-audit/<theme>/<month>/safe-area/<viewport>.png
 *   .responsive-audit/<theme>/<month>/safe-area/add-item-modal/...
 */

import { chromium } from "playwright";
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, ".responsive-audit");
const url = process.env.RESPONSIVE_CHECK_URL ?? "http://localhost:3000";

// Matches SEED_DEV_EMAIL / SEED_DEV_PASSWORD defaults (pnpm seed).
const devEmail = process.env.RESPONSIVE_CHECK_EMAIL ?? "dev@finance.local";
const devPassword = process.env.RESPONSIVE_CHECK_PASSWORD ?? "password123";

/** Typical Android status-bar inset (Playwright cannot set env(safe-area-inset-*)). */
const SIMULATED_SAFE_AREA_TOP = 47;

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

const phoneViewports = viewports.filter((vp) => vp.width <= 430);

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

const currentMonth = months[0];

async function login(page) {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(url, { waitUntil: "networkidle" });
  if (!page.url().includes("/login")) {
    return;
  }
  await page.fill("#email", devEmail);
  await page.fill("#password", devPassword);
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.pathname.includes("/login"), { timeout: 15000 });
  await page.waitForTimeout(500);
}

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

async function applySafeArea(page, simulateSafeArea) {
  await page.evaluate(() => {
    document.getElementById("responsive-check-safe-area")?.remove();
  });
  if (simulateSafeArea) {
    await page.addStyleTag({
      id: "responsive-check-safe-area",
      content: `
        .app-header {
          padding-top: calc(1rem + ${SIMULATED_SAFE_AREA_TOP}px) !important;
        }
      `,
    });
  }
}

async function openAddItemModal(page, vp) {
  if (vp.width <= 430) {
    await page.locator('[data-testid="add-item-trigger-fab"]').click({ force: true });
    return;
  }

  if (vp.width >= 640) {
    await page.locator('[data-testid="add-item-trigger-header"]').click({ force: true });
    return;
  }

  // 431–639px: global triggers hidden — use first category link.
  await page.locator('[data-testid="add-item-trigger-category"]').click({ force: true });
}

async function captureScrollContainer(page, filePath, { expand = true } = {}) {
  const shell = page.locator(".phone-shell");
  const main = page.locator(".app-main");
  if ((await shell.count()) > 0) {
    if (expand) {
      await shell.evaluate((el) => {
        el.style.height = `${el.scrollHeight}px`;
        el.style.maxHeight = "none";
        el.style.overflow = "visible";
      });
      if ((await main.count()) > 0) {
        await main.evaluate((el) => {
          el.scrollTop = 0;
          el.style.height = `${el.scrollHeight}px`;
          el.style.maxHeight = "none";
          el.style.overflow = "visible";
        });
      } else {
        await shell.evaluate((el) => {
          el.scrollTop = 0;
        });
      }
      await page.waitForTimeout(50);
      await shell.screenshot({ path: filePath });
      await shell.evaluate((el) => {
        el.style.height = "";
        el.style.maxHeight = "";
        el.style.overflow = "";
      });
      if ((await main.count()) > 0) {
        await main.evaluate((el) => {
          el.style.height = "";
          el.style.maxHeight = "";
          el.style.overflow = "";
        });
      }
      return;
    }
    await shell.screenshot({ path: filePath });
    return;
  }

  const viewport = page.locator(".scroll-viewport");
  if ((await viewport.count()) > 0) {
    await viewport.screenshot({ path: filePath });
    return;
  }

  await page.screenshot({ path: filePath });
}

async function captureAddItemModal(page, { theme, vp, subdir, simulateSafeArea = false }) {
  const dir = path.join(outDir, theme, currentMonth.name, subdir, "add-item-modal");
  await mkdir(dir, { recursive: true });

  await applySafeArea(page, simulateSafeArea);
  await page.setViewportSize({ width: vp.width, height: vp.height });
  await page.emulateMedia({ colorScheme: theme });
  await page.goto(`${url}/${currentMonth.query}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);

  await openAddItemModal(page, vp);
  await page.getByRole("dialog", { name: "Add item" }).waitFor({ state: "visible" });
  await page.waitForTimeout(200);

  const baseName = `${vp.name}-${vp.width}x${vp.height}`;
  const modalFile = path.join(dir, `${baseName}-modal.png`);
  await captureScrollContainer(page, modalFile, { expand: false });
  console.log(`saved ${path.relative(root, modalFile)}`);

  const comboboxInput = page.locator('[data-testid="category-combobox-input"]');
  await comboboxInput.click();
  await page.locator('[data-testid="category-combobox-listbox"]').waitFor({ state: "visible" });
  await page.waitForTimeout(200);

  const comboboxFile = path.join(dir, `${baseName}-combobox-open.png`);
  await captureScrollContainer(page, comboboxFile, { expand: false });
  console.log(`saved ${path.relative(root, comboboxFile)}`);

  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);
}

async function captureViewport(page, { theme, month, vp, subdir, simulateSafeArea = false }) {
  const dir = path.join(outDir, theme, month.name, subdir);
  await mkdir(dir, { recursive: true });

  await applySafeArea(page, simulateSafeArea);
  await page.setViewportSize({ width: vp.width, height: vp.height });
  await page.emulateMedia({ colorScheme: theme });
  await page.goto(`${url}/${month.query}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);

  const file = path.join(dir, `${vp.name}-${vp.width}x${vp.height}.png`);
  await captureScrollContainer(page, file);
  console.log(`saved ${path.relative(root, file)}`);

  if (month.name === currentMonth.name && subdir === "") {
    await captureAddItemModal(page, { theme, vp, subdir: "", simulateSafeArea: false });
  }

  if (month.name === currentMonth.name && subdir === "safe-area") {
    await captureAddItemModal(page, { theme, vp, subdir: "safe-area", simulateSafeArea: true });
  }
}

await assertDevServer();
await rm(outDir, { recursive: true, force: true });

const browser = await chromium.launch();
const page = await browser.newPage();
await login(page);

const baseTotal = themes.length * months.length * viewports.length;
const safeAreaTotal = themes.length * months.length * phoneViewports.length;
const modalTotal = themes.length * (viewports.length * 2 + phoneViewports.length * 2);
const total = baseTotal + safeAreaTotal + modalTotal;

console.log(`Capturing ${total} screenshots from ${url}`);
console.log(
  `  ${baseTotal} standard (${themes.length} themes x ${months.length} months x ${viewports.length} viewports)`,
);
console.log(
  `  ${safeAreaTotal} safe-area (${themes.length} themes x ${months.length} months x ${phoneViewports.length} phone viewports)`,
);
console.log(
  `  ${modalTotal} modal (${themes.length} themes x (${viewports.length} + ${phoneViewports.length} safe-area) viewports x 2 states)`,
);
console.log(`Output: ${outDir}/\n`);

for (const theme of themes) {
  for (const month of months) {
    for (const vp of viewports) {
      await captureViewport(page, { theme, month, vp, subdir: "" });
    }
  }
}

for (const theme of themes) {
  for (const month of months) {
    for (const vp of phoneViewports) {
      await captureViewport(page, {
        theme,
        month,
        vp,
        subdir: "safe-area",
        simulateSafeArea: true,
      });
    }
  }
}

await browser.close();

console.log("\nDone. Open .responsive-audit/ to review screenshots.");
