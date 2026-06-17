import { date, integer, numeric, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { fundAccountsTable } from "./fund_accounts";

export const expensesTable = pgTable("expenses", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").notNull().references(() => fundAccountsTable.id),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  voucherNumber: text("voucher_number").notNull().unique(),
  expenseDate: date("expense_date", { mode: "string" }).notNull(),
  approvedBy: text("approved_by").notNull(),
  supplierName: text("supplier_name"),
  status: text("status").notNull().default("approved"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertExpenseSchema = createInsertSchema(expensesTable).omit({ id: true, createdAt: true });
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Expense = typeof expensesTable.$inferSelect;
