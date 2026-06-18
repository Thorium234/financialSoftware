---
name: SchoolLedger API field shapes
description: Exact field names and constraints for all API response types — deviates from intuitive names.
---

## FundAccount
Fields: `id`, `name`, `accountType` (enum: tuition/operations/bom/capitation), `description`, `currentBalance`, `createdAt`.
NOT: `accountName`, `balance`, `bankDetails`.

## AccountTransaction
Fields: `id`, `accountId`, `type` (credit|debit), `amount`, `balance` (running balance), `description`, `referenceType`, `referenceId`, `transactionDate` (Date), `createdAt`.
NOT: `balanceAfter`, `reference`.

## Expense
Status: `"approved" | "void"` only — no `pending`, `draft`, `rejected`.
No `accountName` field — must look up account name via separate `useListAccounts()` call.

## PaymentWithStudent
Shape: `{ payment: Payment, studentName: string, admissionNumber: string, class: string }`.
Access payment fields via `.payment.*` not at the top level.

## StudentDetail
Shape: `{ student: Student, currentBalance: number, totalPaid: number, feeExpected: number, recentPayments: Payment[] }`.
Student fields nested under `.student.*`.

## StudentStatement
Shape: `{ student, entries: StatementEntry[], closingBalance }`.
No `totalPaid`, `balance`, or `payments` fields at top level.

## CapitationSummary (GetCapitationSummary)
Fields: `enrolledStudents`, `totalDisbursed`, `expectedAtCurrentRate`, `perStudentRate`, `disbursements[]`.
No query params — returns school-wide summary.

## Reports
- `TermSummaryReport`: `{ totalExpected, totalCollected, totalExpenditure, surplus, fundBreakdown[] }`. No `byClass`/`byMethod`.
- `FeesCollectedReport`: `{ total, classBreakdown[], methodBreakdown[] }`.
- `VoteBookReport`: params `{ accountId, academicYear }` (no `term`). Returns `{ accountName, openingBalance, closingBalance, transactions[] }`. Each `tx` has `balance` (not `balanceAfter`).

## Hooks with no query params
- `ListCapitationDisbursements` — no params at all
- `GetCapitationSummary` — no params at all
- `ListStudents` — no `limit` param
- `ListExpenses` — no `limit` param

## Hooks with limited params
- `ListDefaulters` — only `class` and `minBalance` (no `academicYear`, `term`)

## Orval mutation calling convention
Orval wraps mutation request bodies in `{ data: ... }`. Example:
```ts
mutation.mutate({ data: { studentId: 1, phoneNumber: "254...", amount: 5000 } });
```
NOT: `mutation.mutate({ studentId: 1, ... })` — that causes TS2353.

## Student fields
`id`, `admissionNumber`, `maishaNumber`, `fullName`, `class`, `stream`, `guardianName`, `guardianPhone`, `status`, `createdAt`.
NOT `mpesaPhone` — use `guardianPhone` for pre-filling M-Pesa phone.

**Why:** Orval generates from the OpenAPI spec exactly. Any field not in the spec causes TS2353/TS2339. Always verify against `lib/api-zod/src/generated/api.ts` before writing frontend code.
