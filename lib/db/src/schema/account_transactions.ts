import { integer, numeric, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { fundAccountsTable } from "./fund_accounts";

export const accountTransactionsTable = pgTable("account_transactions", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").notNull().references(() => fundAccountsTable.id),
  type: text("type").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  balance: numeric("balance", { precision: 12, scale: 2 }).notNull(),
  description: text("description").notNull(),
  referenceType: text("reference_type").notNull(),
  referenceId: integer("reference_id").notNull(),
  transactionDate: timestamp("transaction_date", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAccountTransactionSchema = createInsertSchema(accountTransactionsTable).omit({ id: true });
export type InsertAccountTransaction = z.infer<typeof insertAccountTransactionSchema>;
export type AccountTransaction = typeof accountTransactionsTable.$inferSelect;
