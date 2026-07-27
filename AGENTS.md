# AGENTS.md

Guidance for AI agents working in this repository. See [README.md](README.md) for full setup, data model, and API docs; see [`@lina-rodrigues/cotton-candy`](https://github.com/lina-rodrigues/cotton-candy) ([DESIGN_SYSTEM.md](https://github.com/lina-rodrigues/cotton-candy/blob/main/DESIGN_SYSTEM.md); local pointer in [frontend/DESIGN_SYSTEM.md](frontend/DESIGN_SYSTEM.md)).

## Git workflow

**Never commit, push, or deploy on your own.** Always ask the repository owner first and wait for explicit approval in that conversation.

- After completing work, summarize what changed and propose a commit message — do not run `git commit` until they say to.
- Do not treat a prior "commit and deploy" in an older message as standing permission for later changes; each batch of work needs its own confirmation unless they clearly say otherwise (e.g. "commit as you go").
- Same rule for `git push` and `pnpm deploy`: ask first, then run only after approval.
- If the owner skips or rejects a deploy approval prompt, stop — do not retry deploy unless they ask again.

When approved, use [Conventional Commits](https://www.conventionalcommits.org/): `type(scope): description` with scopes `frontend` / `api`.

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
| `pnpm deploy` | Push `main` to GitHub and wait for Vercel production deploys (requires `VERCEL_TOKEN`; API `CANCELED` is normal for frontend-only changes) |
| `pnpm db:backup` | `mongodump` full database to `backups/finance-<timestamp>/` |
| `pnpm db:restore -- --path backups/... --confirm` | Restore a backup (`--drop` on target DB) |
| `pnpm db:migrate:realized-to-entries -- --check` | Scan for line items that block the realized→entries migration |

AI reports: set `CURSOR_API_KEY` in `.env`; edit [`api/prompts/financial-health-report.txt`](api/prompts/financial-health-report.txt) to change report behavior (requires Node 22.13+ for `@cursor/sdk`).

Cursor commands in `.cursor/commands/` (`/contrast-check`, `/responsive-check`) wrap these scripts with an analyze-propose-approve workflow.

### Verification workflow for UI changes

1. Make the change.
2. `pnpm contrast-check` — must report 0 failures.
3. `pnpm responsive-check`, then **actually read the screenshots** in `.responsive-audit/` (light and dark, all three months). Check specifically: nothing clipped or truncated (especially money amounts and badges), amounts right-aligned, both themes correct.
4. `.responsive-audit/` is generated output — never commit it or treat it as source.

## Design system

Canonical UI reference: [`@lina-rodrigues/cotton-candy` DESIGN_SYSTEM](https://github.com/lina-rodrigues/cotton-candy/blob/main/DESIGN_SYSTEM.md) (Cotton Candy palette, components, tokens, pitfalls, verification workflow).

After UI changes, run `pnpm contrast-check` and `pnpm responsive-check` (see Commands above).

## Code conventions

- TypeScript everywhere; API is ESM with Zod validation at route boundaries.
- Frontend mutations follow: call `lib/api.ts` helper -> `useMutationFeedback().run()` (handles loading state + success/error toasts) -> `router.refresh()`.
- Balance math lives in the API (`api/src/services/`); the frontend only displays `displayAmount` / `isRealized` from the month-view response.
- If the frontend misbehaves after changes, clear the Next cache: `cd frontend && rm -rf .next && pnpm dev`.
