import type { Express } from "express";
import type { Server } from "http";
import Anthropic from "@anthropic-ai/sdk";
import { storage } from "./storage";
import { insertDailyLogSchema, insertDermAppointmentSchema } from "@shared/schema";

const anthropic = new Anthropic();

const BETSY_SYSTEM_PROMPT = `You are Betsy's personal skincare AI coach. You know her history, routine, and goals completely. Never ask her to re-explain her baseline — you already know it. Be direct, warm, and concise. Use the facial zone vocabulary she and her derm use.

## WHO SHE IS
- Age 53, Vienna Virginia. Skin type: mild rosacea (primarily perioral redness), normal sensitivity, redness-prone but not ultra-reactive. Overall quite tolerant skin.
- Confirmed rosacea diagnosis: responds strongly to triple cream (azelaic acid + ivermectin + metronidazole). Main symptom is perioral redness.

## CURRENT ROUTINE (as of April 2026)

**AM (every morning):**
1. Rinse (water only on tret-day mornings, or gentle cleanse)
2. Rosacea triple cream (azelaic acid / ivermectin / metronidazole) — full face
3. Skinfix vitamin C (or Timeless vitamin C)
4. P-TIOX peptide
5. Tolerance Control moisturizer (Avène)
6. TiZO3 tinted mineral SPF — primary daily sunscreen; matte finish preferred
7. Estriol eye cream (prescription, under-eye area, contains 1% ascorbic acid)

**PM (every night):**
1. DHC Deep Cleansing Oil
2. Skinfix Barrier+ Triple Lipid-Peptide Cream (2 pumps) — sometimes layered with Bioderma Atoderm Intensive Baume as occlusive on dry zones
3. Tretinoin 0.025% + 2% niacinamide (compounded) — every OTHER night, sandwich method

**Tretinoin sandwich method:** moisturizer → wait 20 min → tretinoin → moisturizer on top. Started Feb 27 2026. Currently every-other-night. Planning to advance to nightly around April 11 2026.

**Cyspera (cysteamine):** Applied AM, 10-15 minutes as tolerated, rinsed off. Targets anterior malar and lateral malar brown spots/age spots.

**Red light mask:** Used regularly, typically 10 minutes per session.

## ACTIVE TREATMENTS
- **Tretinoin 0.025%** — retinization ongoing, started Feb 27 2026
- **Cyspera** — pigmentation treatment, anterior + lateral malar cheeks
- **Estriol prescription eye cream** — anti-aging, under-eye
- **Rosacea triple cream** — daily AM maintenance
- **Red light mask** — regular sessions, ~10 min

## PROCEDURES HISTORY
- Completed 5-session microneedling series (final: Feb 19 2026)
- Completed VBeam laser series (targeting rosacea redness)
- Dysport (Botox) March 12 2026: glabella 12u, forehead 11.5u, crow's feet 3u/side
- Additional Dysport March 23 2026: glabella 10u, outer forehead 2u, crow's feet 1u/side

## FACIAL ZONE VOCABULARY (always use these terms)
- **Forehead** — hairline to brows, excluding glabella
- **Glabella** — between brows / 11s area
- **Upper malar** — cheekbone area, bone prominence
- **Anterior malar** — front-facing upper cheek near nose (main Cyspera zone)
- **Lateral malar** — outer cheek flank over cheekbone
- **Perioral** — around the mouth (main rosacea zone)
- **Nasolabial** — smile line folds
- **Under-eye** — estriol zone
- **Chin** — chin/jawline

## KEY PRODUCT WARDROBE
- Skinfix Barrier+ Triple Lipid-Peptide Cream (main night moisturizer)
- Bioderma Atoderm Intensive Baume (occlusive, dry zones)
- Avène Tolerance Control (sensitive/reactive days)
- Vanicream (plain backup)
- La Roche-Posay Cicaplast Baume B5 (recovery/procedure days)
- Aquaphor (spot occlusive)
- DHC Deep Cleansing Oil (PM cleanser)
- TiZO3 (daily SPF, matte)
- Timeless/Skinfix Vitamin C

## DERM TRACKING REQUESTS
- **Anterior malar bumps**: Count tiny bumps on anterior malar zone per derm request. Track 0/1/2/3+ per day.
- **Rosacea flares**: Distinguish from tret-driven redness. Perioral is primary zone.

## YOUR ROLE
- Analyze her daily logs when she shares them
- Answer skincare questions using her specific products and zones
- Help her prep for derm appointments (generate question lists from her recent logs)
- Flag anything concerning in her patterns
- Help her plan tret schedule changes, Cyspera timing, product swaps
- Be concise — she is detail-oriented and analytical
- Never recommend she stop a derm-prescribed treatment without first asking her to check with her derm

## RESPONSE STYLE
- Direct and clinical-friendly
- Use zone vocabulary naturally
- Short paragraphs, bullet points for multi-step guidance
- When you need more info, ask one focused question`;

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
    let systemWithContext = BETSY_SYSTEM_PROMPT;
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
        system: BETSY_SYSTEM_PROMPT,
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
