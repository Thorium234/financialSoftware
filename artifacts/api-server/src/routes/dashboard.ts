import { Router, type IRouter } from "express";
import { db, studentsTable, paymentsTable, feeStructuresTable, fundAccountsTable } from "@workspace/db";
import { sql, and, gte, lte, eq } from "drizzle-orm";
import {
  GetDashboardSummaryResponse,
  GetCollectionTrendResponse,
  GetFundBalancesResponse,
  GetRecentPaymentsResponse,
  GetDefaultersCountResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const CURRENT_YEAR = "2025";
const CURRENT_TERM = 2;

router.get("/dashboard/summary", async (req, res): Promise<void> => {
  const [studentCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(studentsTable)
    .where(eq(studentsTable.status, "active"));

  const feeStructures = await db
    .select()
    .from(feeStructuresTable)
    .where(
      and(
        eq(feeStructuresTable.academicYear, CURRENT_YEAR),
        eq(feeStructuresTable.term, CURRENT_TERM)
      )
    );

  const totalExpected = feeStructures.reduce((sum, fs) => sum + parseFloat(fs.totalAmount as string), 0) * (studentCount?.count ?? 0) / (feeStructures.length || 1);

  const payments = await db
    .select({
      method: paymentsTable.method,
      totalAmount: sql<number>`sum(amount::numeric)::float`,
    })
    .from(paymentsTable)
    .where(
      and(
        eq(paymentsTable.academicYear, CURRENT_YEAR),
        eq(paymentsTable.term, CURRENT_TERM),
        eq(paymentsTable.status, "confirmed")
      )
    )
    .groupBy(paymentsTable.method);

  const totalCollected = payments.reduce((sum, p) => sum + (p.totalAmount ?? 0), 0);
  const mpesaToday = 0;
  const cashToday = 0;
  const bankToday = 0;

  const todayPayments = await db
    .select({
      method: paymentsTable.method,
      total: sql<number>`sum(amount::numeric)::float`,
    })
    .from(paymentsTable)
    .where(
      and(
        sql`payment_date::date = current_date`,
        eq(paymentsTable.status, "confirmed")
      )
    )
    .groupBy(paymentsTable.method);

  const todayMap = Object.fromEntries(todayPayments.map((p) => [p.method, p.total ?? 0]));

  const totalOutstanding = Math.max(0, totalExpected - totalCollected);
  const collectionRate = totalExpected > 0 ? Math.min(100, (totalCollected / totalExpected) * 100) : 0;

  res.json(
    GetDashboardSummaryResponse.parse({
      totalExpected,
      totalCollected,
      totalOutstanding,
      collectionRate: Math.round(collectionRate * 10) / 10,
      studentCount: studentCount?.count ?? 0,
      activeTermLabel: `Term ${CURRENT_TERM} ${CURRENT_YEAR}`,
      mpesaToday: todayMap["mpesa"] ?? 0,
      cashToday: todayMap["cash"] ?? 0,
      bankToday: todayMap["bank"] ?? 0,
    })
  );
});

router.get("/dashboard/collection-trend", async (req, res): Promise<void> => {
  const rows = await db
    .select({
      date: sql<string>`payment_date::date::text`,
      method: paymentsTable.method,
      amount: sql<number>`sum(amount::numeric)::float`,
    })
    .from(paymentsTable)
    .where(
      and(
        eq(paymentsTable.status, "confirmed"),
        gte(paymentsTable.paymentDate, new Date(Date.now() - 500 * 24 * 60 * 60 * 1000))
      )
    )
    .groupBy(sql`payment_date::date`, paymentsTable.method)
    .orderBy(sql`payment_date::date`);

  res.json(GetCollectionTrendResponse.parse(rows.map(r => ({
    date: r.date,
    method: r.method,
    amount: r.amount ?? 0,
  }))));
});

router.get("/dashboard/fund-balances", async (req, res): Promise<void> => {
  const accounts = await db.select().from(fundAccountsTable);
  res.json(
    GetFundBalancesResponse.parse(
      accounts.map((a) => ({
        accountId: a.id,
        accountName: a.name,
        accountType: a.accountType,
        balance: parseFloat(a.currentBalance as string),
        currency: "KES",
      }))
    )
  );
});

router.get("/dashboard/recent-payments", async (req, res): Promise<void> => {
  const rows = await db
    .select({
      payment: paymentsTable,
      studentName: studentsTable.fullName,
      admissionNumber: studentsTable.admissionNumber,
      class: studentsTable.class,
    })
    .from(paymentsTable)
    .innerJoin(studentsTable, eq(paymentsTable.studentId, studentsTable.id))
    .where(eq(paymentsTable.status, "confirmed"))
    .orderBy(sql`${paymentsTable.paymentDate} desc`)
    .limit(10);

  res.json(
    GetRecentPaymentsResponse.parse(
      rows.map((r) => ({
        payment: {
          ...r.payment,
          amount: parseFloat(r.payment.amount as string),
          fundAllocation: (r.payment.fundAllocation as any[]) ?? [],
        },
        studentName: r.studentName,
        admissionNumber: r.admissionNumber,
        class: r.class,
      }))
    )
  );
});

router.get("/dashboard/defaulters-count", async (req, res): Promise<void> => {
  const students = await db
    .select()
    .from(studentsTable)
    .where(eq(studentsTable.status, "active"));

  const feeStructures = await db
    .select()
    .from(feeStructuresTable)
    .where(
      and(
        eq(feeStructuresTable.academicYear, CURRENT_YEAR),
        eq(feeStructuresTable.term, CURRENT_TERM)
      )
    );

  const feeMap = Object.fromEntries(feeStructures.map((f) => [f.class, parseFloat(f.totalAmount as string)]));

  const paymentTotals = await db
    .select({
      studentId: paymentsTable.studentId,
      total: sql<number>`sum(amount::numeric)::float`,
    })
    .from(paymentsTable)
    .where(
      and(
        eq(paymentsTable.academicYear, CURRENT_YEAR),
        eq(paymentsTable.term, CURRENT_TERM),
        eq(paymentsTable.status, "confirmed")
      )
    )
    .groupBy(paymentsTable.studentId);

  const paidMap = Object.fromEntries(paymentTotals.map((p) => [p.studentId, p.total ?? 0]));

  const classMap: Record<string, { count: number; totalOwed: number }> = {};
  for (const s of students) {
    const expected = feeMap[s.class] ?? 0;
    const paid = paidMap[s.id] ?? 0;
    const balance = expected - paid;
    if (balance > 0) {
      if (!classMap[s.class]) classMap[s.class] = { count: 0, totalOwed: 0 };
      classMap[s.class].count++;
      classMap[s.class].totalOwed += balance;
    }
  }

  res.json(
    GetDefaultersCountResponse.parse(
      Object.entries(classMap).map(([cls, v]) => ({
        class: cls,
        count: v.count,
        totalOwed: v.totalOwed,
      }))
    )
  );
});

export default router;
