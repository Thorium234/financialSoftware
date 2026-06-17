# SchoolLedger Kenya

A hybrid cloud/offline-resilient school finance management system for Kenyan secondary schools. Handles M-Pesa Paybill C2B auto-reconciliation, statutory fund accounting (Tuition/Operations/BOM/Capitation), KEMIS/NEMIS Maisha Number capitation tracking, MoE-compliant reporting, and offline-resilient UI.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, full build+serve)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string, `SESSION_SECRET` — session signing

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 (port 8080, proxied at `/api`)
- DB: PostgreSQL + Drizzle ORM
- Frontend: React + Vite + TailwindCSS + shadcn/ui (path `/`)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — source of truth for all API contracts
- `lib/db/src/schema.ts` — Drizzle ORM schema (students, payments, expenses, accounts, capitation)
- `lib/api-zod/src/generated/api.ts` — generated Zod schemas (never edit directly)
- `lib/api-client-react/src/generated/api.ts` — generated React Query hooks (never edit directly)
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/school-ledger/src/pages/` — React page components (one per nav item)
- `artifacts/school-ledger/src/lib/format.ts` — `formatCurrency()` ("KES X,XXX"), `formatDate()`

## Architecture decisions

- Contract-first: OpenAPI spec → Zod schemas + React Query hooks via Orval. Never write client fetch code by hand.
- Statutory fund accounting: 4 statutory accounts (tuition, operations, bom, capitation) with a double-entry transaction ledger. Every payment and expense auto-posts to the correct account.
- M-Pesa reconciliation: payments can be `mpesa` method. Unmatched M-Pesa entries live in a separate `unmatched_mpesa` table and surface in the Payments page "Unmatched M-Pesa" tab.
- NEMIS Maisha Number on the `students` table — tracks government capitation eligibility.
- Academic year/term hardcoded to `CURRENT_YEAR = "2025"`, `CURRENT_TERM = 2` in `artifacts/api-server/src/routes/students.ts`.
- Collection trend window: 180 days (to capture seeded May 2025 data).

## Product

8 pages fully wired to real API data:
- **Dashboard** — KPIs (collected, outstanding, defaulters, capitation), collection trend chart, recent payments
- **Students** — list with search/class filter; detail page with statement and balance
- **Payments** — full log with method/status filters; Unmatched M-Pesa tab (3 entries)
- **Fee Structures** — term fee schedule cards (Form 1–4); Fee Defaulters tab
- **Fund Accounts** — 4 statutory fund cards (BOM, Capitation, Operations, Tuition); click to drill into transaction ledger
- **Capitation** — total disbursed, per-student rate, NEMIS Maisha coverage, disbursement history
- **Expenses** — voucher log with account/keyword filtering; KES 356,100 approved
- **Reports** — Term Summary (income vs expenditure + fund breakdown), Vote Book (per account), Fees Collected (by class + method)

## Gotchas

- `FundAccount` fields: `name`, `currentBalance`, `accountType`, `description` — NO `accountName`, `balance`, or `bankDetails`.
- `AccountTransaction` fields: `balance` (not `balanceAfter`), `referenceId` (not `reference`), `transactionDate` is a Date object.
- `Expense` status is only `"approved" | "void"` — no `pending`, `draft`, or `rejected`.
- `ListDefaulters` query params: only `class` and `minBalance` — no `academicYear` or `term`.
- `ListStudents`, `ListExpenses`, `ListCapitationDisbursements`, `GetCapitationSummary`: no `limit` or `academicYear` params.
- `PaymentWithStudent` shape: `{ payment: Payment, studentName, admissionNumber, class }` — access payment fields via `.payment.*`.
- `StudentDetail` shape: `{ student: Student, currentBalance, totalPaid, feeExpected, recentPayments[] }` — student fields under `.student.*`.
- `VoteBookReport`: takes `accountId` + `academicYear` (no `term`). Returns `{ accountName, openingBalance, closingBalance, transactions[] }`.
- `TermSummaryReport` returns `fundBreakdown[]` (not `byClass`/`byMethod`).
- `FeesCollectedReport` returns `classBreakdown[]`, `methodBreakdown[]`, `total`.
- TanStack Query v5 `UseQueryOptions` requires `queryKey` — use the hook's second argument `{ query: { enabled } }` only when the generated hook signature allows it; otherwise conditionally skip the hook call or pass accountId=0.
- Run `pnpm --filter @workspace/api-spec run codegen` after any OpenAPI change before touching frontend code.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
