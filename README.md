# Finance

A personal finance application for tracking monthly income and expenses with planned vs. realized amounts, flat customizable categories, and automatic balance carry-forward.

## Architecture

The project is a **pnpm monorepo** with two independently deployable packages:

| Package | Tech | Port | Role |
|---------|------|------|------|
| [`api/`](api/) | Express, Mongoose, TypeScript | 4000 | REST API, MongoDB access, balance recalculation |
| [`frontend/`](frontend/) | Next.js (App Router), React, Tailwind CSS 4, Pixelact UI | 3000 | SSR UI, calls API over HTTP |

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

The frontend uses the **Cotton Candy** design system — a pixel-widget UI built on Pixelact UI, shadcn/ui, Tailwind CSS 4, and Pixelarticons.

See [`frontend/DESIGN_SYSTEM.md`](frontend/DESIGN_SYSTEM.md) for the canonical reference: tools & stack, palette, themes, semantic tokens, layout shell, components, icons, interaction patterns, pitfalls, and the UI verification workflow (`pnpm contrast-check`, `pnpm responsive-check`).

## Features (v1)

- **User accounts** — custom JWT auth (login, signup with invitation code, forgot/reset password)
- **Per-user data** — categories, months, and line items scoped by `userId`
- **Settings modal** — name, theme (system/light/dark), currency (full ISO list, BRL/USD pinned), language (EN/PT)
- **i18n** — English and Portuguese via `frontend/messages/{en,pt}.json`
- **Monthly view** with previous/next month navigation
- **Flat categories** with custom pixel-art icons ([Pixelarticons](https://pixelarticons.com/)) and drag-free reordering (up/down)
- **Category management** — rename, pick icons, reorder, add, and delete via **Manage** on the Categories header
- **Income and expense line items** with planned and realized amounts
- **Planned indicator** — unrealized items show the planned amount with a "planned" badge
- **Last month balance** — automatically carried forward from the previous month's ending balance
- **Collapsible category sections** with per-category totals

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
| `pnpm build` | Build both packages |
| `pnpm contrast-check` | WCAG AA contrast audit of the theme colors |
| `pnpm responsive-check` | Playwright screenshots (2 themes x 3 months x 8 viewports) into `.responsive-audit/` — requires `pnpm dev` running |

## Project Structure

```
finance/
├── AGENTS.md                   # Guidance for AI agents working in this repo
├── docker-compose.yml          # MongoDB
├── .env.example
├── pnpm-workspace.yaml
├── scripts/                    # contrast-check, responsive-check
├── api/
│   └── src/
│       ├── constants/          # Allowed category icon keys
│       ├── models/             # Category, Month, LineItem
│       ├── routes/             # REST endpoints
│       ├── schemas/            # Zod request validation
│       ├── services/           # Balance cascade, flat categories
│       └── seed/               # Default flat categories
└── frontend/
    ├── DESIGN_SYSTEM.md        # Themes, colors, icons, interactions
    ├── design-system/          # CSS tokens and themes
    ├── app/                    # Next.js App Router (SSR page)
    ├── components/             # UI (CategoryManager, CategorySection, …)
    │   └── ui/pixelact-ui/     # Pixel-art component wrappers
    └── lib/                    # API client, icons, fonts
```

## Future Extensions

- MFA and social login (Passport + TOTP — see plan notes)
- Charts and spending summaries
- Dockerize API and frontend services
