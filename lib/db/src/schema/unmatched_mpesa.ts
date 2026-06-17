import { numeric, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const unmatchedMpesaTable = pgTable("unmatched_mpesa", {
  id: serial("id").primaryKey(),
  mpesaRef: text("mpesa_ref").notNull().unique(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  phone: text("phone").notNull(),
  transactionDate: timestamp("transaction_date", { withTimezone: true }).notNull(),
  accountNumber: text("account_number"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertUnmatchedMpesaSchema = createInsertSchema(unmatchedMpesaTable).omit({ id: true, createdAt: true });
export type InsertUnmatchedMpesa = z.infer<typeof insertUnmatchedMpesaSchema>;
export type UnmatchedMpesa = typeof unmatchedMpesaTable.$inferSelect;
