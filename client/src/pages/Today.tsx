import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { DailyLog, DermAppointment } from "@shared/schema";
import { toISODate, formatDate, daysBetween, skinFeelEmoji, skinFeelLabel } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Plus, CheckCircle2, CalendarDays, MessageCircle, Stethoscope, Zap, AlertTriangle, TrendingUp } from "lucide-react";
import { useState } from "react";
import FaceMap from "@/components/FaceMap";
import { ZONE_ISSUES, emptyFaceMap, hasAnnotations, type FaceMapData } from "@shared/facemap";

const TRET_START = "2026-02-27";
const TRET_WEEKS = 12;

export default function Today() {
  const today = toISODate(new Date());
  const [wakeStatus, setWakeStatus] = useState<"idle"|"waking"|"ready"|"error">("idle");

  const wakeServer = async () => {
    setWakeStatus("waking");
    try {
      const res = await fetch("https://skincare-companion.onrender.com/api/ping");
      if (res.ok) setWakeStatus("ready");
      else setWakeStatus("error");
    } catch { setWakeStatus("error"); }
    setTimeout(() => setWakeStatus("idle"), 10000);
  };

  const { data: todayLog } = useQuery<DailyLog | null>({
    queryKey: ["/api/logs", today],
    queryFn: async () => { const r = await fetch(`/api/logs/${today}`); if (r.status === 404) return null; return r.json(); },
  });
  const { data: recentLogs = [] } = useQuery<DailyLog[]>({ queryKey: ["/api/logs/recent/7"] });
  const { data: appointments = [] } = useQuery<DermAppointment[]>({ queryKey: ["/api/appointments"] });

  const start = new Date(TRET_START + "T12:00:00");
  const now = new Date();
  const dayNum = Math.max(1, Math.min(TRET_WEEKS * 7, daysBetween(start, now) + 1));
  const weekNum = Math.min(TRET_WEEKS, Math.ceil(dayNum / 7));
  const pct = Math.round((dayNum / (TRET_WEEKS * 7)) * 100);

  const nextAppt = appointments.filter(a => a.status === "upcoming" && a.date >= today).sort((a, b) => a.date.localeCompare(b.date))[0];

  // Parse face map from today's log
  let todayFaceMap: FaceMapData = emptyFaceMap();
  if (todayLog) {
    try { todayFaceMap = JSON.parse((todayLog as any).faceMap || "{}"); } catch {}
  }

  // Recent issue summary (last 7 days)
  const recentIssues = new Map<string, number>();
  recentLogs.forEach(log => {
    try {
      const map: FaceMapData = JSON.parse((log as any).faceMap || "{}");
      Object.values(map).forEach(ann => ann?.issues.forEach(i => recentIssues.set(i, (recentIssues.get(i) || 0) + 1)));
    } catch {}
  });

  const hasAlert = recentLogs.some(l => {
    try {
      const map: FaceMapData = JSON.parse((l as any).faceMap || "{}");
      return Object.values(map).some(ann => ann && ann.issues.length >= 3);
    } catch { return false; }
  });

  return (
    <div className="space-y-4 pb-4">
      {/* Greeting */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-xl text-foreground">
            Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
        </div>
        <Link href={`/log/${today}`}>
          <Button size="sm" className="gap-1.5" data-testid="button-log-today">
            <Plus size={14} /> Log Today
          </Button>
        </Link>
      </div>

      {/* Wake-up button */}
      <button onClick={wakeServer} disabled={wakeStatus === "waking" || wakeStatus === "ready"}
        className={cn("w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-all",
          wakeStatus === "ready" ? "bg-green-50 dark:bg-green-900/20 border-green-300 text-green-700 dark:text-green-400" :
          wakeStatus === "waking" ? "bg-muted border-border text-muted-foreground cursor-wait" :
          wakeStatus === "error" ? "bg-red-50 dark:bg-red-900/20 border-red-300 text-red-600" :
          "bg-card border-border text-muted-foreground hover:border-primary/40 hover:text-primary")}
        data-testid="button-wake">
        <Zap size={14} className={wakeStatus === "waking" ? "animate-pulse" : ""} />
        {wakeStatus === "idle" && "Wake up server before logging"}
        {wakeStatus === "waking" && "Waking server…"}
        {wakeStatus === "ready" && "Server ready — go ahead and log!"}
        {wakeStatus === "error" && "Could not reach server — try again"}
      </button>

      {/* Alert */}
      {hasAlert && (
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-400 text-sm">
          <AlertTriangle size={15} className="shrink-0" />
          <span>Multiple issues in a zone recently — worth noting for your derm.</span>
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
            <span>Feb 27</span><span>{pct}% complete</span><span>Week 12</span>
          </div>
        </CardContent>
      </Card>

      {/* Today's log */}
      <div>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Today's Log</h2>
        {todayLog ? (
          <Card className="border-primary/25 bg-primary/5">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start gap-3">
                {/* Face map thumbnail */}
                <div className="shrink-0">
                  <FaceMap value={todayFaceMap} onChange={() => {}} readOnly compact />
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <CheckCircle2 size={14} className="text-primary shrink-0" />
                    <span className="text-sm font-medium">{skinFeelEmoji(todayLog.skinFeel)} {skinFeelLabel(todayLog.skinFeel)}</span>
                    {todayLog.tretApplied && <Badge variant="outline" className="text-xs border-primary/40 text-primary">{todayLog.tretMethod}</Badge>}
                    {todayLog.cysperaApplied && <Badge variant="outline" className="text-xs border-purple-300 text-purple-600 dark:text-purple-400">Cyspera {todayLog.cysperaDuration}min</Badge>}
                    {todayLog.redLightUsed && <Badge variant="outline" className="text-xs border-orange-300 text-orange-600">LED {todayLog.redLightDuration}min</Badge>}
                  </div>

                  {/* Annotated zones summary */}
                  {hasAnnotations(todayFaceMap) ? (
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(todayFaceMap)
                        .filter(([, v]) => v && v.issues.length > 0)
                        .map(([zone, ann]) => (
                          <span key={zone} className="text-xs bg-background border border-border rounded-full px-2 py-0.5 flex items-center gap-1">
                            <span className="capitalize text-muted-foreground">{zone.replace(/_/g, " ")}</span>
                            {ann!.issues.map(i => <span key={i}>{ZONE_ISSUES.find(z => z.id === i)?.emoji}</span>)}
                          </span>
                        ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No issues marked today</p>
                  )}

                  {todayLog.notes && <p className="text-xs text-muted-foreground italic">{todayLog.notes}</p>}
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <Link href={`/log/${today}`}><Button size="sm" variant="outline" className="text-xs h-7">Edit</Button></Link>
                <Link href="/chat"><Button size="sm" variant="ghost" className="text-xs h-7 gap-1.5 text-primary"><MessageCircle size={12} /> Discuss with AI</Button></Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-dashed">
            <CardContent className="pt-5 pb-5 flex flex-col items-center gap-2 text-center">
              <p className="text-muted-foreground text-sm">No log yet today.</p>
              <Link href={`/log/${today}`}><Button variant="outline" size="sm" data-testid="button-log-now"><Plus size={13} className="mr-1" />Log now</Button></Link>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 7-day issue summary */}
      {recentIssues.size > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">7-Day Issues</h2>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex flex-wrap gap-2">
                {[...recentIssues.entries()].sort((a, b) => b[1] - a[1]).map(([issueId, count]) => {
                  const issue = ZONE_ISSUES.find(i => i.id === issueId);
                  if (!issue) return null;
                  return (
                    <div key={issueId} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-card text-xs">
                      <span>{issue.emoji}</span>
                      <span className="font-medium">{issue.label}</span>
                      <span className="text-muted-foreground">×{count}</span>
                    </div>
                  );
                })}
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
            <CardContent className="pt-4 pb-4 flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm">{nextAppt.type}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{formatDate(nextAppt.date, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</p>
              </div>
              <Link href="/derm"><Button size="sm" variant="outline" className="text-xs">Prep →</Button></Link>
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
              <div><p className="text-sm font-medium">AI Coach</p><p className="text-xs text-muted-foreground">Ask a question</p></div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/progress">
          <Card className="cursor-pointer hover:border-primary/40 transition-colors">
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <TrendingUp size={18} className="text-secondary shrink-0" />
              <div><p className="text-sm font-medium">Progress</p><p className="text-xs text-muted-foreground">Charts &amp; trends</p></div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
