import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ── Daily skin log ─────────────────────────────────────────────────────────
export const dailyLogs = sqliteTable("daily_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull().unique(), // ISO date YYYY-MM-DD

  // Tretinoin
  tretApplied: integer("tret_applied", { mode: "boolean" }).notNull().default(false),
  tretMethod: text("tret_method").notNull().default("skipped"), // sandwich | direct | skipped
  tretNight: integer("tret_night").notNull().default(0), // which tret night number in the cycle

  // Cyspera
  cysperaApplied: integer("cyspera_applied", { mode: "boolean" }).notNull().default(false),
  cysperaDuration: integer("cyspera_duration").notNull().default(0), // minutes

  // Retinization symptoms (0=none 1=mild 2=moderate 3=severe)
  dryness: integer("dryness").notNull().default(0),
  peeling: integer("peeling").notNull().default(0),
  redness: integer("redness").notNull().default(0),
  purging: integer("purging").notNull().default(0),

  // Rosacea
  rosaceaFlare: integer("rosacea_flare", { mode: "boolean" }).notNull().default(false),
  rosaceaSeverity: integer("rosacea_severity").notNull().default(0), // 0-3
  rosaceaZones: text("rosacea_zones").notNull().default("[]"), // JSON array of zone strings

  // Anterior malar bumps (derm tracking)
  malarBumps: integer("malar_bumps").notNull().default(0), // 0/1/2/3+

  // Overall feel
  tolerance: integer("tolerance").notNull().default(5), // 1-10
  skinFeel: integer("skin_feel").notNull().default(3), // 1-5

  // AM routine completed
  amRoutineDone: integer("am_routine_done", { mode: "boolean" }).notNull().default(false),

  // Procedures / events
  procedureTags: text("procedure_tags").notNull().default("[]"), // JSON array

  // Free notes
  notes: text("notes").default(""),
});

export const insertDailyLogSchema = createInsertSchema(dailyLogs).omit({ id: true });
export type InsertDailyLog = z.infer<typeof insertDailyLogSchema>;
export type DailyLog = typeof dailyLogs.$inferSelect;

// ── AI Chat messages ───────────────────────────────────────────────────────
export const chatMessages = sqliteTable("chat_messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  role: text("role").notNull(), // user | assistant
  content: text("content").notNull(),
  createdAt: text("created_at").notNull(), // ISO datetime
  context: text("context").notNull().default("general"), // general | derm | log-analysis
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({ id: true });
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;

// ── Derm appointments ──────────────────────────────────────────────────────
export const dermAppointments = sqliteTable("derm_appointments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull(), // ISO date
  type: text("type").notNull().default("checkup"), // checkup | vbeam | microneedling | botox | other
  prepNotes: text("prep_notes").default(""), // questions to ask
  visitNotes: text("visit_notes").default(""), // what happened
  followUpActions: text("follow_up_actions").default(""), // next steps
  status: text("status").notNull().default("upcoming"), // upcoming | completed
});

export const insertDermAppointmentSchema = createInsertSchema(dermAppointments).omit({ id: true });
export type InsertDermAppointment = z.infer<typeof insertDermAppointmentSchema>;
export type DermAppointment = typeof dermAppointments.$inferSelect;

// ── Constants ──────────────────────────────────────────────────────────────
export const PROCEDURE_TAGS = ["VBeam", "Microneedling", "Dysport/Botox", "Derm Visit", "Chemical Peel", "Facial", "Other"] as const;
export const TRET_METHODS = [
  { value: "sandwich", label: "Sandwich Method" },
  { value: "direct", label: "Direct Apply" },
  { value: "skipped", label: "Did Not Apply" },
] as const;
export const FACE_ZONES = ["Forehead", "Glabella", "Upper malar", "Lateral malar", "Perioral", "Nasolabial", "Chin", "Nose", "Under-eye"] as const;
export const APPT_TYPES = ["Checkup", "VBeam", "Microneedling", "Dysport/Botox", "Other"] as const;
