# SchoolLedger Kenya

A hybrid cloud/offline-resilient school finance management system for Kenyan secondary schools.

Handles M-Pesa Paybill C2B reconciliation, statutory fund accounting (Tuition / Operations / BOM / Capitation), KEMIS/NEMIS Maisha Number capitation tracking, and MoE-compliant reporting.

---

## Stack

| Layer | Tech |
|---|---|
| API | Express 5, Node.js 22+, TypeScript 5.9 |
| Database | PostgreSQL 16 + Drizzle ORM |
| Frontend | React 19, Vite 7, TailwindCSS 4, shadcn/ui |
| State | TanStack Query v5 + IndexedDB persistence |
| Validation | Zod v4, drizzle-zod |
| API codegen | Orval (OpenAPI → React Query hooks + Zod schemas) |
| Monorepo | pnpm workspaces |

---

## Prerequisites

- **Node.js** ≥ 22 (use [nvm](https://github.com/nvm-sh/nvm))
- **pnpm** ≥ 10 — `npm install -g pnpm`
- **PostgreSQL** 16 running locally (or a remote connection string)

---

## Local Setup

### 1. Clone and install

```bash
git clone <repo-url>
cd kenyan-bursar-system
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and set at minimum:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/kenyan_bursar
PORT=8080
SESSION_SECRET=any-long-random-string
```

### 3. Push database schema

```bash
pnpm --filter @workspace/db run push
```

### 4. Run the API server

```bash
# Build then start (one-shot)
pnpm --filter @workspace/api-server run dev:build

# Or keep it live with tsx watch:
cd artifacts/api-server
npx tsx watch src/index.ts
```

> The API server listens on `http://localhost:8080`. Vite proxies `/api/*` there automatically.

### 5. Run the frontend

In a separate terminal:

```bash
pnpm --filter @workspace/school-ledger run dev
```

Open `http://localhost:5173`.

---

## Available Scripts (workspace root)

| Command | Description |
|---|---|
| `pnpm run build` | Typecheck + build all packages |
| `pnpm run typecheck` | Full TypeScript typecheck |
| `pnpm --filter @workspace/api-spec run codegen` | Regenerate API hooks and Zod schemas from OpenAPI spec |
| `pnpm --filter @workspace/db run push` | Push schema changes to the database (dev only) |

---

## Project Layout

```
artifacts/
  api-server/        Express route handlers
  school-ledger/     React SPA
  mockup-sandbox/    UI prototyping (standalone)
lib/
  api-spec/          OpenAPI spec + Orval config (source of truth)
  api-zod/           Generated Zod schemas — never edit directly
  api-client-react/  Generated React Query hooks — never edit directly
  db/                Drizzle ORM schema + connection
scripts/             Workspace utility scripts
```

---

## Key Architecture Notes

- **Contract-first**: edit `lib/api-spec/openapi.yaml`, then run codegen. Never write client fetch code by hand.
- **Academic term**: update `artifacts/api-server/src/lib/constants.ts` and `artifacts/school-ledger/src/lib/term.ts` at the start of each term.
- **M-Pesa**: the STK Push is simulated. Real integration requires Safaricom Daraja credentials set as env vars.
- **Offline mode**: the frontend caches all queries to IndexedDB — data is available without a network connection.
