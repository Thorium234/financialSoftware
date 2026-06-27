# SchoolLedger Kenya

A hybrid cloud/offline-resilient school finance management system for Kenyan secondary schools.

Handles M-Pesa Paybill C2B reconciliation, statutory fund accounting (Tuition / Operations / BOM / Capitation), NEMIS Maisha Number capitation tracking, and MoE-compliant reporting.

---

## Stack

| Layer | Tech |
|---|---|
| API | Express 5, Node.js ≥22, TypeScript 5.9 |
| Database | PostgreSQL 16 + Drizzle ORM |
| Frontend | React 19, Vite 7, TailwindCSS 4, shadcn/ui |
| State | TanStack Query v5 + IndexedDB persistence |
| Validation | Zod v4, drizzle-zod |
| API codegen | Orval (OpenAPI → React Query hooks + Zod schemas) |
| Monorepo | pnpm workspaces |

---

## Prerequisites

- **Node.js** ≥22 — use [nvm](https://github.com/nvm-sh/nvm): `nvm install 22 && nvm use 22`
- **pnpm** ≥10 — `npm install -g pnpm`
- **PostgreSQL** 16 running locally (or Docker: see below)

---

## Quick start (local)

```bash
# 1. Clone
git clone https://github.com/Thorium234/financialSoftware.git
cd financialSoftware

# 2. Install dependencies
pnpm install

# 3. Configure environment
cp .env.example .env
# Edit .env — set DATABASE_URL, PORT=8080, SESSION_SECRET

# 4. Push database schema
pnpm --filter @workspace/db run push

# 5a. Terminal 1 — API server (live reload)
pnpm --filter @workspace/api-server run dev:watch

# 5b. Terminal 2 — Frontend
pnpm --filter @workspace/school-ledger run dev
```

Open **http://localhost:5173** — Vite proxies `/api/*` to the Express server at port 8080.

---

## PostgreSQL via Docker (optional)

If you don't have Postgres installed locally:

```bash
docker run -d \
  --name kenyan-bursar-db \
  -e POSTGRES_USER=bursar \
  -e POSTGRES_PASSWORD=bursar \
  -e POSTGRES_DB=kenyan_bursar \
  -p 5432:5432 \
  postgres:16-alpine
```

Then set in `.env`:

```env
DATABASE_URL=postgresql://bursar:bursar@localhost:5432/kenyan_bursar
```

---

## Environment variables

Copy `.env.example` to `.env` and fill in:

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `PORT` | ✅ | API server port (default: 8080) |
| `SESSION_SECRET` | ✅ | Session signing secret (any long random string) |
| `API_URL` | ❌ | Override API proxy target in Vite (default: `http://localhost:8080`) |

---

## Available scripts

### Make shortcuts

```bash
make install     # pnpm install
make db-push     # Push Drizzle schema to DB
make dev-api     # API server with live reload (port 8080)
make dev-ui      # Vite frontend (port 5173)
make codegen     # Regenerate API client from OpenAPI spec
make typecheck   # Full TypeScript typecheck
make build       # Production build
```

### Raw pnpm commands

```bash
pnpm run typecheck                              # Full TS typecheck
pnpm run build                                  # Typecheck + build all packages
pnpm --filter @workspace/api-server run dev:watch   # API — tsx watch (live reload)
pnpm --filter @workspace/api-server run dev:build   # API — esbuild then run
pnpm --filter @workspace/school-ledger run dev      # Frontend
pnpm --filter @workspace/api-spec run codegen       # Regen API hooks/schemas
pnpm --filter @workspace/db run push                # Push schema to DB
```

---

## Project layout

```
artifacts/
  api-server/        Express route handlers (src/routes/)
  school-ledger/     React SPA (src/pages/, src/components/)
  mockup-sandbox/    UI prototyping only — not part of the main app
lib/
  api-spec/          openapi.yaml + Orval config (source of truth)
  api-zod/           Generated Zod schemas — never edit directly
  api-client-react/  Generated TanStack Query hooks — never edit directly
  db/                Drizzle ORM schema + DB connection
scripts/             Workspace utility scripts
```

---

## Architecture notes

- **Contract-first**: edit `lib/api-spec/openapi.yaml`, run `make codegen`. Never write client fetch code by hand.
- **Academic term**: update `artifacts/api-server/src/lib/constants.ts` and `artifacts/school-ledger/src/lib/term.ts` at the start of each term.
- **M-Pesa STK Push**: simulated locally. Real integration requires Safaricom Daraja credentials.
- **Offline mode**: the frontend caches all queries to IndexedDB — data stays available without network.
- **Fund accounting**: 4 statutory vote accounts (Tuition, Operations, BOM, Capitation) with double-entry transactions. Every payment and expense posts to the correct account ledger.

---

## Pages

| Page | Route | Description |
|---|---|---|
| Dashboard | `/` | KPIs, collection trend, fund balances, recent payments |
| Students | `/students` | List with search/class filter; detail with full ledger |
| Payments | `/payments` | Full log; Unmatched M-Pesa tab |
| Fee Structures | `/fees` | Term schedules; Defaulters tab |
| Fund Accounts | `/accounts` | 4 statutory fund cards; click to drill into ledger |
| Capitation | `/capitation` | MoE disbursements; NEMIS Maisha coverage |
| Expenses | `/expenses` | Voucher log; void action |
| Reports | `/reports` | Term Summary, Vote Book, Fees Collected |
