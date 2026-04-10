import type { Express } from "express";
import type { Server } from "http";
import Anthropic from "@anthropic-ai/sdk";
import { storage } from "./storage";
import { insertDailyLogSchema, insertDermAppointmentSchema } from "@shared/schema";

const anthropic = new Anthropic();

// Full skincare context is stored privately in the AI_SYSTEM_PROMPT environment variable on Render.
// This keeps personal medical history out of the public repository.
const SYSTEM_PROMPT = process.env.AI_SYSTEM_PROMPT || "You are a helpful skincare AI coach. Be direct and concise.";

export function registerRoutes(httpServer: Server, app: Express) {

  // Wake-up ping
  app.get("/api/ping", (_req, res) => res.json({ ok: true, ts: Date.now() }));

  // Daily logs
  app.get("/api/logs", async (_req, res) => { try { res.json(await storage.getAllLogs()); } catch (e: any) { res.status(500).json({ error: e.message }); } });
  app.get("/api/logs/recent/:n", async (req, res) => { try { res.json(await storage.getRecentLogs(Number(req.params.n) || 7)); } catch (e: any) { res.status(500).json({ error: e.message }); } });
  app.get("/api/logs/:date", async (req, res) => {
    try {
      const log = await storage.getLogByDate(req.params.date);
      if (!log) return res.status(404).json({ error: "Not found" });
      res.json(log);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/logs", async (req, res) => {
    const parsed = insertDailyLogSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    try { res.json(await storage.upsertLog(parsed.data)); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Chat
  app.get("/api/chat/:context", async (req, res) => {
    try { res.json(await storage.getMessages(req.params.context, 100)); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/chat/:context", async (req, res) => {
    const { message } = req.body;
    const context = req.params.context;
    if (!message?.trim()) return res.status(400).json({ error: "Message required" });
    const now = new Date().toISOString();
    await storage.addMessage({ role: "user", content: message, createdAt: now, context });

    const history = await storage.getMessages(context, 40);
    const claudeMessages = history.map(m => ({ role: m.role as "user" | "assistant", content: m.content }));

    const recentLogs = await storage.getRecentLogs(7);
    let systemWithContext = SYSTEM_PROMPT;
    if (recentLogs.length > 0) {
      const logSummary = recentLogs.slice(0, 3).map(l => {
        const tags = JSON.parse(l.procedureTags || "[]");
        return `${l.date}: tret=${l.tretApplied ? l.tretMethod : "no"}, cyspera=${l.cysperaApplied}, dry=${l.dryness}, peel=${l.peeling}, red=${l.redness}, purge=${l.purging}, rosacea=${l.rosaceaFlare ? `yes(${l.rosaceaSeverity})` : "no"}, malar=${l.malarBumps}, tol=${l.tolerance}/10, feel=${l.skinFeel}/5, redLight=${l.redLightUsed ? `${l.redLightDuration}min` : "no"}${tags.length ? `, procedures: ${tags.join(",")}` : ""}${l.notes ? `, note: "${l.notes}"` : ""}`;
      }).join("\n");
      systemWithContext += `\n\n## RECENT LOG DATA (last ${recentLogs.slice(0,3).length} entries)\n${logSummary}`;
    }

    try {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-5",
        max_tokens: 1024,
        system: systemWithContext,
        messages: claudeMessages,
      });
      const assistantContent = response.content[0].type === "text" ? response.content[0].text : "";
      await storage.addMessage({ role: "assistant", content: assistantContent, createdAt: new Date().toISOString(), context });
      res.json({ message: assistantContent });
    } catch (err: any) {
      console.error("AI error:", err);
      res.status(500).json({ error: "AI unavailable" });
    }
  });

  app.delete("/api/chat/:context", async (req, res) => {
    await storage.clearMessages(req.params.context);
    res.json({ ok: true });
  });

  // Derm appointments
  app.get("/api/appointments", async (_req, res) => { try { res.json(await storage.getAllAppointments()); } catch (e: any) { res.status(500).json({ error: e.message }); } });
  app.post("/api/appointments", async (req, res) => {
    const parsed = insertDermAppointmentSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    try { res.json(await storage.createAppointment(parsed.data)); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.patch("/api/appointments/:id", async (req, res) => {
    try { res.json(await storage.updateAppointment(Number(req.params.id), req.body)); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.delete("/api/appointments/:id", async (req, res) => {
    try { await storage.deleteAppointment(Number(req.params.id)); res.json({ ok: true }); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // AI derm prep
  app.post("/api/appointments/:id/generate-prep", async (req, res) => {
    const appt = await storage.getAppointment(Number(req.params.id));
    if (!appt) return res.status(404).json({ error: "Not found" });
    const recentLogs = await storage.getRecentLogs(14);
    const logSummary = recentLogs.map(l =>
      `${l.date}: tret=${l.tretApplied ? l.tretMethod : "no"}, dry=${l.dryness}, red=${l.redness}, rosacea=${l.rosaceaFlare ? `yes(${l.rosaceaSeverity})` : "no"}, malar=${l.malarBumps}, tol=${l.tolerance}/10${l.notes ? `, note: "${l.notes}"` : ""}`
    ).join("\n");
    try {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-5",
        max_tokens: 800,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: `I have a derm appointment on ${appt.date} (${appt.type}). Based on my recent 14-day log data below, generate a focused list of questions and talking points to bring to my derm. Be specific to what the data shows.\n\nLog data:\n${logSummary || "No log data yet."}` }]
      });
      const prep = response.content[0].type === "text" ? response.content[0].text : "";
      await storage.updateAppointment(appt.id, { prepNotes: prep });
      res.json({ prepNotes: prep });
    } catch (err) {
      res.status(500).json({ error: "AI unavailable" });
    }
  });
}
