# Responsive check (phone-app layout)

Capture screenshots at multiple viewports, analyze layout against our phone-app goals, propose fixes, and **wait for my approval before editing any files**.

## Step 1 — Ensure the app is running

The frontend must be reachable at `http://localhost:3000`.

1. Check whether `pnpm dev` is already running (API :4000, frontend :3000)
2. If not, start it: `pnpm dev`
3. Wait until the home page responds before capturing

First-time setup only (if Playwright browsers are missing):

```bash
npx playwright install chromium
```

## Step 2 — Capture screenshots

From the repo root:

```bash
pnpm responsive-check
```

This saves 48 full-page PNGs (2 themes x 3 months x 8 viewports) to `.responsive-audit/`:

```
.responsive-audit/
  light/
    current-month/
    previous-month/
    next-month/
  dark/
    current-month/
    previous-month/
    next-month/
```

Each folder contains one PNG per viewport:

- `iphone-se-375x667.png`
- `iphone-14-390x844.png`
- `iphone-14-pro-max-430x932.png`
- `ipad-mini-768x1024.png`
- `ipad-pro-1024x1366.png`
- `laptop-1280x800.png`
- `desktop-1440x900.png`
- `wide-1920x1080.png`

The months map to the seeded states: `previous-month` is fully realized, `current-month` is a mix of realized and planned, `next-month` is planned-only.

Read every screenshot and inspect the actual rendered layout — do not rely on code alone.

## Step 3 — Analyze against goals

Primary sources:

- `frontend/app/layout.tsx` — `phone-shell`, sticky `app-header`, safe areas
- `frontend/design-system/tokens.css` — shell, header, `finance-form` utilities
- `frontend/components/MonthSummary.tsx` — balance cards, month nav
- `frontend/components/CategorySection.tsx` — line items, category headers
- `frontend/components/AddLineItemForm.tsx`, `CategoryManager.tsx`
- `frontend/DESIGN_SYSTEM.md`

### Target experience
- **Mobile (375–430px):** feels like a native phone app — full width, stacked rows, no horizontal scroll, readable amounts, tappable controls
- **Tablet (768–1024px):** centered phone column; acceptable side gutters
- **Desktop (1280px+):** intentional **phone shell** (max ~448px) with pixel frame and dotted backdrop — not a stretched dashboard

### Checklist (note pass / issue per viewport where relevant)
- Phone shell width and desktop frame
- Sticky header and safe-area padding
- Balance cards: stack on xs, 2-col from `sm`, no amount truncation
- Month navigation and category header wrapping
- Line item rows: stack label/badges vs amount/actions on narrow screens
- Add/edit forms: `finance-form` stacks on mobile, inline from `sm`
- Dialogs (`CategoryManager`): fit narrow screens (`max-w-md` or similar)
- Touch targets and spacing
- Horizontal overflow or clipped text
- Dark mode: contrast and readability of amounts/badges, no broken or unthemed colors
- Month states: previous (all realized), current (mixed), next (planned-only) — badges, balances, and empty realized amounts render correctly in each

## Step 4 — Report (do not implement yet)

Present findings in this structure:

### Summary
- Overall phone-app score (mobile / tablet / desktop)
- Top 3 issues by impact

### Viewport matrix

| Viewport | Verdict | Notes |
|----------|---------|-------|

Verdicts: **Excellent** / **Good** / **OK** / **Needs work**

### Issues (prioritized)
For each issue:
1. **What** — observable problem (reference screenshot filename)
2. **Where** — component or CSS file
3. **Why it matters** — mobile usability or desktop phone-shell goal
4. **Proposed fix** — concrete Tailwind/CSS/class changes

### Proposed changes
Numbered list of specific edits (file + change). Prefer:
- Layout utilities in `tokens.css` over one-off inline styles
- Tailwind responsive prefixes (`sm:`, `md:`) consistent with existing patterns
- Reuse `finance-form`, `phone-shell`, `app-header` conventions

## Step 5 — Stop and ask

**Do not edit files, commit, or push.**

End with:

> Review the proposed changes above. Reply **approve** (or tell me which items to apply) and I will implement them, then re-run `pnpm responsive-check` and review the new screenshots.

Only proceed to Step 6 if I explicitly approve (e.g. "approve", "implement", "go ahead", "apply all", or approval of specific numbered items).

## Step 6 — Implement (only after approval)

1. Apply only the approved changes — minimal diff, match existing conventions
2. Re-run `pnpm responsive-check`
3. Re-read the updated screenshots and confirm each approved item is fixed
4. If new regressions appear, report them and **stop again** for approval
5. Do **not** commit unless I ask

Optional: update the responsive audit canvas at `canvases/responsive-audit.canvas.tsx` if one exists and the review benefits from a structured summary — only if I asked for a canvas or the prior session used one.
