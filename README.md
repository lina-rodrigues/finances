# Finance

A personal finance application for tracking monthly income and expenses with planned vs. realized amounts, flat customizable categories, and automatic balance carry-forward.

## Demo

A public demo is available at [finances-demo.linarodrigues.dev](https://finances-demo.linarodrigues.dev).

Email: `demo@linarodrigues.dev`
Password: `Demo1234`

The account already has sample income and expenses for October 2026, with salary, rent, and internet repeating into later months. AI reports and AI import features are turned off on this demo.

## Architecture

The project is a **pnpm monorepo** with two independently deployable packages:

| Package | Tech | Port | Role |
|---------|------|------|------|
| [`api/`](api/) | Express, Mongoose, TypeScript | 4000 | REST API, MongoDB access, balance recalculation |
| [`frontend/`](frontend/) | Next.js (App Router), React, Web Awesome Pro | 3000 | SSR UI, calls API over HTTP |

```
┌─────────────┐     HTTP      ┌─────────────┐     MongoDB    ┌─────────────┐
│  Frontend   │ ────────────► │     API     │ ─────────────► │  MongoDB    │
│  (Next.js)  │               │  (Express)  │                │  (Docker)   │
└─────────────┘               └─────────────┘                └─────────────┘
```

There is no shared runtime between API and frontend — the frontend never accesses the database directly.

## Contributing

This project uses [Conventional Commits](https://www.conventionalcommits.org/) for all commit messages. Use the format `type(scope): description`, for example:

- `feat(frontend): add month navigation`
- `fix(api): correct balance cascade`
- `docs: update setup instructions`

Common types: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, and `build`.

## Design

The frontend uses **[Web Awesome Pro](https://webawesome.com/)** (`@web.awesome.me/webawesome-pro`) via npm — Active theme, Shoelace palette, green brand. See [`frontend/DESIGN_SYSTEM.md`](frontend/DESIGN_SYSTEM.md). Agent skills: [`skills/webawesome`](skills/webawesome/), [`skills/webawesome-design`](skills/webawesome-design/).

### Private package installs (local + Vercel)

Local: put the Cloudsmith registry for `@web.awesome.me` (and any remaining GitHub Packages registries) plus auth tokens in your user `~/.npmrc`.

Vercel (**frontend and API** projects): set sensitive env var **`NPM_RC`** (Production + Preview) to a multiline `.npmrc` that includes the public npm registry and Web Awesome Pro (Cloudsmith) auth, per [Using private dependencies with Vercel](https://vercel.com/kb/guide/using-private-dependencies-with-vercel). The API needs this too because the monorepo `pnpm install` resolves frontend packages from the shared lockfile.

## Features (v1)

- **User accounts** — custom JWT auth (login, signup with invitation code, forgot/reset password)
- **Per-user data** — categories, months, and line items scoped by `userId`
- **Settings page** (`/settings`) — name, theme (system/light/dark), currency (full ISO list, BRL/USD pinned), language (EN/PT), AI report tone
- **i18n** — English and Portuguese via `frontend/messages/{en,pt}.json`
- **Monthly view** with previous/next month navigation on Categories and Reports
- **Flat categories** with Font Awesome icons via `<wa-icon>` and drag reorder on Manage
- **Category management** — rename, pick icons, reorder, add, and delete via `/categories/manage`
- **Income and expense line items** with planned and realized amounts
- **Last month balance** — automatically carried forward from the previous month's ending balance
- **Collapsible category sections** (`wa-details`) with per-category totals

## Prerequisites

- Node.js 20+
- [pnpm](https://pnpm.io/) 9+
- Docker and Docker Compose

## Quick Start

1. **Start MongoDB and Mailpit**

   ```bash
   docker compose up -d
   ```

   Mailpit web UI: http://localhost:8025 (captures password-reset emails in dev).

2. **Configure environment**

   ```bash
   cp .env.example .env
   cp .env.example api/.env
   cp .env.example frontend/.env.local
   ```

3. **Install dependencies**

   ```bash
   pnpm install
   ```

4. **Seed demo data (optional)**

   Creates a dev user (`dev@finance.local` / `password123`) with sample categories and line items:

   ```bash
   pnpm seed:fresh
   ```

   Or sign up at http://localhost:3000/signup with the `INVITATION_CODE` from your `.env`.

5. **Run both services**

   ```bash
   pnpm dev
   ```

   - Frontend: http://localhost:3000
   - API: http://localhost:4000

If the frontend shows errors after pulling changes, restart with a clean cache:

```bash
cd frontend && rm -rf .next && pnpm dev
```

## Database backup and migration

Requires [MongoDB Database Tools](https://www.mongodb.com/docs/database-tools/) (`mongodump` / `mongorestore`) in PATH. Docker alternative: `docker compose exec -T mongodb mongodump ...`.

**Before migrating production** (removes the legacy `realizedAmount` field from line items):

```bash
pnpm db:backup
pnpm db:migrate:realized-to-entries -- --check          # fix MISMATCH / ORPHAN_ENTRIES until exit 0
pnpm db:migrate:realized-to-entries -- --dry-run        # review planned conversions
pnpm db:migrate:realized-to-entries -- --apply          # run after backup; deploy new API next
# rollback if needed:
pnpm db:restore -- --path backups/finance-<timestamp> --confirm
```

Realized amounts are stored as embedded **entries** on each line item. The API still returns computed `realizedAmount` in JSON for the UI.

## Credit card statement import (local)

For bulk-importing mapped JSON (CLI), see below. **Preferred:** use the in-app **Imports** tab to upload an **OFX** statement, review AI-mapped rows, then confirm (with undo).

### In-app OFX imports

1. Open **Imports** in the sidebar.
2. Choose the target `yearMonth` and upload an `.ofx` file.
3. Upload starts a Cursor cloud agent and stores its run id; the API returns immediately with status **Pending**.
4. Reloading the Imports list (or opening the import) polls that run. When it finishes, status becomes **Waiting confirmation** (editable review), then **Done** after you confirm.
5. Soft-delete rows you want ignored forever after confirm (FITID tombstone). Undo hard-deletes all finance writes from that import and returns to review. Delete import is only for non-Done batches.

### CLI JSON import (escape hatch)

For bulk-importing a Nubank (or similar) credit card bill into a month via JSON, use the local script [`api/scripts/import-credit-card.ts`](api/scripts/import-credit-card.ts). It writes via Mongoose (same models as the API) — there is no bulk HTTP endpoint for JSON.

Typical flow: pay the card in month **M**, map every purchase on that invoice into month **M** (not the CSV transaction dates), put the mapping in a JSON file, then run the importer against the target DB (usually `.env.prod`).

### Workflow

1. Export the statement CSV from the bank.
2. Create a mapping file at the repo root (example name: `credit-card-08-2026.json`). Prefer keeping personal statement JSONs out of git.
3. Fill `items` (see schema below). Roll IOF into the related foreign charge when the CSV lists it separately. Skip card payments (`Pagamento recebido`).
4. Set `expectedTotal` to the statement purchase total you expect.
5. Run the importer. It **sums every item’s `realized`** (cent-safe math) and **aborts with no DB writes** if that sum ≠ `expectedTotal`. Fix the JSON and re-run.
6. On success it creates line items / entries / recurring series and cascades balances from that month forward.

```bash
# from repo root — paths are relative to api/
pnpm import:credit-card -- --json ../credit-card-08-2026.json --env ../.env.prod

# optional: pin the user when several accounts share category names
pnpm import:credit-card -- --json ../credit-card-08-2026.json --env ../.env.prod --user-email you@example.com
```

Requirements:

- `.env.prod` (or another env file) with `MONGODB_URI` — never commit env files.
- Target categories must already exist by **name** (e.g. `Lazer`, `Pessoal`, `Formação`, `Alimentação`).
- For `LineItemEntry` rows, the parent line item must already exist in that `yearMonth` (matched by `parent` label + category).
- Re-running the same labels in the same month fails on purpose (duplicate guard).

User resolution: `--user-email` / `IMPORT_USER_EMAIL`, otherwise the single user who owns a category named `Lazer`.

### JSON shape

```json
{
  "yearMonth": "2026-08",
  "source": "Nubank_2026-08-05.csv",
  "expectedTotal": 2261.98,
  "skipped": [
    { "date": "2026-07-03", "title": "Pagamento recebido", "amount": -1208.18 }
  ],
  "items": []
}
```

| Field | Description |
|-------|-------------|
| `yearMonth` | Target month `YYYY-MM` (usually the month you paid the card) |
| `source` | Optional note (CSV filename) |
| `expectedTotal` | Hard gate: must equal sum of all non-null `items[].realized` |
| `skipped` | Optional audit list of rows not imported (payments, etc.) |
| `items` | Rows to import (see below) |

### Item fields

| Field | `LineItem` | `LineItemEntry` |
|-------|------------|-----------------|
| `type` | `"LineItem"` | `"LineItemEntry"` |
| `label` | Display name (subscriptions often use `Assinatura: …`) | `null` |
| `category` | Existing category name | Existing category name of the parent |
| `parent` | `null` | Parent line item **label** in that month |
| `planned` | Planned amount on the new line item | `null` (parent planned unchanged) |
| `realized` | Realized amount (creates one entry); counted in `expectedTotal` | Entry amount; counted in `expectedTotal` |
| `recurrent` | `true` → create a `RecurringSeries` | `false` |
| `recurrence` | `{ "endType": "never" }` or `{ "endType": "count", "occurrenceCount": N, "startYearMonth": "YYYY-MM" }` | `null` |
| `notes` | Optional | Optional; stored on the entry |

Rules of thumb:

- **New purchase / subscription** → `LineItem` with `planned` + `realized` (and `recurrent` when it should continue monthly).
- **Charge against an existing row** (e.g. more iFood on `iFood`) → `LineItemEntry` with `parent` set; do not change the parent’s planned amount.
- **Finite installments** → `LineItem` + `recurrence.endType: "count"` (e.g. remaining parcels including the current month). Only the top-level August `realized` counts toward `expectedTotal` — do not also sum `recurrence.materialize[].realized`.
- Subscriptions that are already cancelled or moved accounts: use the `Assinatura: ` label if you want, but set `recurrent: false`.

Example items:

```json
{
  "id": 1,
  "type": "LineItem",
  "label": "Assinatura: Spotify",
  "category": "Lazer",
  "parent": null,
  "planned": 59.9,
  "realized": 59.9,
  "recurrent": true,
  "recurrence": { "endType": "never" },
  "notes": "Dl*Google Spotif"
}
```

```json
{
  "id": 2,
  "type": "LineItemEntry",
  "label": null,
  "category": "Lazer",
  "parent": "iFood",
  "planned": null,
  "realized": 136.78,
  "recurrent": false,
  "recurrence": null,
  "notes": "iFood - NuPay"
}
```

## Environment Variables

| Variable | Package | Default | Description |
|----------|---------|---------|-------------|
| `PORT` | api | `4000` | API server port |
| `MONGODB_URI` | api | `mongodb://localhost:27017/finance` | MongoDB connection string |
| `CORS_ORIGIN` | api | `http://localhost:3000` | Allowed frontend origin |
| `JWT_SECRET` | api | — | Secret for signing auth cookies (required) |
| `INVITATION_CODE` | api | — | Required code for signup |
| `FRONTEND_URL` | api | `http://localhost:3000` | Base URL for password-reset links |
| `SMTP_HOST` | api | `localhost` | SMTP host (Mailpit in dev) |
| `SMTP_PORT` | api | `1025` | SMTP port |
| `SMTP_FROM` | api | `finance@localhost` | From address for emails |
| `NEXT_PUBLIC_API_URL` | frontend | `http://localhost:4000` | API base URL for fetch calls |
| `SEED_DEV_EMAIL` | api | `dev@finance.local` | Dev user email for seed script |
| `SEED_DEV_PASSWORD` | api | `password123` | Dev user password for seed script |
| `IMPORT_USER_EMAIL` | api | — | Optional default user for `pnpm import:credit-card` when not passing `--user-email` |
| `CURSOR_API_KEY` | api | — | Cursor SDK key for AI financial reports (server-only) |
| `AI_REPORT_PROMPT_PATH` | api | `prompts/financial-health-report.txt` | Optional override for the AI report prompt file |

Edit the default AI report prompt at [`api/prompts/financial-health-report.txt`](api/prompts/financial-health-report.txt). Requires Node **22.13+** for `@cursor/sdk`.

### AI reports (operator notes)

End users only see friendly messages in the app (for example, “AI reports are currently disabled.”). They never see environment variable names or other setup details.

If report generation fails in production, check the API logs and configuration:

| What users see | Likely cause | Fix |
|----------------|--------------|-----|
| “AI reports are currently disabled.” / “AI import features are currently disabled.” | `CURSOR_API_KEY` missing or empty on the API. Generate report, OFX upload, and knowledge learning return **403** | Add a valid key to the API environment (local `.env` or Vercel project env vars), then redeploy the API |
| “We couldn't generate your report…” | Cursor API error, network issue, or prompt file problem | Inspect API logs; confirm the key is valid, the API can reach Cursor, and [`api/prompts/financial-health-report.txt`](api/prompts/financial-health-report.txt) exists in the deployment |
| API log: `ENOENT … sdk-agent-store` | AI reports used local SDK mode on a read-only serverless filesystem | Fixed in app code: reports use Cursor **cloud** agents (no disk). Redeploy the API if you still see this on an older build |

After changing API environment variables on Vercel, trigger a new API deployment so the runtime picks them up.

## Data Model

### Category

Flat categories with display order and icon key, scoped per user:

```json
{ "name": "Rent", "order": 1, "icon": "house" }
```

Allowed icon keys: `category`, `income`, `house`, `utensils`, `car`, `cartShopping`, `bolt`, `heartPulse`, `graduationCap`, `plane`, `gift`, `piggyBank`, `briefcase`, `shirt`, `film`, `dumbbell` (see [`api/src/constants/categoryIcons.ts`](api/src/constants/categoryIcons.ts)).

Legacy hierarchical categories in an existing database are flattened automatically on the next API request. Use **Manage** in the UI to clean up duplicate names, or drop the `categories` collection and run `pnpm seed` for a fresh set.

### Month

One document per calendar month:

```json
{ "yearMonth": "2026-07", "lastMonthBalance": 1500.00 }
```

### Line Item

Income or expense belonging to a month and category:

```json
{
  "monthId": "...",
  "categoryId": "...",
  "type": "expense",
  "label": "Groceries",
  "plannedAmount": 400.00,
  "entries": [
    { "amount": 120.50, "note": null, "createdAt": "2026-07-15T10:00:00.000Z" }
  ],
  "seriesId": "...",
  "seriesOccurrenceIndex": 1,
  "seriesException": false
}
```

When there are no entries, the item is unrealized and the UI displays `plannedAmount` with a "planned" indicator. API responses include computed `realizedAmount` (sum of entry amounts, or `null`).

### Recurring series

Recurring line items use a `RecurringSeries` template that materializes one `LineItem` per calendar month:

```json
{
  "startYearMonth": "2026-03",
  "endType": "never",
  "occurrenceCount": null,
  "endYearMonth": null,
  "cancelledAt": null,
  "generatedThroughYearMonth": "2027-02"
}
```

End modes:

- `never` — repeats until cancelled (generates up to 12 months ahead, extended on month view)
- `count` — total months including start (e.g. 3 → Mar, Apr, May)
- `until` — inclusive start and end months

Edit and delete on recurring instances support Google Calendar-style scopes: `this`, `future`, or `all`.

## Balance Calculation

For each month:

```
effectiveAmount  = (sum of entries) ?? plannedAmount   // null sum when no entries
totalIncome      = sum of effective amounts for income items
totalExpense     = sum of effective amounts for expense items
endingBalance    = lastMonthBalance + totalIncome - totalExpense
```

When line items change in month **M**, the API:

1. Recomputes **M**'s ending balance
2. Sets month **M+1**'s `lastMonthBalance` to that value
3. Cascades forward through any subsequent months

The first month in the system starts with `lastMonthBalance: 0`.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/auth/register` | Sign up (name, email, password, invitationCode) |
| POST | `/auth/login` | Sign in (sets httpOnly cookie) |
| POST | `/auth/logout` | Sign out |
| GET | `/auth/me` | Current user + preferences |
| POST | `/auth/forgot-password` | Send password-reset email |
| POST | `/auth/reset-password` | Reset password with token |
| PATCH | `/users/me` | Update name and/or preferences |
| GET | `/categories` | List categories (flat, auth required) |
| POST | `/categories` | Create category |
| PATCH | `/categories/:id` | Update name, icon, or order |
| PATCH | `/categories/reorder` | Bulk reorder `{ "items": [{ "id", "order" }] }` |
| DELETE | `/categories/:id` | Delete category (no line items) |
| GET | `/months/current` | Current month view (auto-creates month) |
| GET | `/months/:yearMonth` | Specific month view (`YYYY-MM`) |
| POST | `/months/:yearMonth/line-items` | Add income/expense (optional `recurrence` block) |
| PATCH | `/line-items/:id` | Update line item (optional `scope` for recurring items) |
| DELETE | `/line-items/:id` | Delete line item (optional `scope` for recurring items) |
| POST | `/line-items/:id/recurrence` | Convert one-off item to a recurring series |
| POST | `/recurrence-series/:id/cancel` | Cancel series (delete future unrealized instances) |
| GET | `/reports/export/xlsx?yearMonth=` | Download accountant XLSX for a month |

### Monthly view response

```json
{
  "month": {
    "id": "...",
    "yearMonth": "2026-07",
    "lastMonthBalance": 0,
    "endingBalance": 5000
  },
  "categories": [
    {
      "id": "...",
      "name": "Salary",
      "order": 0,
      "icon": "income",
      "lineItems": [
        {
          "id": "...",
          "type": "income",
          "label": "Paycheck",
          "plannedAmount": 5000,
          "realizedAmount": null,
          "displayAmount": 5000,
          "isRealized": false,
          "seriesId": "...",
          "seriesOccurrenceIndex": 1,
          "seriesEndType": "never",
          "seriesOccurrenceCount": null,
          "seriesEndYearMonth": null,
          "isSeriesException": false
        }
      ]
    }
  ]
}
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Run API and frontend in parallel |
| `pnpm dev:api` | Run API only |
| `pnpm dev:frontend` | Run frontend only |
| `pnpm seed` | Seed default categories |
| `pnpm seed:fresh` | Drop existing data and reseed |
| `pnpm import:credit-card` | Import a credit-card JSON mapping (pass `-- --json … --env …`; see [Credit card statement import](#credit-card-statement-import-local)) |
| `pnpm build` | Build both packages |
| `pnpm contrast-check` | Legacy Cotton Candy theme auditor (not used for Web Awesome UI) |
| `pnpm responsive-check` | Playwright screenshots (2 themes x 3 months x 8 viewports) into `.responsive-audit/` — requires `pnpm dev` running |

## Project Structure

```
finance/
├── AGENTS.md                   # Guidance for AI agents working in this repo
├── docker-compose.yml          # MongoDB
├── .env.example
├── pnpm-workspace.yaml
├── scripts/                    # responsive-check, deploy, db tools
├── skills/                     # Web Awesome agent skills
├── api/
│   ├── scripts/                # Local ops (e.g. import-credit-card)
│   └── src/
│       ├── constants/          # Allowed category icon keys
│       ├── models/             # Category, Month, LineItem
│       ├── routes/             # REST endpoints
│       ├── schemas/            # Zod request validation
│       ├── services/           # Balance cascade, flat categories
│       └── seed/               # Default flat categories
└── frontend/
    ├── DESIGN_SYSTEM.md        # Pointer to @lina-rodrigues/cotton-candy
    ├── design-system/          # Report markdown CSS
    ├── app/                    # Next.js App Router (SSR page)
    ├── components/             # App feature UI (wa-* components)
    └── lib/                    # API client, i18n, toast, category icons
```


## Next Steps

- **Overview metric sparklines** — each Overview money card (last month / expected / current) should include a small graph showing how much the value increased or decreased versus the previous month.
- **Aggregation cache** — add a cache layer for month-view aggregations and sums (balances, category totals, budget breakdowns) so repeated reads do not recompute from every line item and entry.

## Future Extensions

- MFA and social login (Passport + TOTP — see plan notes)
- Charts and spending summaries
- Dockerize API and frontend services
