import { Router, type IRouter } from "express";
import { db, feeStructuresTable, paymentsTable, expensesTable, fundAccountsTable, studentsTable, accountTransactionsTable } from "@workspace/db";
import { eq, and, sql, desc } from "drizzle-orm";
import {
  GetTermSummaryReportQueryParams,
  GetVoteBookReportQueryParams,
  GetFeesCollectedReportQueryParams,
  GetTermSummaryReportResponse,
  GetVoteBookReportResponse,
  GetFeesCollectedReportResponse,
} from "@workspace/api-zod";

const SCHOOL_NAME = "Replit Secondary School";

const router: IRouter = Router();

router.get("/reports/term-summary", async (req, res): Promise<void> => {
  const params = GetTermSummaryReportQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { academicYear, term } = params.data;

  const feeStructures = await db
    .select()
    .from(feeStructuresTable)
    .where(and(eq(feeStructuresTable.academicYear, academicYear), eq(feeStructuresTable.term, term)));

  const [studentCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(studentsTable)
    .where(eq(studentsTable.status, "active"));

  const payments = await db
    .select({
      total: sql<number>`sum(amount::numeric)::float`,
    })
    .from(paymentsTable)
    .where(
      and(
        eq(paymentsTable.academicYear, academicYear),
        eq(paymentsTable.term, term),
        eq(paymentsTable.status, "confirmed")
      )
    );

  const totalExpected = feeStructures.reduce(
    (sum, fs) => sum + parseFloat(fs.totalAmount as string),
    0
  );
  const totalCollected = payments[0]?.total ?? 0;

  const expenses = await db.select().from(expensesTable).where(eq(expensesTable.status, "approved"));
  const totalExpenditure = expenses.reduce((sum, e) => sum + parseFloat(e.amount as string), 0);

  const accounts = await db.select().from(fundAccountsTable);

  const fundBreakdown = accounts.map((account) => {
    const income = totalCollected / accounts.length;
    const expenditure = expenses
      .filter((e) => e.accountId === account.id)
      .reduce((sum, e) => sum + parseFloat(e.amount as string), 0);

    return {
      accountType: account.accountType,
      accountName: account.name,
      income,
      expenditure,
      balance: income - expenditure,
    };
  });

  res.json(
    GetTermSummaryReportResponse.parse({
      academicYear,
      term,
      school: SCHOOL_NAME,
      totalExpected,
      totalCollected,
      totalExpenditure,
      surplus: totalCollected - totalExpenditure,
      fundBreakdown,
    })
  );
});

router.get("/reports/vote-book", async (req, res): Promise<void> => {
  const params = GetVoteBookReportQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { accountId, academicYear } = params.data;

  const [account] = await db.select().from(fundAccountsTable).where(eq(fundAccountsTable.id, accountId));
  if (!account) {
    res.status(404).json({ error: "Account not found" });
    return;
  }

  const txns = await db
    .select()
    .from(accountTransactionsTable)
    .where(eq(accountTransactionsTable.accountId, accountId))
    .orderBy(accountTransactionsTable.transactionDate);

  const closingBalance = parseFloat(account.currentBalance as string);

  res.json(
    GetVoteBookReportResponse.parse({
      accountName: account.name,
      accountType: account.accountType,
      academicYear,
      openingBalance: 0,
      transactions: txns.map((t) => ({
        ...t,
        amount: parseFloat(t.amount as string),
        balance: parseFloat(t.balance as string),
      })),
      closingBalance,
    })
  );
});

router.get("/reports/fees-collected", async (req, res): Promise<void> => {
  const params = GetFeesCollectedReportQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { academicYear, term } = params.data;

  const conditions: any[] = [eq(feeStructuresTable.academicYear, academicYear)];
  if (term) conditions.push(eq(feeStructuresTable.term, term));

  const feeStructures = await db
    .select()
    .from(feeStructuresTable)
    .where(and(...conditions));

  const students = await db.select().from(studentsTable).where(eq(studentsTable.status, "active"));

  const paymentConditions: any[] = [
    eq(paymentsTable.academicYear, academicYear),
    eq(paymentsTable.status, "confirmed"),
  ];
  if (term) paymentConditions.push(eq(paymentsTable.term, term));

  const paymentTotals = await db
    .select({
      studentId: paymentsTable.studentId,
      method: paymentsTable.method,
      total: sql<number>`sum(amount::numeric)::float`,
      count: sql<number>`count(*)::int`,
    })
    .from(paymentsTable)
    .where(and(...paymentConditions))
    .groupBy(paymentsTable.studentId, paymentsTable.method);

  const paidByStudent: Record<number, number> = {};
  const methodTotals: Record<string, { amount: number; count: number }> = {};

  for (const pt of paymentTotals) {
    paidByStudent[pt.studentId] = (paidByStudent[pt.studentId] ?? 0) + (pt.total ?? 0);
    if (!methodTotals[pt.method]) methodTotals[pt.method] = { amount: 0, count: 0 };
    methodTotals[pt.method].amount += pt.total ?? 0;
    methodTotals[pt.method].count += pt.count ?? 0;
  }

  const feeMap = Object.fromEntries(feeStructures.map((f) => [f.class, parseFloat(f.totalAmount as string)]));
  const classes = [...new Set(students.map((s) => s.class))].sort();

  const classBreakdown = classes.map((cls) => {
    const classStudents = students.filter((s) => s.class === cls);
    const feePerStudent = feeMap[cls] ?? 0;
    const expected = feePerStudent * classStudents.length;
    const collected = classStudents.reduce((sum, s) => sum + (paidByStudent[s.id] ?? 0), 0);
    const outstanding = expected - collected;
    const collectionRate = expected > 0 ? Math.round((collected / expected) * 1000) / 10 : 0;

    return { class: cls, expected, collected, outstanding, collectionRate };
  });

  const total = Object.values(methodTotals).reduce((sum, m) => sum + m.amount, 0);

  const methodBreakdown = Object.entries(methodTotals).map(([method, data]) => ({
    method,
    amount: data.amount,
    count: data.count,
  }));

  res.json(
    GetFeesCollectedReportResponse.parse({
      academicYear,
      term: term ?? null,
      classBreakdown,
      methodBreakdown,
      total,
    })
  );
});

export default router;
