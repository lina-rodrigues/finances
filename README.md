# Finance

A personal finance application for tracking monthly income and expenses with planned vs. realized amounts, flat customizable categories, and automatic balance carry-forward.

## Architecture

The project is a **pnpm monorepo** with two independently deployable packages:

| Package | Tech | Port | Role |
|---------|------|------|------|
| [`api/`](api/) | Express, Mongoose, TypeScript | 4000 | REST API, MongoDB access, balance recalculation |
| [`frontend/`](frontend/) | Next.js (App Router), React, DaisyUI | 3000 | SSR UI, calls API over HTTP |

```
┌─────────────┐     HTTP      ┌─────────────┐     MongoDB    ┌─────────────┐
│  Frontend   │ ────────────► │     API     │ ─────────────► │  MongoDB    │
│  (Next.js)  │               │  (Express)  │                │  (Docker)   │
└─────────────┘               └─────────────┘                └─────────────┘
```

There is no shared runtime between API and frontend — the frontend never accesses the database directly.

## Design

See [`frontend/DESIGN_SYSTEM.md`](frontend/DESIGN_SYSTEM.md) for the app's design system — themes, colors, icons, typography, and interaction patterns.

## Features (v1)

- **Monthly view** for the current month
- **Flat categories** with custom icons and reordering
- **Income and expense line items** with planned and realized amounts
- **Planned indicator** — unrealized items show the planned amount with a "planned" badge
- **Last month balance** — automatically carried forward from the previous month's ending balance
- **Collapsible category sections** with per-category totals

## Prerequisites

- Node.js 20+
- [pnpm](https://pnpm.io/) 9+
- Docker and Docker Compose

## Quick Start

1. **Start MongoDB**

   ```bash
   docker compose up -d
   ```

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

4. **Seed default categories**

   ```bash
   pnpm seed
   ```

5. **Run both services**

   ```bash
   pnpm dev
   ```

   - Frontend: http://localhost:3000
   - API: http://localhost:4000

## Environment Variables

| Variable | Package | Default | Description |
|----------|---------|---------|-------------|
| `PORT` | api | `4000` | API server port |
| `MONGODB_URI` | api | `mongodb://localhost:27017/finance` | MongoDB connection string |
| `CORS_ORIGIN` | api | `http://localhost:3000` | Allowed frontend origin |
| `NEXT_PUBLIC_API_URL` | frontend | `http://localhost:4000` | API base URL for fetch calls |

## Data Model

### Category

Flat categories with display order and icon:

```json
{ "name": "Rent", "order": 1, "icon": "house" }
```

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
  "realizedAmount": null
}
```

When `realizedAmount` is `null`, the UI displays `plannedAmount` with a "planned" indicator.

## Balance Calculation

For each month:

```
effectiveAmount  = realizedAmount ?? plannedAmount
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
| GET | `/categories` | List categories (flat) |
| POST | `/categories` | Create category |
| PATCH | `/categories/:id` | Update name, icon, or order |
| PATCH | `/categories/reorder` | Bulk reorder `[{ id, order }]` |
| DELETE | `/categories/:id` | Delete category (no line items) |
| GET | `/months/current` | Current month view (auto-creates month) |
| GET | `/months/:yearMonth` | Specific month view (`YYYY-MM`) |
| POST | `/months/:yearMonth/line-items` | Add income/expense |
| PATCH | `/line-items/:id` | Update line item |
| DELETE | `/line-items/:id` | Delete line item |

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
          "isRealized": false
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
| `pnpm build` | Build both packages |

## Project Structure

```
finance/
├── docker-compose.yml      # MongoDB
├── .env.example
├── api/
│   └── src/
│       ├── models/         # Category, Month, LineItem
│       ├── routes/         # REST endpoints
│       ├── services/       # Balance cascade, category tree
│       └── seed/           # Default categories
└── frontend/
    ├── app/                # Next.js App Router (SSR page)
    ├── components/         # DaisyUI UI components
    └── lib/api.ts          # Typed API client
```

## Future Extensions

- Month navigation (browse past/future months)
- Category management UI
- Authentication and multi-user support
- Charts and spending summaries
- Dockerize API and frontend services
