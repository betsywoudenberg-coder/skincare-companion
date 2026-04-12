import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq, asc, desc } from "drizzle-orm";
import * as schema from "@shared/schema";
import type { DailyLog, InsertDailyLog, ChatMessage, InsertChatMessage, DermAppointment, InsertDermAppointment } from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 5,
});

const db = drizzle(pool, { schema });

// Create tables if they don't exist
async function initDb() {
  await pool.query(`
    ALTER TABLE daily_logs ADD COLUMN IF NOT EXISTS face_map TEXT NOT NULL DEFAULT '{}';

    CREATE TABLE IF NOT EXISTS daily_logs (
      id SERIAL PRIMARY KEY,
      date TEXT NOT NULL UNIQUE,
      tret_applied BOOLEAN NOT NULL DEFAULT false,
      tret_method TEXT NOT NULL DEFAULT 'skipped',
      tret_night INTEGER NOT NULL DEFAULT 0,
      cyspera_applied BOOLEAN NOT NULL DEFAULT false,
      cyspera_duration INTEGER NOT NULL DEFAULT 0,
      dryness INTEGER NOT NULL DEFAULT 0,
      peeling INTEGER NOT NULL DEFAULT 0,
      redness INTEGER NOT NULL DEFAULT 0,
      purging INTEGER NOT NULL DEFAULT 0,
      rosacea_flare BOOLEAN NOT NULL DEFAULT false,
      rosacea_severity INTEGER NOT NULL DEFAULT 0,
      rosacea_zones TEXT NOT NULL DEFAULT '[]',
      malar_bumps INTEGER NOT NULL DEFAULT 0,
      tolerance INTEGER NOT NULL DEFAULT 5,
      skin_feel INTEGER NOT NULL DEFAULT 3,
      am_routine_done BOOLEAN NOT NULL DEFAULT false,
      face_map TEXT NOT NULL DEFAULT '{}',
      red_light_used BOOLEAN NOT NULL DEFAULT false,
      red_light_duration INTEGER NOT NULL DEFAULT 10,
      procedure_tags TEXT NOT NULL DEFAULT '[]',
      notes TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id SERIAL PRIMARY KEY,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL,
      context TEXT NOT NULL DEFAULT 'general'
    );

    CREATE TABLE IF NOT EXISTS derm_appointments (
      id SERIAL PRIMARY KEY,
      date TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'checkup',
      prep_notes TEXT DEFAULT '',
      visit_notes TEXT DEFAULT '',
      follow_up_actions TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'upcoming'
    );
  `);
}

// Run init immediately — async but errors will surface on first request
initDb().catch(console.error);

export interface IStorage {
  getAllLogs(): Promise<DailyLog[]>;
  getRecentLogs(n: number): Promise<DailyLog[]>;
  getLogByDate(date: string): Promise<DailyLog | undefined>;
  upsertLog(data: InsertDailyLog): Promise<DailyLog>;
  getMessages(context: string, limit?: number): Promise<ChatMessage[]>;
  addMessage(data: InsertChatMessage): Promise<ChatMessage>;
  clearMessages(context: string): Promise<void>;
  getAllAppointments(): Promise<DermAppointment[]>;
  getAppointment(id: number): Promise<DermAppointment | undefined>;
  createAppointment(data: InsertDermAppointment): Promise<DermAppointment>;
  updateAppointment(id: number, data: Partial<InsertDermAppointment>): Promise<DermAppointment>;
  deleteAppointment(id: number): Promise<void>;
}

export class Storage implements IStorage {
  async getAllLogs() {
    return db.select().from(schema.dailyLogs).orderBy(asc(schema.dailyLogs.date));
  }
  async getRecentLogs(n: number) {
    return db.select().from(schema.dailyLogs).orderBy(desc(schema.dailyLogs.date)).limit(n);
  }
  async getLogByDate(date: string) {
    const rows = await db.select().from(schema.dailyLogs).where(eq(schema.dailyLogs.date, date));
    return rows[0];
  }
  async upsertLog(data: InsertDailyLog): Promise<DailyLog> {
    const existing = await this.getLogByDate(data.date);
    if (existing) {
      const rows = await db.update(schema.dailyLogs).set(data).where(eq(schema.dailyLogs.date, data.date)).returning();
      return rows[0];
    }
    const rows = await db.insert(schema.dailyLogs).values(data).returning();
    return rows[0];
  }

  async getMessages(context: string, limit = 50) {
    return db.select().from(schema.chatMessages)
      .where(eq(schema.chatMessages.context, context))
      .orderBy(asc(schema.chatMessages.id))
      .limit(limit);
  }
  async addMessage(data: InsertChatMessage): Promise<ChatMessage> {
    const rows = await db.insert(schema.chatMessages).values(data).returning();
    return rows[0];
  }
  async clearMessages(context: string) {
    await db.delete(schema.chatMessages).where(eq(schema.chatMessages.context, context));
  }

  async getAllAppointments() {
    return db.select().from(schema.dermAppointments).orderBy(asc(schema.dermAppointments.date));
  }
  async getAppointment(id: number) {
    const rows = await db.select().from(schema.dermAppointments).where(eq(schema.dermAppointments.id, id));
    return rows[0];
  }
  async createAppointment(data: InsertDermAppointment): Promise<DermAppointment> {
    const rows = await db.insert(schema.dermAppointments).values(data).returning();
    return rows[0];
  }
  async updateAppointment(id: number, data: Partial<InsertDermAppointment>): Promise<DermAppointment> {
    const rows = await db.update(schema.dermAppointments).set(data).where(eq(schema.dermAppointments.id, id)).returning();
    return rows[0];
  }
  async deleteAppointment(id: number) {
    await db.delete(schema.dermAppointments).where(eq(schema.dermAppointments.id, id));
  }
}

export const storage = new Storage();
