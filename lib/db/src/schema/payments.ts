import { integer, jsonb, numeric, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { studentsTable } from "./students";

export const paymentsTable = pgTable("payments", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().references(() => studentsTable.id),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  method: text("method").notNull(),
  status: text("status").notNull().default("confirmed"),
  transactionRef: text("transaction_ref").notNull(),
  mpesaPhone: text("mpesa_phone"),
  paymentDate: timestamp("payment_date", { withTimezone: true }).notNull(),
  academicYear: text("academic_year").notNull(),
  term: integer("term").notNull(),
  notes: text("notes"),
  fundAllocation: jsonb("fund_allocation").notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPaymentSchema = createInsertSchema(paymentsTable).omit({ id: true, createdAt: true });
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof paymentsTable.$inferSelect;
