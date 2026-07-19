#!/usr/bin/env node
/**
 * WCAG 2.1 contrast audit for Cotton Candy theme tokens.
 * Reads CSS variables from frontend/app/globals.css and frontend/design-system/tokens.css.
 *
 * Usage: pnpm contrast-check
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function blockVars(css, selector) {
  const pattern = new RegExp(`${selector.replace(".", "\\.")}\\s*\\{([^}]+)\\}`, "s");
  const block = css.match(pattern)?.[1] ?? "";
  const vars = {};

  for (const match of block.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    vars[match[1]] = match[2].trim();
  }

  return vars;
}

function resolveVar(name, ...maps) {
  let value = null;
  for (const map of maps) {
    if (map[name] !== undefined) value = map[name];
  }
  if (value === null) return null;

  const varRef = value.match(/^var\((--[\w-]+)(?:,\s*(#[0-9a-fA-F]{3,8}))?\)$/);
  if (varRef) {
    const resolved = resolveVar(varRef[1], ...maps);
    return resolved ?? varRef[2] ?? value;
  }

  if (/^#[0-9a-fA-F]{3,8}$/.test(value)) return value;
  return value;
}

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
}

function linearize(c) {
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map(linearize);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(fg, bg) {
  const l1 = luminance(fg);
  const l2 = luminance(bg);
  return +((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)).toFixed(2);
}

function mix(fg, bg, pct) {
  const f = hexToRgb(fg).map((x) => x * 255);
  const b = hexToRgb(bg).map((x) => x * 255);
  return (
    "#" +
    [0, 1, 2]
      .map((i) => Math.round(f[i] * pct + b[i] * (1 - pct)).toString(16).padStart(2, "0"))
      .join("")
  );
}

function grade(ratio, large = false) {
  const aa = large ? 3 : 4.5;
  if (ratio >= 7) return "AAA";
  if (ratio >= aa) return "AA";
  return "FAIL";
}

function parsePercent(value, fallback) {
  if (!value) return fallback;
  const n = parseFloat(String(value).replace("%", ""));
  return Number.isFinite(n) ? n / 100 : fallback;
}

function buildTheme(label, ...maps) {
  const g = (name) => resolveVar(name, ...maps);

  const card = g("--card");
  const subtleMix = parsePercent(g("--finance-subtle-mix"), label === "Light" ? 0.55 : 0.16);

  return {
    label,
    background: g("--background"),
    foreground: g("--foreground"),
    card,
    cardForeground: g("--card-foreground"),
    primary: g("--primary"),
    primaryFg: g("--primary-foreground"),
    secondaryFg: g("--secondary-foreground"),
    muted: g("--muted"),
    mutedFg: g("--muted-foreground"),
    link: g("--link"),
    border: g("--border"),
    incomeText: g("--finance-income-text"),
    expenseText: g("--finance-expense-text"),
    plannedText: g("--finance-planned-text"),
    balanceText: g("--finance-balance-text"),
    income: g("--finance-income") ?? g("--pastel-mint"),
    expense: g("--finance-expense") ?? g("--pastel-rose"),
    planned: g("--finance-planned") ?? g("--pastel-lavender"),
    destructiveFg: g("--destructive-foreground"),
    destructive: g("--destructive"),
    accentFg: g("--accent-foreground"),
    accent: g("--accent"),
    incomeSubtle: mix(g("--pastel-mint") ?? "#bbf7d0", card, subtleMix),
    expenseSubtle: mix(g("--pastel-rose") ?? "#fda4af", card, subtleMix),
    plannedSubtle: mix(g("--pastel-lavender") ?? "#e9d5ff", card, subtleMix),
  };
}

function checkPair(name, fg, bg, large = false) {
  if (!fg || !bg || !fg.startsWith("#") || !bg.startsWith("#")) {
    return { name, fg, bg, ratio: 0, grade: "SKIP", large, skipped: true };
  }
  const ratio = contrast(fg, bg);
  return { name, fg, bg, ratio, grade: grade(ratio, large), large };
}

function runTheme(t) {
  const pairs = [
    checkPair("body text", t.foreground, t.background),
    checkPair("body text on card", t.cardForeground, t.card),
    checkPair("muted text", t.mutedFg, t.background),
    checkPair("muted text on card", t.mutedFg, t.card),
    checkPair("primary button", t.primaryFg, t.primary),
    checkPair("pill-title (large)", t.primaryFg, t.primary, true),
    checkPair("secondary button", t.secondaryFg, t.muted),
    checkPair("link on background", t.link, t.background),
    checkPair("link on card", t.link, t.card),
    checkPair("link on muted (icons)", t.link, t.muted),
    checkPair("border vs background (UI)", t.border, t.background, true),
    checkPair("text-income on card", t.incomeText, t.card),
    checkPair("text-expense on card", t.expenseText, t.card),
    checkPair("text-planned on card", t.plannedText, t.card),
    checkPair("text-balance on card", t.balanceText, t.card),
    checkPair("foreground on income-subtle badge", t.foreground, t.incomeSubtle),
    checkPair("foreground on expense-subtle badge", t.foreground, t.expenseSubtle),
    checkPair("foreground on planned-subtle badge", t.foreground, t.plannedSubtle),
    checkPair("text-income on income-subtle badge", t.incomeText, t.incomeSubtle),
    checkPair("text-expense on expense-subtle badge", t.expenseText, t.expenseSubtle),
    checkPair("text-planned on planned-subtle badge", t.plannedText, t.plannedSubtle),
    checkPair("destructive alert text", t.destructiveFg, t.destructive),
    checkPair("accent filled text", t.accentFg, t.accent),
  ];

  console.log(`\n=== ${t.label} ===`);
  const fails = [];

  for (const p of pairs) {
    if (p.skipped) {
      console.log(`? SKIP              ${p.name} (unresolved color)`);
      continue;
    }
    const mark = p.grade === "FAIL" ? "FAIL" : p.grade === "AA" ? " OK " : " AAA";
    console.log(
      `${mark} ${String(p.ratio).padStart(5)}:1 [${p.grade.padEnd(3)}] ${p.name}`,
    );
    if (p.grade === "FAIL") fails.push(p);
  }

  return fails;
}

const globalsPath = path.join(root, "frontend/app/globals.css");
const tokensPath = path.join(root, "frontend/design-system/tokens.css");
const globalsCss = readFileSync(globalsPath, "utf8");
const tokensCss = readFileSync(tokensPath, "utf8");

const rootVars = blockVars(globalsCss, ":root");
const darkVars = blockVars(globalsCss, ".dark");
const tokenRoot = blockVars(tokensCss, ":root");
const tokenDark = blockVars(tokensCss, ".dark");

const light = buildTheme("Light (day)", rootVars, tokenRoot);
const dark = buildTheme("Dark (night)", rootVars, tokenRoot, darkVars, tokenDark);

console.log("Finance WCAG contrast check");
console.log(`Sources: ${path.relative(root, globalsPath)}, ${path.relative(root, tokensPath)}`);

const allFails = [...runTheme(light), ...runTheme(dark)];

console.log("\n=== SUMMARY ===");
console.log(`Total failures: ${allFails.length}`);

if (allFails.length) {
  console.log("\nFailed pairs:");
  for (const f of allFails) {
    console.log(` - ${f.name}: ${f.ratio}:1 (${f.fg} on ${f.bg})`);
  }
  process.exit(1);
}

console.log("All checked pairs pass WCAG AA.");
