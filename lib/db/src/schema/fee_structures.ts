import { integer, jsonb, numeric, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const feeStructuresTable = pgTable("fee_structures", {
  id: serial("id").primaryKey(),
  academicYear: text("academic_year").notNull(),
  term: integer("term").notNull(),
  class: text("class").notNull(),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull(),
  breakdown: jsonb("breakdown").notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertFeeStructureSchema = createInsertSchema(feeStructuresTable).omit({ id: true, createdAt: true });
export type InsertFeeStructure = z.infer<typeof insertFeeStructureSchema>;
export type FeeStructure = typeof feeStructuresTable.$inferSelect;
