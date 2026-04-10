import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { DailyLog, DermAppointment } from "@shared/schema";
import { toISODate, formatDate, daysBetween, SYMPTOM_COLORS, LEVEL_LABELS, skinFeelEmoji, skinFeelLabel } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Plus, CheckCircle2, CalendarDays, MessageCircle, AlertTriangle, Stethoscope, Zap } from "lucide-react";
import { useState } from "react";

// Tretinoin start date
const TRET_START = "2026-02-27";
const TRET_WEEKS = 12;

function SymptomPip({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="text-center">
      <div className="text-xs text-muted-foreground mb-0.5">{label}</div>
      <div className="text-sm font-medium" style={{ color: value > 0 ? color : undefined }}>
        {LEVEL_LABELS[value]}
      </div>
      <div className="mt-1 h-1 rounded-full bg-muted overflow-hidden w-full">
        <div className="h-full rounded-full" style={{ width: `${(value / 3) * 100}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

export default function Today() {
  const today = toISODate(new Date());
  const [wakeStatus, setWakeStatus] = useState<"idle" | "waking" | "ready" | "error">("idle");

  const wakeServer = async () => {
    setWakeStatus("waking");
    try {
      const res = await fetch("https://skincare-companion.onrender.com/api/ping");
      if (res.ok) setWakeStatus("ready");
      else setWakeStatus("error");
    } catch {
      setWakeStatus("error");
    }
    // Reset to idle after 10 seconds
    setTimeout(() => setWakeStatus("idle"), 10000);
  };
  const { data: todayLog } = useQuery<DailyLog | null>({
    queryKey: ["/api/logs", today],
    queryFn: async () => {
      const res = await fetch(`/api/logs/${today}`);
      if (res.status === 404) return null;
      return res.json();
    },
  });
  const { data: recentLogs = [] } = useQuery<DailyLog[]>({ queryKey: ["/api/logs/recent/7"] });
  const { data: appointments = [] } = useQuery<DermAppointment[]>({ queryKey: ["/api/appointments"] });

  const start = new Date(TRET_START + "T12:00:00");
  const now = new Date();
  const dayNum = Math.max(1, Math.min(TRET_WEEKS * 7, daysBetween(start, now) + 1));
  const weekNum = Math.min(TRET_WEEKS, Math.ceil(dayNum / 7));
  const pct = Math.round((dayNum / (TRET_WEEKS * 7)) * 100);

  const nextAppt = appointments.filter(a => a.status === "upcoming" && a.date >= today).sort((a, b) => a.date.localeCompare(b.date))[0];

  // Compute 7-day trend
  const avg = (key: keyof DailyLog) =>
    recentLogs.length === 0 ? 0 : Math.round(recentLogs.reduce((s, l) => s + Number(l[key] ?? 0), 0) / recentLogs.length);

  const avgTol = avg("tolerance");

  // Flag if any recent symptom is severe
  const hasAlert = recentLogs.some(l => l.dryness === 3 || l.redness === 3 || l.peeling === 3);

  return (
    <div className="space-y-5 pb-4">
      {/* Greeting */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-xl text-foreground">Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
        </div>
        <Link href={`/log/${today}`}>
          <Button size="sm" className="gap-1.5" data-testid="button-log-today">
            <Plus size={14} /> Log Today
          </Button>
        </Link>
      </div>

      {/* Wake-up button */}
      <button
        onClick={wakeServer}
        disabled={wakeStatus === "waking" || wakeStatus === "ready"}
        className={cn(
          "w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-all",
          wakeStatus === "ready" ? "bg-green-50 dark:bg-green-900/20 border-green-300 text-green-700 dark:text-green-400" :
          wakeStatus === "waking" ? "bg-muted border-border text-muted-foreground cursor-wait" :
          wakeStatus === "error" ? "bg-red-50 dark:bg-red-900/20 border-red-300 text-red-600" :
          "bg-card border-border text-muted-foreground hover:border-primary/40 hover:text-primary"
        )}
        data-testid="button-wake"
      >
        <Zap size={14} className={wakeStatus === "waking" ? "animate-pulse" : ""} />
        {wakeStatus === "idle" && "Wake up server before logging"}
        {wakeStatus === "waking" && "Waking server…"}
        {wakeStatus === "ready" && "Server ready — go ahead and log!"}
        {wakeStatus === "error" && "Could not reach server — try again"}
      </button>

      {/* Alert banner */}
      {hasAlert && (
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-400 text-sm">
          <AlertTriangle size={15} className="shrink-0" />
          <span>Severe symptoms in recent days — worth mentioning to your derm or chatting with your AI coach.</span>
        </div>
      )}

      {/* Tretinoin progress */}
      <Card>
        <CardContent className="pt-4 pb-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarDays size={15} className="text-primary" />
              <span className="font-semibold text-sm">Tretinoin — Week {weekNum} of {TRET_WEEKS}</span>
            </div>
            <Badge variant="secondary" className="text-xs">Day {dayNum} · 0.025%</Badge>
          </div>
          <Progress value={pct} className="h-1.5" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Feb 27</span>
            <span>{pct}% complete</span>
            <span>Week 12</span>
          </div>
        </CardContent>
      </Card>

      {/* Today's log */}
      <div>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Today's Log</h2>
        {todayLog ? (
          <Card className="border-primary/25 bg-primary/5">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 size={15} className="text-primary" />
                <span className="text-sm font-medium text-foreground">Logged · {skinFeelEmoji(todayLog.skinFeel)} {skinFeelLabel(todayLog.skinFeel)}</span>
                {todayLog.tretApplied && <Badge variant="outline" className="ml-auto text-xs border-primary/40 text-primary">Tret {todayLog.tretMethod}</Badge>}
                {todayLog.cysperaApplied && <Badge variant="outline" className="text-xs border-purple-300 text-purple-600 dark:text-purple-400">Cyspera</Badge>}
              </div>
              <div className="grid grid-cols-4 gap-3">
                <SymptomPip label="Dryness" value={todayLog.dryness} color={SYMPTOM_COLORS.dryness} />
                <SymptomPip label="Peeling" value={todayLog.peeling} color={SYMPTOM_COLORS.peeling} />
                <SymptomPip label="Redness" value={todayLog.redness} color={SYMPTOM_COLORS.redness} />
                <SymptomPip label="Purging" value={todayLog.purging} color={SYMPTOM_COLORS.purging} />
              </div>
              {todayLog.rosaceaFlare && (
                <div className="mt-2.5 flex items-center gap-2 text-xs text-rose-600 dark:text-rose-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  Rosacea flare · {LEVEL_LABELS[todayLog.rosaceaSeverity]}
                  {todayLog.malarBumps > 0 && <span className="ml-2 text-amber-600 dark:text-amber-400">· {todayLog.malarBumps} malar bump{todayLog.malarBumps !== 1 ? "s" : ""}</span>}
                </div>
              )}
              {!todayLog.rosaceaFlare && todayLog.malarBumps > 0 && (
                <div className="mt-2 text-xs text-amber-600 dark:text-amber-400">{todayLog.malarBumps} malar bump{todayLog.malarBumps !== 1 ? "s" : ""}</div>
              )}
              {todayLog.notes && <p className="mt-2.5 text-xs text-muted-foreground italic border-t border-border pt-2">{todayLog.notes}</p>}
              <div className="mt-3 flex gap-2">
                <Link href={`/log/${today}`}>
                  <Button size="sm" variant="outline" className="text-xs h-7">Edit</Button>
                </Link>
                <Link href="/chat">
                  <Button size="sm" variant="ghost" className="text-xs h-7 gap-1.5 text-primary">
                    <MessageCircle size={12} /> Discuss with AI
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-dashed">
            <CardContent className="pt-5 pb-5 flex flex-col items-center gap-2 text-center">
              <p className="text-muted-foreground text-sm">No log yet today.</p>
              <Link href={`/log/${today}`}>
                <Button variant="outline" size="sm" data-testid="button-log-now"><Plus size={13} className="mr-1" />Log now</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 7-day snapshot */}
      {recentLogs.length > 1 && (
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">7-Day Snapshot</h2>
          <Card>
            <CardContent className="pt-4 pb-4 space-y-3">
              <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                {(["dryness", "peeling", "redness", "purging"] as const).map(key => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground capitalize">{key}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${(avg(key) / 3) * 100}%`, backgroundColor: SYMPTOM_COLORS[key] }} />
                      </div>
                      <span className="text-xs font-medium w-8 text-right" style={{ color: avg(key) > 0 ? SYMPTOM_COLORS[key] : undefined }}>
                        {LEVEL_LABELS[avg(key)]}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-border">
                <span className="text-xs text-muted-foreground">Tolerance avg</span>
                <span className="text-sm font-semibold" style={{ color: SYMPTOM_COLORS.tolerance }}>{avgTol}/10</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Next derm appointment */}
      {nextAppt && (
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Next Appointment</h2>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm">{nextAppt.type}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{formatDate(nextAppt.date, { weekday: "long", month: "long", day: "numeric" })}</p>
                </div>
                <Link href="/derm">
                  <Button size="sm" variant="outline" className="text-xs">Prep →</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/chat">
          <Card className="cursor-pointer hover:border-primary/40 transition-colors">
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <MessageCircle size={18} className="text-primary shrink-0" />
              <div>
                <p className="text-sm font-medium">AI Coach</p>
                <p className="text-xs text-muted-foreground">Ask a question</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/derm">
          <Card className="cursor-pointer hover:border-primary/40 transition-colors">
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <Stethoscope size={18} className="text-secondary shrink-0" />
              <div>
                <p className="text-sm font-medium">Derm Prep</p>
                <p className="text-xs text-muted-foreground">Appointments</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
