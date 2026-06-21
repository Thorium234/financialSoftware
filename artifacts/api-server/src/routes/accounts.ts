import { Router, type IRouter } from "express";
import { db, fundAccountsTable, accountTransactionsTable } from "@workspace/db";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import {
  CreateAccountBody,
  ListAccountTransactionsQueryParams,
  ListAccountsResponse,
  ListAccountTransactionsResponse,
} from "@workspace/api-zod";
import { parseNumeric } from "../lib/parse";

const router: IRouter = Router();

router.get("/accounts", async (req, res): Promise<void> => {
  const accounts = await db.select().from(fundAccountsTable).orderBy(fundAccountsTable.accountType);

  res.json(
    ListAccountsResponse.parse(
      accounts.map((a) => ({
        ...a,
        currentBalance: parseNumeric(a.currentBalance),
      }))
    )
  );
});

router.post("/accounts", async (req, res): Promise<void> => {
  const parsed = CreateAccountBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [account] = await db
    .insert(fundAccountsTable)
    .values({ ...parsed.data, currentBalance: "0" })
    .returning();

  res.status(201).json({
    ...account,
    currentBalance: parseNumeric(account.currentBalance),
  });
});

router.get("/account-transactions", async (req, res): Promise<void> => {
  const params = ListAccountTransactionsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const conditions = [eq(accountTransactionsTable.accountId, params.data.accountId)];
  if (params.data.dateFrom) {
    conditions.push(gte(accountTransactionsTable.transactionDate, new Date(params.data.dateFrom)));
  }
  if (params.data.dateTo) {
    conditions.push(lte(accountTransactionsTable.transactionDate, new Date(params.data.dateTo)));
  }

  const txns = await db
    .select()
    .from(accountTransactionsTable)
    .where(and(...conditions))
    .orderBy(desc(accountTransactionsTable.transactionDate));

  res.json(
    ListAccountTransactionsResponse.parse(
      txns.map((t) => ({
        ...t,
        amount: parseNumeric(t.amount),
        balance: parseNumeric(t.balance),
      }))
    )
  );
});

export default router;
