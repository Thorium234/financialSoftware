import { numeric, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const fundAccountsTable = pgTable("fund_accounts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  accountType: text("account_type").notNull(),
  description: text("description").notNull(),
  currentBalance: numeric("current_balance", { precision: 12, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertFundAccountSchema = createInsertSchema(fundAccountsTable).omit({ id: true, createdAt: true });
export type InsertFundAccount = z.infer<typeof insertFundAccountSchema>;
export type FundAccount = typeof fundAccountsTable.$inferSelect;
