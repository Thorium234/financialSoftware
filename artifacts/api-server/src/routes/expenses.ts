import { Router, type IRouter } from "express";
import { db, expensesTable, fundAccountsTable } from "@workspace/db";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";
import {
  CreateExpenseBody,
  GetExpenseParams,
  VoidExpenseParams,
  ListExpensesQueryParams,
  ListExpensesResponse,
  GetExpenseResponse,
  VoidExpenseResponse,
} from "@workspace/api-zod";
import { parseNumeric } from "../lib/parse";

const router: IRouter = Router();

function parseExpense(e: any) {
  return { ...e, amount: parseNumeric(e.amount) };
}

router.get("/expenses", async (req, res): Promise<void> => {
  const params = ListExpensesQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const conditions = [];
  if (params.data.accountId) conditions.push(eq(expensesTable.accountId, params.data.accountId));
  if (params.data.dateFrom) conditions.push(gte(expensesTable.expenseDate, params.data.dateFrom));
  if (params.data.dateTo) conditions.push(lte(expensesTable.expenseDate, params.data.dateTo));

  const rows = await db
    .select()
    .from(expensesTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(expensesTable.expenseDate));

  res.json(ListExpensesResponse.parse(rows.map(parseExpense)));
});

router.post("/expenses", async (req, res): Promise<void> => {
  const parsed = CreateExpenseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [expense] = await db
    .insert(expensesTable)
    .values({
      ...parsed.data,
      amount: String(parsed.data.amount),
      supplierName: parsed.data.supplierName ?? null,
      status: "approved",
    })
    .returning();

  await db
    .update(fundAccountsTable)
    .set({
      currentBalance: sql`current_balance - ${parsed.data.amount}`,
    })
    .where(eq(fundAccountsTable.id, parsed.data.accountId));

  res.status(201).json(parseExpense(expense));
});

router.get("/expenses/:id", async (req, res): Promise<void> => {
  const params = GetExpenseParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [expense] = await db.select().from(expensesTable).where(eq(expensesTable.id, params.data.id));
  if (!expense) {
    res.status(404).json({ error: "Expense not found" });
    return;
  }

  res.json(GetExpenseResponse.parse(parseExpense(expense)));
});

router.delete("/expenses/:id", async (req, res): Promise<void> => {
  const params = VoidExpenseParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [expense] = await db
    .update(expensesTable)
    .set({ status: "void" })
    .where(eq(expensesTable.id, params.data.id))
    .returning();

  if (!expense) {
    res.status(404).json({ error: "Expense not found" });
    return;
  }

  await db
    .update(fundAccountsTable)
    .set({
      currentBalance: sql`current_balance + ${expense.amount}`,
    })
    .where(eq(fundAccountsTable.id, expense.accountId));

  res.json(VoidExpenseResponse.parse(parseExpense(expense)));
});

export default router;
