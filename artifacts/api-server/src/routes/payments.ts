import { Router, type IRouter } from "express";
import { db, paymentsTable, studentsTable, fundAccountsTable, accountTransactionsTable, unmatchedMpesaTable } from "@workspace/db";
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

const router: IRouter = Router();

function parsePayment(p: any) {
  return {
    ...p,
    amount: parseFloat(p.amount as string),
    fundAllocation: (p.fundAllocation as any[]) ?? [],
  };
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

  const [payment] = await db
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

  const [payment] = await db
    .update(paymentsTable)
    .set({ status: "reversed" })
    .where(eq(paymentsTable.id, params.data.id))
    .returning();

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
        amount: parseFloat(r.amount as string),
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

  const [payment] = await db
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

  await db.delete(unmatchedMpesaTable).where(eq(unmatchedMpesaTable.id, parsed.data.unmatchedId));

  res.json(MatchMpesaPaymentResponse.parse(parsePayment(payment)));
});

export default router;
