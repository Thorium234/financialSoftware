import { date, integer, numeric, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const capitationDisbursementsTable = pgTable("capitation_disbursements", {
  id: serial("id").primaryKey(),
  academicYear: text("academic_year").notNull(),
  term: integer("term").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  disbursementDate: date("disbursement_date", { mode: "string" }).notNull(),
  moeReference: text("moe_reference").notNull(),
  studentCount: integer("student_count").notNull(),
  perStudentRate: numeric("per_student_rate", { precision: 10, scale: 2 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCapitationDisbursementSchema = createInsertSchema(capitationDisbursementsTable).omit({ id: true, createdAt: true });
export type InsertCapitationDisbursement = z.infer<typeof insertCapitationDisbursementSchema>;
export type CapitationDisbursement = typeof capitationDisbursementsTable.$inferSelect;
