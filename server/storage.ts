import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, asc, desc } from "drizzle-orm";
import * as schema from "@shared/schema";
import type { DailyLog, InsertDailyLog, ChatMessage, InsertChatMessage, DermAppointment, InsertDermAppointment } from "@shared/schema";
import path from "path";
import fs from "fs";

const DB_DIR = process.env.NODE_ENV === "production" ? "/tmp" : path.resolve(".");
fs.mkdirSync(DB_DIR, { recursive: true });
const DB_PATH = path.join(DB_DIR, "skincare.db");
const sqlite = new Database(DB_PATH);
const db = drizzle(sqlite, { schema });

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS daily_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL UNIQUE,
    tret_applied INTEGER NOT NULL DEFAULT 0,
    tret_method TEXT NOT NULL DEFAULT 'skipped',
    tret_night INTEGER NOT NULL DEFAULT 0,
    cyspera_applied INTEGER NOT NULL DEFAULT 0,
    cyspera_duration INTEGER NOT NULL DEFAULT 0,
    dryness INTEGER NOT NULL DEFAULT 0,
    peeling INTEGER NOT NULL DEFAULT 0,
    redness INTEGER NOT NULL DEFAULT 0,
    purging INTEGER NOT NULL DEFAULT 0,
    rosacea_flare INTEGER NOT NULL DEFAULT 0,
    rosacea_severity INTEGER NOT NULL DEFAULT 0,
    rosacea_zones TEXT NOT NULL DEFAULT '[]',
    malar_bumps INTEGER NOT NULL DEFAULT 0,
    tolerance INTEGER NOT NULL DEFAULT 5,
    skin_feel INTEGER NOT NULL DEFAULT 3,
    am_routine_done INTEGER NOT NULL DEFAULT 0,
    red_light_used INTEGER NOT NULL DEFAULT 0,
    red_light_duration INTEGER NOT NULL DEFAULT 0,
    procedure_tags TEXT NOT NULL DEFAULT '[]',
    notes TEXT DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL,
    context TEXT NOT NULL DEFAULT 'general'
  );

  CREATE TABLE IF NOT EXISTS derm_appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'checkup',
    prep_notes TEXT DEFAULT '',
    visit_notes TEXT DEFAULT '',
    follow_up_actions TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'upcoming'
  );
`);

// Idempotent migrations for existing databases
const addCol = (table: string, col: string, def: string) => {
  try { sqlite.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`); } catch {}
};
addCol("daily_logs", "red_light_used", "INTEGER NOT NULL DEFAULT 0");
addCol("daily_logs", "red_light_duration", "INTEGER NOT NULL DEFAULT 0");

export interface IStorage {
  // Logs
  getAllLogs(): DailyLog[];
  getRecentLogs(n: number): DailyLog[];
  getLogByDate(date: string): DailyLog | undefined;
  upsertLog(data: InsertDailyLog): DailyLog;
  // Chat
  getMessages(context: string, limit?: number): ChatMessage[];
  addMessage(data: InsertChatMessage): ChatMessage;
  clearMessages(context: string): void;
  // Derm
  getAllAppointments(): DermAppointment[];
  getAppointment(id: number): DermAppointment | undefined;
  createAppointment(data: InsertDermAppointment): DermAppointment;
  updateAppointment(id: number, data: Partial<InsertDermAppointment>): DermAppointment;
  deleteAppointment(id: number): void;
}

export class Storage implements IStorage {
  getAllLogs() { return db.select().from(schema.dailyLogs).orderBy(asc(schema.dailyLogs.date)).all(); }
  getRecentLogs(n: number) { return db.select().from(schema.dailyLogs).orderBy(desc(schema.dailyLogs.date)).limit(n).all(); }
  getLogByDate(date: string) { return db.select().from(schema.dailyLogs).where(eq(schema.dailyLogs.date, date)).get(); }
  upsertLog(data: InsertDailyLog): DailyLog {
    const existing = this.getLogByDate(data.date);
    if (existing) return db.update(schema.dailyLogs).set(data).where(eq(schema.dailyLogs.date, data.date)).returning().get();
    return db.insert(schema.dailyLogs).values(data).returning().get();
  }

  getMessages(context: string, limit = 50) {
    return db.select().from(schema.chatMessages)
      .where(eq(schema.chatMessages.context, context))
      .orderBy(asc(schema.chatMessages.id))
      .limit(limit).all();
  }
  addMessage(data: InsertChatMessage): ChatMessage {
    return db.insert(schema.chatMessages).values(data).returning().get();
  }
  clearMessages(context: string) {
    db.delete(schema.chatMessages).where(eq(schema.chatMessages.context, context)).run();
  }

  getAllAppointments() { return db.select().from(schema.dermAppointments).orderBy(asc(schema.dermAppointments.date)).all(); }
  getAppointment(id: number) { return db.select().from(schema.dermAppointments).where(eq(schema.dermAppointments.id, id)).get(); }
  createAppointment(data: InsertDermAppointment): DermAppointment { return db.insert(schema.dermAppointments).values(data).returning().get(); }
  updateAppointment(id: number, data: Partial<InsertDermAppointment>): DermAppointment {
    return db.update(schema.dermAppointments).set(data).where(eq(schema.dermAppointments.id, id)).returning().get();
  }
  deleteAppointment(id: number) { db.delete(schema.dermAppointments).where(eq(schema.dermAppointments.id, id)).run(); }
}

export const storage = new Storage();
