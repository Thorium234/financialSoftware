import { Router, type IRouter } from "express";
import { db, capitationDisbursementsTable, studentsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import {
  RecordCapitationDisbursementBody,
  ListCapitationDisbursementsResponse,
  GetCapitationSummaryResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function parseDisbursement(d: any) {
  return {
    ...d,
    amount: parseFloat(d.amount as string),
    perStudentRate: parseFloat(d.perStudentRate as string),
  };
}

router.get("/capitation/disbursements", async (req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(capitationDisbursementsTable)
    .orderBy(capitationDisbursementsTable.disbursementDate);

  res.json(ListCapitationDisbursementsResponse.parse(rows.map(parseDisbursement)));
});

router.post("/capitation/disbursements", async (req, res): Promise<void> => {
  const parsed = RecordCapitationDisbursementBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const perStudentRate = parsed.data.amount / parsed.data.studentCount;

  const [disbursement] = await db
    .insert(capitationDisbursementsTable)
    .values({
      ...parsed.data,
      amount: String(parsed.data.amount),
      perStudentRate: String(perStudentRate),
    })
    .returning();

  res.status(201).json(parseDisbursement(disbursement));
});

router.get("/capitation/summary", async (req, res): Promise<void> => {
  const [studentCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(studentsTable)
    .where(eq(studentsTable.status, "active"));

  const disbursements = await db.select().from(capitationDisbursementsTable);

  const totalDisbursed = disbursements.reduce((sum, d) => sum + parseFloat(d.amount as string), 0);
  const latestRate = disbursements.length > 0
    ? parseFloat(disbursements[disbursements.length - 1].perStudentRate as string)
    : 22265;

  const enrolled = studentCount?.count ?? 0;
  const expectedAtCurrentRate = enrolled * latestRate;

  res.json(
    GetCapitationSummaryResponse.parse({
      enrolledStudents: enrolled,
      totalDisbursed,
      expectedAtCurrentRate,
      perStudentRate: latestRate,
      disbursements: disbursements.map(parseDisbursement),
    })
  );
});

export default router;
