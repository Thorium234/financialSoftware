import { Router, type IRouter } from "express";
import { db, paymentsTable, studentsTable, fundAccountsTable, accountTransactionsTable, unmatchedMpesaTable, feeStructuresTable } from "@workspace/db";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";
import {
  ListPaymentsQueryParams,
  RecordPaymentBody,
  GetPaymentParams,
  ReversePaymentParams,
  MpesaCallbackBody,
  InitiateMpesaStkPushBody,
  MatchMpesaPaymentBody,
  ListPaymentsResponse,
  GetPaymentResponse,
  ReversePaymentResponse,
  MpesaCallbackResponse,
  InitiateMpesaStkPushResponse,
  ListUnmatchedMpesaResponse,
  MatchMpesaPaymentResponse,
} from "@workspace/api-zod";
import { parseNumeric } from "../lib/parse";

const router: IRouter = Router();
const FUND_ACCOUNT_TYPES = ["tuition", "operations", "bom", "capitation"] as const;

type FundAccountType = (typeof FUND_ACCOUNT_TYPES)[number];

function isFundAccountType(value: string): value is FundAccountType {
  return FUND_ACCOUNT_TYPES.includes(value as FundAccountType);
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function parsePayment(p: any) {
  return {
    ...p,
    amount: parseNumeric(p.amount),
    fundAllocation: (p.fundAllocation as any[]) ?? [],
  };
}

function buildFundAllocations(
  totalAmount: number,
  feeStructure: { totalAmount: unknown; breakdown: unknown } | null,
  accounts: Array<{ id: number; accountType: string }>
) {
  const accountLookup = new Map(
    accounts
      .filter((account) => isFundAccountType(account.accountType))
      .map((account) => [account.accountType, account] as const)
  );

  const breakdown = Array.isArray(feeStructure?.breakdown) ? feeStructure.breakdown : [];
  const breakdownItems = breakdown
    .map((item: any) => ({
      accountType: typeof item?.voteCategory === "string" ? item.voteCategory : item?.accountType,
      amount: Number(item?.amount ?? 0),
    }))
    .filter(
      (item): item is { accountType: FundAccountType; amount: number } =>
        isFundAccountType(item.accountType) && Number.isFinite(item.amount) && item.amount > 0
    );

  const feeTotal = feeStructure ? parseNumeric(feeStructure.totalAmount) : 0;
  const hasFullCoverage =
    breakdownItems.length > 0 &&
    feeTotal > 0 &&
    breakdownItems.every((item) => accountLookup.has(item.accountType));

  if (hasFullCoverage) {
    let remaining = roundMoney(totalAmount);

    return breakdownItems.map((item, index) => {
      const account = accountLookup.get(item.accountType)!;
      const amount =
        index === breakdownItems.length - 1
          ? remaining
          : roundMoney((totalAmount * item.amount) / feeTotal);
      remaining = roundMoney(remaining - amount);

      return {
        accountId: account.id,
        accountType: account.accountType,
        amount,
      };
    });
  }

  const usableAccounts = accounts.filter((account) => isFundAccountType(account.accountType));
  if (usableAccounts.length === 0) {
    return [];
  }

  let remaining = roundMoney(totalAmount);
  const evenShare = roundMoney(totalAmount / usableAccounts.length);

  return usableAccounts.map((account, index) => {
    const amount = index === usableAccounts.length - 1 ? remaining : evenShare;
    remaining = roundMoney(remaining - amount);

    return {
      accountId: account.id,
      accountType: account.accountType as FundAccountType,
      amount,
    };
  });
}

async function postPaymentToLedger(
  tx: any,
  payment: { id: number; amount: unknown; transactionRef: string; paymentDate: Date; studentId: number },
  studentClass: string,
  academicYear: string,
  term: number
) {
  const [feeStructure] = await tx
    .select()
    .from(feeStructuresTable)
    .where(
      and(
        eq(feeStructuresTable.academicYear, academicYear),
        eq(feeStructuresTable.term, term),
        eq(feeStructuresTable.class, studentClass)
      )
    );

  const accounts = await tx.select().from(fundAccountsTable);
  const allocations = buildFundAllocations(parseNumeric(payment.amount), feeStructure ?? null, accounts);

  const postedAllocations: Array<{ accountId: number; accountType: string; amount: number }> = [];

  for (const allocation of allocations) {
    const [updatedAccount] = await tx
      .update(fundAccountsTable)
      .set({
        currentBalance: sql`current_balance + ${allocation.amount}`,
      })
      .where(eq(fundAccountsTable.id, allocation.accountId))
      .returning();

    if (!updatedAccount) {
      continue;
    }

    const currentBalance = parseNumeric(updatedAccount.currentBalance);
    postedAllocations.push({
      accountId: updatedAccount.id,
      accountType: updatedAccount.accountType,
      amount: allocation.amount,
    });

    await tx.insert(accountTransactionsTable).values({
      accountId: updatedAccount.id,
      type: "credit",
      amount: String(allocation.amount),
      balance: String(currentBalance),
      description: `Payment ${payment.transactionRef}`,
      referenceType: "payment",
      referenceId: payment.id,
      transactionDate: payment.paymentDate,
    });
  }

  const [updatedPayment] = await tx
    .update(paymentsTable)
    .set({ fundAllocation: postedAllocations })
    .where(eq(paymentsTable.id, payment.id))
    .returning();

  return updatedPayment ?? null;
}

async function reversePaymentLedger(
  tx: any,
  payment: {
    id: number;
    amount: unknown;
    transactionRef: string;
    paymentDate: Date;
    fundAllocation: unknown;
  }
) {
  const allocations = Array.isArray(payment.fundAllocation) ? payment.fundAllocation : [];

  for (const allocation of allocations) {
    const accountId = Number((allocation as any).accountId);
    const amount = Number((allocation as any).amount);

    if (!Number.isFinite(accountId) || !Number.isFinite(amount) || amount <= 0) {
      continue;
    }

    const [updatedAccount] = await tx
      .update(fundAccountsTable)
      .set({
        currentBalance: sql`current_balance - ${amount}`,
      })
      .where(eq(fundAccountsTable.id, accountId))
      .returning();

    if (!updatedAccount) {
      continue;
    }

    const currentBalance = parseNumeric(updatedAccount.currentBalance);

    await tx.insert(accountTransactionsTable).values({
      accountId: updatedAccount.id,
      type: "debit",
      amount: String(amount),
      balance: String(currentBalance),
      description: `Reversal for payment ${payment.transactionRef}`,
      referenceType: "adjustment",
      referenceId: payment.id,
      transactionDate: new Date(),
    });
  }
}

router.get("/payments", async (req, res): Promise<void> => {
  const params = ListPaymentsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const conditions = [];
  if (params.data.studentId) conditions.push(eq(paymentsTable.studentId, params.data.studentId));
  if (params.data.method) conditions.push(eq(paymentsTable.method, params.data.method));
  if (params.data.status) conditions.push(eq(paymentsTable.status, params.data.status));
  if (params.data.dateFrom) conditions.push(gte(paymentsTable.paymentDate, new Date(params.data.dateFrom)));
  if (params.data.dateTo) conditions.push(lte(paymentsTable.paymentDate, new Date(params.data.dateTo)));

  const rows = await db
    .select({
      payment: paymentsTable,
      studentName: studentsTable.fullName,
      admissionNumber: studentsTable.admissionNumber,
      class: studentsTable.class,
    })
    .from(paymentsTable)
    .innerJoin(studentsTable, eq(paymentsTable.studentId, studentsTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(paymentsTable.paymentDate));

  res.json(
    ListPaymentsResponse.parse(
      rows.map((r) => ({
        payment: parsePayment(r.payment),
        studentName: r.studentName,
        admissionNumber: r.admissionNumber,
        class: r.class,
      }))
    )
  );
});

router.post("/payments", async (req, res): Promise<void> => {
  const parsed = RecordPaymentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { studentId, amount, method, transactionRef, mpesaPhone, paymentDate, academicYear, term, notes } = parsed.data;

  const payment = await db.transaction(async (tx) => {
    const [student] = await tx
      .select({ class: studentsTable.class })
      .from(studentsTable)
      .where(eq(studentsTable.id, studentId));

    if (!student) {
      return null;
    }

    const [createdPayment] = await tx
      .insert(paymentsTable)
      .values({
        studentId,
        amount: String(amount),
        method,
        status: "confirmed",
        transactionRef,
        mpesaPhone: mpesaPhone ?? null,
        paymentDate: new Date(paymentDate),
        academicYear,
        term,
        notes: notes ?? null,
        fundAllocation: [],
      })
      .returning();

    if (!createdPayment) {
      return null;
    }

    return await postPaymentToLedger(tx, createdPayment, student.class, academicYear, term);
  });

  if (!payment) {
    res.status(404).json({ error: "Student not found" });
    return;
  }

  res.status(201).json(parsePayment(payment));
});

router.get("/payments/:id", async (req, res): Promise<void> => {
  const params = GetPaymentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db
    .select({
      payment: paymentsTable,
      studentName: studentsTable.fullName,
      admissionNumber: studentsTable.admissionNumber,
      class: studentsTable.class,
    })
    .from(paymentsTable)
    .innerJoin(studentsTable, eq(paymentsTable.studentId, studentsTable.id))
    .where(eq(paymentsTable.id, params.data.id));

  if (!row) {
    res.status(404).json({ error: "Payment not found" });
    return;
  }

  res.json(
    GetPaymentResponse.parse({
      payment: parsePayment(row.payment),
      studentName: row.studentName,
      admissionNumber: row.admissionNumber,
      class: row.class,
    })
  );
});

router.delete("/payments/:id", async (req, res): Promise<void> => {
  const params = ReversePaymentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  let payment;

  try {
    payment = await db.transaction(async (tx) => {
      const [existing] = await tx.select().from(paymentsTable).where(eq(paymentsTable.id, params.data.id));

      if (!existing) {
        return null;
      }

      if (existing.status === "reversed") {
        throw new Error("Payment is already reversed");
      }

      await reversePaymentLedger(tx, existing);

      const [updatedPayment] = await tx
        .update(paymentsTable)
        .set({ status: "reversed" })
        .where(eq(paymentsTable.id, params.data.id))
        .returning();

      return updatedPayment ?? null;
    });
  } catch (err) {
    if (err instanceof Error && err.message === "Payment is already reversed") {
      res.status(409).json({ error: err.message });
      return;
    }

    throw err;
  }

  if (!payment) {
    res.status(404).json({ error: "Payment not found" });
    return;
  }

  res.json(ReversePaymentResponse.parse(parsePayment(payment)));
});

// M-Pesa C2B Callback
router.post("/payments/mpesa/callback", async (req, res): Promise<void> => {
  const parsed = MpesaCallbackBody.safeParse(req.body);
  if (!parsed.success) {
    res.json(MpesaCallbackResponse.parse({ ResultCode: 1, ResultDesc: "Invalid payload" }));
    return;
  }

  const body = parsed.data.Body as any;
  const stkCallback = body?.stkCallback ?? body?.Body?.stkCallback;

  if (stkCallback) {
    const resultCode = stkCallback.ResultCode;
    if (resultCode === 0) {
      const items: any[] = stkCallback.CallbackMetadata?.Item ?? [];
      const getItem = (name: string) => items.find((i: any) => i.Name === name)?.Value;
      const amount = getItem("Amount");
      const mpesaRef = getItem("MpesaReceiptNumber");
      const phone = getItem("PhoneNumber")?.toString();
      const transDate = getItem("TransactionDate")?.toString();

      if (amount && mpesaRef && phone) {
        await db.insert(unmatchedMpesaTable).values({
          mpesaRef: String(mpesaRef),
          amount: String(amount),
          phone: String(phone),
          transactionDate: transDate ? new Date(transDate) : new Date(),
          accountNumber: null,
        }).onConflictDoNothing();
      }
    }
  }

  const c2bData = body?.C2B ?? body;
  if (c2bData?.TransID && c2bData?.TransAmount) {
    await db.insert(unmatchedMpesaTable).values({
      mpesaRef: String(c2bData.TransID),
      amount: String(c2bData.TransAmount),
      phone: String(c2bData.MSISDN ?? ""),
      transactionDate: new Date(),
      accountNumber: c2bData.BillRefNumber ?? null,
    }).onConflictDoNothing();
  }

  res.json(MpesaCallbackResponse.parse({ ResultCode: 0, ResultDesc: "Accepted" }));
});

// STK Push (simulated — real implementation requires Safaricom credentials)
router.post("/payments/mpesa/stk-push", async (req, res): Promise<void> => {
  const parsed = InitiateMpesaStkPushBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  res.json(
    InitiateMpesaStkPushResponse.parse({
      success: true,
      message: `STK Push of KES ${parsed.data.amount} sent to ${parsed.data.phoneNumber}. Customer will receive a prompt.`,
      checkoutRequestId: `ws_CO_${Date.now()}`,
    })
  );
});

router.get("/payments/mpesa/unmatched", async (req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(unmatchedMpesaTable)
    .orderBy(desc(unmatchedMpesaTable.transactionDate));

  res.json(
    ListUnmatchedMpesaResponse.parse(
      rows.map((r) => ({
        ...r,
        amount: parseNumeric(r.amount),
      }))
    )
  );
});

router.post("/payments/mpesa/match", async (req, res): Promise<void> => {
  const parsed = MatchMpesaPaymentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [unmatched] = await db
    .select()
    .from(unmatchedMpesaTable)
    .where(eq(unmatchedMpesaTable.id, parsed.data.unmatchedId));

  if (!unmatched) {
    res.status(404).json({ error: "Unmatched transaction not found" });
    return;
  }

  const payment = await db.transaction(async (tx) => {
    const [student] = await tx
      .select({ class: studentsTable.class })
      .from(studentsTable)
      .where(eq(studentsTable.id, parsed.data.studentId));

    if (!student) {
      return null;
    }

    const [createdPayment] = await tx
      .insert(paymentsTable)
      .values({
        studentId: parsed.data.studentId,
        amount: unmatched.amount,
        method: "mpesa",
        status: "confirmed",
        transactionRef: unmatched.mpesaRef,
        mpesaPhone: unmatched.phone,
        paymentDate: unmatched.transactionDate,
        academicYear: parsed.data.academicYear,
        term: parsed.data.term,
        notes: "Matched from unmatched M-Pesa queue",
        fundAllocation: [],
      })
      .returning();

    if (!createdPayment) {
      return null;
    }

    await tx.delete(unmatchedMpesaTable).where(eq(unmatchedMpesaTable.id, parsed.data.unmatchedId));

    return await postPaymentToLedger(
      tx,
      createdPayment,
      student.class,
      parsed.data.academicYear,
      parsed.data.term
    );
  });

  if (!payment) {
    res.status(404).json({ error: "Student not found" });
    return;
  }

  res.json(MatchMpesaPaymentResponse.parse(parsePayment(payment)));
});

export default router;
