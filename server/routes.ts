import type { Express } from "express";
import type { Server } from "http";
import Anthropic from "@anthropic-ai/sdk";
import { storage } from "./storage";
import { insertDailyLogSchema, insertDermAppointmentSchema } from "@shared/schema";

const anthropic = new Anthropic();

// ── Betsy's full skincare context — baked into every AI chat ──────────────
const BETSY_SYSTEM_PROMPT = `You are Betsy's personal skincare AI coach. You know her history, routine, and goals completely. Never ask her to re-explain her baseline — you already know it. Be direct, warm, and concise. Use the facial zone vocabulary she and her derm use.

## WHO SHE IS
- Age 53, Vienna Virginia. Skin type: mild rosacea (primarily perioral redness), normal sensitivity, redness-prone but not ultra-reactive. Overall quite tolerant skin.
- Confirmed rosacea diagnosis: responds strongly to triple cream (azelaic acid + ivermectin + metronidazole). Main symptom is perioral redness.

## CURRENT ROUTINE (as of late March 2026)

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

**Cyspera (cysteamine):** Applied AM, 10-15 minutes as tolerated, rinsed off. Targets anterior malar and lateral malar brown spots/age spots. Eggy smell is normal (sulfur compound). Coordinate so NOT applied same morning right before tret night.

## ACTIVE TREATMENTS
- **Tretinoin 0.025%** — retinization ongoing, Week 1+ as of March 28 2026
- **Cyspera** — pigmentation treatment, anterior + lateral malar cheeks
- **Estriol prescription eye cream** — anti-aging, under-eye
- **Rosacea triple cream** — daily AM maintenance

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
- Flag anything concerning in her patterns (e.g. sustained severe redness, increasing malar bumps)
- Help her plan tret schedule changes, Cyspera timing, product swaps
- Be concise — she is detail-oriented and analytical, she doesn't need everything spelled out
- Never recommend she stop a derm-prescribed treatment without first asking her to check with her derm

## RESPONSE STYLE
- Direct and clinical-friendly
- Use zone vocabulary naturally
- Short paragraphs, use bullet points for multi-step guidance
- When you need more info, ask one focused question`;

// ── Routes ────────────────────────────────────────────────────────────────
export function registerRoutes(httpServer: Server, app: Express) {

  // Daily logs
  app.get("/api/logs", (_req, res) => res.json(storage.getAllLogs()));
  app.get("/api/logs/recent/:n", (req, res) => res.json(storage.getRecentLogs(Number(req.params.n) || 7)));
  app.get("/api/logs/:date", (req, res) => {
    const log = storage.getLogByDate(req.params.date);
    if (!log) return res.status(404).json({ error: "Not found" });
    res.json(log);
  });
  app.post("/api/logs", (req, res) => {
    const parsed = insertDailyLogSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    res.json(storage.upsertLog(parsed.data));
  });

  // Chat
  app.get("/api/chat/:context", (req, res) => {
    res.json(storage.getMessages(req.params.context, 100));
  });

  app.post("/api/chat/:context", async (req, res) => {
    const { message } = req.body;
    const context = req.params.context;
    if (!message?.trim()) return res.status(400).json({ error: "Message required" });

    const now = new Date().toISOString();

    // Save user message
    storage.addMessage({ role: "user", content: message, createdAt: now, context });

    // Build message history for Claude
    const history = storage.getMessages(context, 40);
    const claudeMessages = history.map(m => ({ role: m.role as "user" | "assistant", content: m.content }));

    // Add recent log context if available
    const recentLogs = storage.getRecentLogs(7);
    let systemWithContext = BETSY_SYSTEM_PROMPT;
    if (recentLogs.length > 0) {
      const logSummary = recentLogs.slice(0, 3).map(l => {
        const tags = JSON.parse(l.procedureTags || "[]");
        return `${l.date}: tret=${l.tretApplied ? l.tretMethod : "no"}, cyspera=${l.cysperaApplied}, dry=${l.dryness}, peel=${l.peeling}, red=${l.redness}, purge=${l.purging}, rosacea=${l.rosaceaFlare ? `yes(${l.rosaceaSeverity})` : "no"}, malar=${l.malarBumps}, tol=${l.tolerance}/10, feel=${l.skinFeel}/5${tags.length ? `, procedures: ${tags.join(",")}` : ""}${l.notes ? `, note: "${l.notes}"` : ""}`;
      }).join("\n");
      systemWithContext += `\n\n## RECENT LOG DATA (last ${recentLogs.slice(0,3).length} entries)\n${logSummary}`;
    }

    try {
      const response = await anthropic.messages.create({
        model: "claude_sonnet_4_6",
        max_tokens: 1024,
        system: systemWithContext,
        messages: claudeMessages,
      });

      const assistantContent = response.content[0].type === "text" ? response.content[0].text : "";
      storage.addMessage({ role: "assistant", content: assistantContent, createdAt: new Date().toISOString(), context });
      res.json({ message: assistantContent });
    } catch (err: any) {
      console.error("AI error:", err);
      res.status(500).json({ error: "AI unavailable" });
    }
  });

  app.delete("/api/chat/:context", (req, res) => {
    storage.clearMessages(req.params.context);
    res.json({ ok: true });
  });

  // Derm appointments
  app.get("/api/appointments", (_req, res) => res.json(storage.getAllAppointments()));
  app.post("/api/appointments", (req, res) => {
    const parsed = insertDermAppointmentSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    res.json(storage.createAppointment(parsed.data));
  });
  app.patch("/api/appointments/:id", (req, res) => {
    const id = Number(req.params.id);
    res.json(storage.updateAppointment(id, req.body));
  });
  app.delete("/api/appointments/:id", (req, res) => {
    storage.deleteAppointment(Number(req.params.id));
    res.json({ ok: true });
  });

  // AI-assisted derm prep: generate questions from recent logs
  app.post("/api/appointments/:id/generate-prep", async (req, res) => {
    const appt = storage.getAppointment(Number(req.params.id));
    if (!appt) return res.status(404).json({ error: "Not found" });
    const recentLogs = storage.getRecentLogs(14);
    const logSummary = recentLogs.map(l =>
      `${l.date}: tret=${l.tretApplied ? l.tretMethod : "no"}, dry=${l.dryness}, red=${l.redness}, rosacea=${l.rosaceaFlare ? `yes(${l.rosaceaSeverity})` : "no"}, malar=${l.malarBumps}, tol=${l.tolerance}/10${l.notes ? `, note: "${l.notes}"` : ""}`
    ).join("\n");

    try {
      const response = await anthropic.messages.create({
        model: "claude_sonnet_4_6",
        max_tokens: 800,
        system: BETSY_SYSTEM_PROMPT,
        messages: [{
          role: "user",
          content: `I have a derm appointment on ${appt.date} (${appt.type}). Based on my recent 14-day log data below, generate a focused list of questions and talking points to bring to my derm. Be specific to what the data shows.\n\nLog data:\n${logSummary || "No log data yet."}`
        }]
      });
      const prep = response.content[0].type === "text" ? response.content[0].text : "";
      storage.updateAppointment(appt.id, { prepNotes: prep });
      res.json({ prepNotes: prep });
    } catch (err) {
      res.status(500).json({ error: "AI unavailable" });
    }
  });
}
