import { Router, type IRouter } from "express";
import { db, feeStructuresTable, studentsTable, paymentsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import {
  ListFeeStructuresQueryParams,
  CreateFeeStructureBody,
  UpdateFeeStructureParams,
  UpdateFeeStructureBody,
  DeleteFeeStructureParams,
  ListDefaultersQueryParams,
  ListFeeStructuresResponse,
  UpdateFeeStructureResponse,
  ListDefaultersResponse,
} from "@workspace/api-zod";
import { CURRENT_YEAR, CURRENT_TERM } from "../lib/constants";
import { parseNumeric } from "../lib/parse";

const router: IRouter = Router();

router.get("/fees/structures", async (req, res): Promise<void> => {
  const params = ListFeeStructuresQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const conditions = [];
  if (params.data.academicYear) conditions.push(eq(feeStructuresTable.academicYear, params.data.academicYear));
  if (params.data.term) conditions.push(eq(feeStructuresTable.term, params.data.term));

  const structures = await db
    .select()
    .from(feeStructuresTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(feeStructuresTable.academicYear, feeStructuresTable.term);

  res.json(
    ListFeeStructuresResponse.parse(
      structures.map((s) => ({
        ...s,
        totalAmount: parseNumeric(s.totalAmount),
        breakdown: (s.breakdown as any[]) ?? [],
      }))
    )
  );
});

router.post("/fees/structures", async (req, res): Promise<void> => {
  const parsed = CreateFeeStructureBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const breakdown = parsed.data.breakdown as any[];
  const totalAmount = breakdown.reduce((sum: number, item: any) => sum + Number(item.amount), 0);

  const [structure] = await db
    .insert(feeStructuresTable)
    .values({
      ...parsed.data,
      totalAmount: String(totalAmount),
      breakdown: parsed.data.breakdown,
    })
    .returning();

  res.status(201).json({
    ...structure,
    totalAmount: parseNumeric(structure.totalAmount),
    breakdown: (structure.breakdown as any[]) ?? [],
  });
});

router.patch("/fees/structures/:id", async (req, res): Promise<void> => {
  const params = UpdateFeeStructureParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateFeeStructureBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const breakdown = parsed.data.breakdown as any[] | undefined;
  const totalAmount = breakdown
    ? String(breakdown.reduce((sum: number, item: any) => sum + Number(item.amount), 0))
    : undefined;

  const [structure] = await db
    .update(feeStructuresTable)
    .set({
      ...(breakdown ? { breakdown } : {}),
      ...(totalAmount ? { totalAmount } : {}),
    })
    .where(eq(feeStructuresTable.id, params.data.id))
    .returning();

  if (!structure) {
    res.status(404).json({ error: "Fee structure not found" });
    return;
  }

  res.json(
    UpdateFeeStructureResponse.parse({
      ...structure,
      totalAmount: parseNumeric(structure.totalAmount),
      breakdown: (structure.breakdown as any[]) ?? [],
    })
  );
});

router.delete("/fees/structures/:id", async (req, res): Promise<void> => {
  const params = DeleteFeeStructureParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  await db.delete(feeStructuresTable).where(eq(feeStructuresTable.id, params.data.id));
  res.sendStatus(204);
});

router.get("/fees/defaulters", async (req, res): Promise<void> => {
  const params = ListDefaultersQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const students = await db
    .select()
    .from(studentsTable)
    .where(
      and(
        eq(studentsTable.status, "active"),
        ...(params.data.class ? [eq(studentsTable.class, params.data.class)] : [])
      )
    );

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

  const minBalance = params.data.minBalance ? Number(params.data.minBalance) : 1;

  const defaulters = students
    .map((s) => {
      const feeExpected = feeMap[s.class] ?? 0;
      const totalPaid = paidMap[s.id] ?? 0;
      const balance = feeExpected - totalPaid;
      return {
        studentId: s.id,
        admissionNumber: s.admissionNumber,
        fullName: s.fullName,
        class: s.class,
        guardianPhone: s.guardianPhone ?? null,
        feeExpected,
        totalPaid,
        balance,
      };
    })
    .filter((d) => d.balance >= minBalance)
    .sort((a, b) => b.balance - a.balance);

  res.json(ListDefaultersResponse.parse(defaulters));
});

export default router;
