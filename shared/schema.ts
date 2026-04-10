import { pgTable, text, integer, boolean, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ── Daily skin log ─────────────────────────────────────────────────────────
export const dailyLogs = pgTable("daily_logs", {
  id: serial("id").primaryKey(),
  date: text("date").notNull().unique(),

  // Tretinoin
  tretApplied: boolean("tret_applied").notNull().default(false),
  tretMethod: text("tret_method").notNull().default("skipped"),
  tretNight: integer("tret_night").notNull().default(0),

  // Cyspera
  cysperaApplied: boolean("cyspera_applied").notNull().default(false),
  cysperaDuration: integer("cyspera_duration").notNull().default(0),

  // Retinization symptoms (0=none 1=mild 2=moderate 3=severe)
  dryness: integer("dryness").notNull().default(0),
  peeling: integer("peeling").notNull().default(0),
  redness: integer("redness").notNull().default(0),
  purging: integer("purging").notNull().default(0),

  // Rosacea
  rosaceaFlare: boolean("rosacea_flare").notNull().default(false),
  rosaceaSeverity: integer("rosacea_severity").notNull().default(0),
  rosaceaZones: text("rosacea_zones").notNull().default("[]"),

  // Anterior malar bumps
  malarBumps: integer("malar_bumps").notNull().default(0),

  // Overall feel
  tolerance: integer("tolerance").notNull().default(5),
  skinFeel: integer("skin_feel").notNull().default(3),

  // AM routine
  amRoutineDone: boolean("am_routine_done").notNull().default(false),

  // Red light mask
  redLightUsed: boolean("red_light_used").notNull().default(false),
  redLightDuration: integer("red_light_duration").notNull().default(10),

  // Procedures / events
  procedureTags: text("procedure_tags").notNull().default("[]"),

  // Notes
  notes: text("notes").default(""),
});

export const insertDailyLogSchema = createInsertSchema(dailyLogs).omit({ id: true });
export type InsertDailyLog = z.infer<typeof insertDailyLogSchema>;
export type DailyLog = typeof dailyLogs.$inferSelect;

// ── AI Chat messages ───────────────────────────────────────────────────────
export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: text("created_at").notNull(),
  context: text("context").notNull().default("general"),
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({ id: true });
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;

// ── Derm appointments ──────────────────────────────────────────────────────
export const dermAppointments = pgTable("derm_appointments", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(),
  type: text("type").notNull().default("checkup"),
  prepNotes: text("prep_notes").default(""),
  visitNotes: text("visit_notes").default(""),
  followUpActions: text("follow_up_actions").default(""),
  status: text("status").notNull().default("upcoming"),
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
