# AGENTS.md

Guidance for AI agents working in this repository. See [README.md](README.md) for full setup, data model, and API docs; see [frontend/DESIGN_SYSTEM.md](frontend/DESIGN_SYSTEM.md) for the design system.

## What this app is

A personal finance tracker: monthly income/expense line items with planned vs. realized amounts, flat customizable categories, and automatic balance carry-forward between months. Single page (month view) with a retro pixel-art "Cotton Candy" pink/purple aesthetic.

## Architecture

pnpm monorepo, two independently deployable packages. The frontend never touches MongoDB directly — it always goes through the API over HTTP.

| Package | Tech | Port |
|---------|------|------|
| `api/` | Express + Mongoose + Zod + TypeScript (ESM, `tsx`) | 4000 |
| `frontend/` | Next.js 15 App Router + React 19 + Tailwind CSS 4 | 3000 |

- MongoDB and Mailpit run via `docker compose up -d` (root `docker-compose.yml`). Mailpit UI: http://localhost:8025.
- `api/src/`: `routes/` (REST + auth), `services/` (balance cascade, auth, email), `models/`, `schemas/` (Zod), `constants/categoryIcons.ts` (allowed icon keys — must stay in sync with `frontend/lib/icons.ts` `categoryIcons`).
- `frontend/app/(app)/page.tsx` is a server component (uses `lib/api-server.ts` with cookie forwarding); auth pages live under `frontend/app/(auth)/`. Interactive pieces call `frontend/lib/api.ts` (client, `credentials: "include"`) then `router.refresh()`.
- Auth: custom JWT in httpOnly cookie (`finance-token`). Settings in `SettingsDialog` (gear icon). i18n via `frontend/lib/i18n.tsx` + `messages/{en,pt}.json`.

## Commands

Run from the repo root:

| Command | Purpose |
|---------|---------|
| `pnpm dev` | Run API + frontend in parallel (check if already running first — it usually is) |
| `pnpm seed` / `pnpm seed:fresh` | Seed dev user + demo data (`seed:fresh` drops all users/data) |
| `pnpm build` | Build both packages |
| `pnpm contrast-check` | WCAG AA audit of theme colors (reads CSS only, no server needed) |
| `pnpm responsive-check` | Playwright screenshots: 2 themes x 3 months x 8 viewports into `.responsive-audit/<theme>/<month>/` (requires dev server on :3000) |

Cursor commands in `.cursor/commands/` (`/contrast-check`, `/responsive-check`) wrap these scripts with an analyze-propose-approve workflow.

### Verification workflow for UI changes

1. Make the change.
2. `pnpm contrast-check` — must report 0 failures.
3. `pnpm responsive-check`, then **actually read the screenshots** in `.responsive-audit/` (light and dark, all three months). Check specifically: nothing clipped or truncated (especially money amounts and badges), amounts right-aligned, both themes correct.
4. `.responsive-audit/` is generated output — never commit it or treat it as source.

## Design system rules

Built on Pixelact UI (pixel-art components wrapping shadcn/ui) + Pixelarticons. Key files:

- `frontend/app/globals.css` — theme vars (`:root` light, `.dark` dark), Tailwind `@theme inline` mappings
- `frontend/design-system/tokens.css` — semantic finance colors, layout utilities (`.phone-shell`, `.inventory-slot`, `.pill-title`)
- `frontend/design-system/typography.css`, `interactions.css` — font classes, motion
- `frontend/components/ui/pixelact-ui/` — component wrappers; `styles/styles.css` defines `--pixel-box-shadow`

Conventions:

- Import components from `@/components/ui/pixelact-ui/*`, not `@/components/ui/*` (those are the raw shadcn bases).
- Icons only via `<Icon name="..." />` (`frontend/components/Icon.tsx`) backed by the registry in `frontend/lib/icons.ts`. To add an icon: import from `pixelarticons/react/*`, add to `IconName`, `iconMap`, and `iconColorMap`. No lucide icons in app UI.
- Status is always icon + color + text label — never color alone.
- Amounts use `.text-amount` (JetBrains Mono, tabular-nums); income green `+$X` (`.text-income`), expense rose `-$X` (`.text-expense`). Never allow money to be clipped or truncated.
- Headings use `.text-display` (Press Start 2P). Fonts are self-hosted via `next/font` (`frontend/lib/fonts.ts`) — never add Google Fonts CDN `@import`s.
- Colors come from CSS variables; never hardcode hex/white/black in components. New colors need both `:root` and `.dark` values, a Tailwind `@theme inline` mapping if used as a utility class, and a `scripts/contrast-check.mjs` entry if text sits on a background.
- Use the pixel `ConfirmDialog` (`frontend/components/ConfirmDialog.tsx`) for destructive confirmations — never native `confirm()`.
- Toasts go through `useMutationFeedback` / `useToast` (`pixelact-ui/toast.tsx`), which render custom pixel toasts via sonner.

### Known pitfalls (learned the hard way)

- **Un-layered CSS beats Tailwind utilities.** `design-system/*.css` rules are un-layered, so they override Tailwind's layered utility classes regardless of order. Example: `.app-header`'s `padding-top` silently killed `py-4`. When a Tailwind class "doesn't work", check the design-system CSS first.
- **Don't name custom classes after Tailwind utilities.** The balance color class is `.text-fin-balance` because `.text-balance` collides with Tailwind's `text-wrap: balance`.
- **Utility classes must be mapped.** A `text-foo` class only works if `--color-foo` exists in the `@theme inline` block of `globals.css`. Unmapped classes fail silently.
- **Pixel shadows are simulated borders.** `--pixel-box-shadow` draws 4px on each side and needs the `box-shadow-margin` class (or 4px margin) to avoid overlap; keep it defined on `var(--foreground)` (light) / `var(--ring)` (dark), never hardcoded black.
- **Press Start 2P is very wide.** Test pixel-font text with realistic content (long amounts, long labels) at 375px; it overflows long before body text does.
- **Layout is a phone shell.** `.phone-shell` caps width (28rem, 56rem at `lg` where categories go 2-column). Full-bleed below 768px, framed above.

## Code conventions

- TypeScript everywhere; API is ESM with Zod validation at route boundaries.
- Frontend mutations follow: call `lib/api.ts` helper -> `useMutationFeedback().run()` (handles loading state + success/error toasts) -> `router.refresh()`.
- Balance math lives in the API (`api/src/services/`); the frontend only displays `displayAmount` / `isRealized` from the month-view response.
- Commits use [Conventional Commits](https://www.conventionalcommits.org/): `type(scope): description` with scopes `frontend` / `api`, e.g. `feat(frontend): add month navigation`, `fix(api): correct balance cascade`.
- If the frontend misbehaves after changes, clear the Next cache: `cd frontend && rm -rf .next && pnpm dev`.
