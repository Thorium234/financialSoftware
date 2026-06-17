import { Router, type IRouter } from "express";
import { db, studentsTable, paymentsTable, feeStructuresTable } from "@workspace/db";
import { sql, eq, ilike, and, or, desc } from "drizzle-orm";
import {
  ListStudentsQueryParams,
  CreateStudentBody,
  GetStudentParams,
  UpdateStudentParams,
  UpdateStudentBody,
  DeleteStudentParams,
  GetStudentStatementParams,
  ListStudentsResponse,
  GetStudentResponse,
  UpdateStudentResponse,
  GetStudentStatementResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const CURRENT_YEAR = "2025";
const CURRENT_TERM = 2;

router.get("/students", async (req, res): Promise<void> => {
  const params = ListStudentsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { search, class: cls, stream, status } = params.data;

  const conditions = [];
  if (search) {
    conditions.push(
      or(
        ilike(studentsTable.fullName, `%${search}%`),
        ilike(studentsTable.admissionNumber, `%${search}%`)
      )!
    );
  }
  if (cls) conditions.push(eq(studentsTable.class, cls));
  if (stream) conditions.push(eq(studentsTable.stream, stream));
  if (status) conditions.push(eq(studentsTable.status, status));

  const students = await db
    .select()
    .from(studentsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(studentsTable.admissionNumber);

  res.json(ListStudentsResponse.parse(students));
});

router.post("/students", async (req, res): Promise<void> => {
  const parsed = CreateStudentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [student] = await db.insert(studentsTable).values(parsed.data).returning();
  res.status(201).json(student);
});

router.get("/students/:id", async (req, res): Promise<void> => {
  const params = GetStudentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [student] = await db
    .select()
    .from(studentsTable)
    .where(eq(studentsTable.id, params.data.id));

  if (!student) {
    res.status(404).json({ error: "Student not found" });
    return;
  }

  const [feeStructure] = await db
    .select()
    .from(feeStructuresTable)
    .where(
      and(
        eq(feeStructuresTable.academicYear, CURRENT_YEAR),
        eq(feeStructuresTable.term, CURRENT_TERM),
        eq(feeStructuresTable.class, student.class)
      )
    );

  const feeExpected = feeStructure ? parseFloat(feeStructure.totalAmount as string) : 0;

  const [paymentSum] = await db
    .select({ total: sql<number>`sum(amount::numeric)::float` })
    .from(paymentsTable)
    .where(
      and(
        eq(paymentsTable.studentId, student.id),
        eq(paymentsTable.academicYear, CURRENT_YEAR),
        eq(paymentsTable.term, CURRENT_TERM),
        eq(paymentsTable.status, "confirmed")
      )
    );

  const totalPaid = paymentSum?.total ?? 0;
  const currentBalance = feeExpected - totalPaid;

  const recentPayments = await db
    .select()
    .from(paymentsTable)
    .where(eq(paymentsTable.studentId, student.id))
    .orderBy(desc(paymentsTable.paymentDate))
    .limit(5);

  res.json(
    GetStudentResponse.parse({
      student,
      currentBalance,
      totalPaid,
      feeExpected,
      recentPayments: recentPayments.map((p) => ({
        ...p,
        amount: parseFloat(p.amount as string),
        fundAllocation: (p.fundAllocation as any[]) ?? [],
      })),
    })
  );
});

router.patch("/students/:id", async (req, res): Promise<void> => {
  const params = UpdateStudentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateStudentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [student] = await db
    .update(studentsTable)
    .set(parsed.data)
    .where(eq(studentsTable.id, params.data.id))
    .returning();

  if (!student) {
    res.status(404).json({ error: "Student not found" });
    return;
  }

  res.json(UpdateStudentResponse.parse(student));
});

router.delete("/students/:id", async (req, res): Promise<void> => {
  const params = DeleteStudentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  await db.delete(studentsTable).where(eq(studentsTable.id, params.data.id));
  res.sendStatus(204);
});

router.get("/students/:id/statement", async (req, res): Promise<void> => {
  const params = GetStudentStatementParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [student] = await db
    .select()
    .from(studentsTable)
    .where(eq(studentsTable.id, params.data.id));

  if (!student) {
    res.status(404).json({ error: "Student not found" });
    return;
  }

  const allPayments = await db
    .select()
    .from(paymentsTable)
    .where(
      and(
        eq(paymentsTable.studentId, student.id),
        eq(paymentsTable.status, "confirmed")
      )
    )
    .orderBy(paymentsTable.paymentDate);

  const allFeeStructures = await db
    .select()
    .from(feeStructuresTable)
    .where(eq(feeStructuresTable.class, student.class));

  const feeMap: Record<string, number> = {};
  for (const fs of allFeeStructures) {
    feeMap[`${fs.academicYear}-${fs.term}`] = parseFloat(fs.totalAmount as string);
  }

  const entries: any[] = [];
  let runningBalance = 0;

  const termKeys = [...new Set([
    ...allPayments.map((p) => `${p.academicYear}-${p.term}`),
    ...Object.keys(feeMap),
  ])].sort();

  for (const key of termKeys) {
    const [yr, term] = key.split("-");
    const feeAmount = feeMap[key] ?? 0;
    if (feeAmount > 0) {
      runningBalance += feeAmount;
      entries.push({
        date: `${yr}-01-01`,
        description: `Fee charge - Term ${term} ${yr}`,
        debit: feeAmount,
        credit: 0,
        balance: runningBalance,
        term: parseInt(term),
        academicYear: yr,
      });
    }
    for (const p of allPayments.filter(
      (p) => `${p.academicYear}-${p.term}` === key
    )) {
      const amt = parseFloat(p.amount as string);
      runningBalance -= amt;
      entries.push({
        date: new Date(p.paymentDate).toISOString().slice(0, 10),
        description: `Payment - ${p.method.toUpperCase()} (${p.transactionRef})`,
        debit: 0,
        credit: amt,
        balance: runningBalance,
        term: p.term,
        academicYear: p.academicYear,
      });
    }
  }

  res.json(
    GetStudentStatementResponse.parse({
      student,
      entries,
      closingBalance: runningBalance,
    })
  );
});

export default router;
