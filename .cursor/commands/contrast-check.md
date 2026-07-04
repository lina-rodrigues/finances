# Contrast check (WCAG AA)

Run a WCAG 2.1 contrast audit on the Cotton Candy theme, report failures, propose token-level fixes, and **wait for my approval before editing any files**.

## Step 1 — Run the audit

From the repo root:

```bash
pnpm contrast-check
```

If Playwright or the dev server is not needed for this command — it reads CSS only.

## Step 2 — Analyze results

Primary sources (read these when interpreting failures or proposing fixes):

- `frontend/app/globals.css` — shadcn/Pixelact theme vars (`:root`, `.dark`)
- `frontend/design-system/tokens.css` — semantic finance colors, `--finance-*-text`, `--finance-subtle-mix`
- `frontend/DESIGN_SYSTEM.md` — contrast rules and token conventions

Also scan components for **hardcoded colors** or pastel classes used as text (e.g. `text-[#…]`, inline styles, or using fill pastels for readable text). Flag anything that bypasses the token system.

## Step 3 — Report (do not implement yet)

Present findings in this structure:

### Summary
- Pass / fail count for Light and Dark themes
- Overall verdict (passes AA or not)

### Failures table
For each failing pair from the script output:

| Pair | Theme | Ratio | Required | Current fg | Current bg | Suggested fix |
|------|-------|-------|----------|------------|------------|---------------|

### Additional issues
Hardcoded colors or component-level problems the script does not cover.

### Proposed changes
Numbered list of **specific** edits, each with:
- File and CSS variable (or class) to change
- Current value → proposed value
- Expected new ratio (estimate if needed)
- Why this preserves the Cotton Candy look

### Fix strategy (follow when proposing)
- Keep **pastels** (`--pastel-*`, `--finance-income`, etc.) for fills, borders, and badges
- Use darker **`--finance-*-text`** tokens for readable amounts and labels in light mode
- Tune **`--finance-subtle-mix`** when badge foreground-on-subtle fails
- Prefer token changes in `tokens.css` and `globals.css` over per-component overrides
- Fix both **light and dark** themes when relevant

## Step 4 — Stop and ask

**Do not edit files, commit, or push.**

End with:

> Review the proposed changes above. Reply **approve** (or tell me which items to apply) and I will implement them, then re-run `pnpm contrast-check` to confirm 0 failures.

Only proceed to Step 5 if I explicitly approve (e.g. "approve", "implement", "go ahead", "apply all", or approval of specific numbered items).

## Step 5 — Implement (only after approval)

1. Apply only the approved changes — minimal diff, match existing conventions
2. Re-run `pnpm contrast-check` and show full output
3. If failures remain, propose a follow-up fix list and **stop again** for approval
4. Do **not** commit unless I ask
