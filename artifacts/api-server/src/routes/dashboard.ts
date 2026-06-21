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
import { CURRENT_YEAR, CURRENT_TERM } from "../lib/constants";
import { parseNumeric } from "../lib/parse";

const router: IRouter = Router();

router.get("/dashboard/summary", async (req, res): Promise<void> => {
  // Count active students per class to compute accurate totalExpected
  const studentClassCounts = await db
    .select({
      class: studentsTable.class,
      count: sql<number>`count(*)::int`,
    })
    .from(studentsTable)
    .where(eq(studentsTable.status, "active"))
    .groupBy(studentsTable.class);

  const totalActiveStudents = studentClassCounts.reduce((sum, r) => sum + r.count, 0);

  const feeStructures = await db
    .select()
    .from(feeStructuresTable)
    .where(
      and(
        eq(feeStructuresTable.academicYear, CURRENT_YEAR),
        eq(feeStructuresTable.term, CURRENT_TERM)
      )
    );

  // Sum (feePerClass × studentsInClass) for each class that has a fee structure
  const feeMap = Object.fromEntries(feeStructures.map((f) => [f.class, parseNumeric(f.totalAmount)]));
  const classCounts = Object.fromEntries(studentClassCounts.map((r) => [r.class, r.count]));
  const totalExpected = Object.entries(feeMap).reduce(
    (sum, [cls, fee]) => sum + fee * (classCounts[cls] ?? 0),
    0
  );

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
      studentCount: totalActiveStudents,
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
        balance: parseNumeric(a.currentBalance),
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
          amount: parseNumeric(r.payment.amount),
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

  const feeMap = Object.fromEntries(feeStructures.map((f) => [f.class, parseNumeric(f.totalAmount)]));

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
