import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import type { DailyLog } from "@shared/schema";
import { PROCEDURE_TAGS, TRET_METHODS } from "@shared/schema";
import { emptyFaceMap, type FaceMapData } from "@shared/facemap";
import { toISODate, formatDate, skinFeelEmoji, skinFeelLabel } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Layers } from "lucide-react";
import FaceMap from "@/components/FaceMap";
import { ZONE_ISSUES } from "@shared/facemap";

function SectionHeader({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-5 mb-2">{children}</h2>;
}

export default function LogDay() {
  const params = useParams<{ date?: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const dateParam = params.date || toISODate(new Date());
  const isToday = dateParam === toISODate(new Date());
  const isFuture = dateParam > toISODate(new Date());

  const { data: existingLog } = useQuery<DailyLog | null>({
    queryKey: ["/api/logs", dateParam],
    queryFn: async () => {
      const r = await fetch(`${apiRequest ? "" : ""}/api/logs/${dateParam}`);
      if (r.status === 404) return null;
      return r.json();
    },
  });

  // ── State ──────────────────────────────────────────────────────────────
  const [tretApplied, setTretApplied] = useState(false);
  const [tretMethod, setTretMethod] = useState<"sandwich"|"direct"|"skipped">("skipped");
  const [cysperaApplied, setCysperaApplied] = useState(false);
  const [cysperaDuration, setCysperaDuration] = useState(15);
  const [faceMap, setFaceMap] = useState<FaceMapData>(emptyFaceMap());
  const [skinFeel, setSkinFeel] = useState(3);
  const [amRoutineDone, setAmRoutineDone] = useState(false);
  const [redLightUsed, setRedLightUsed] = useState(false);
  const [redLightDuration, setRedLightDuration] = useState(10);
  const [procedureTags, setProcedureTags] = useState<string[]>([]);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!existingLog) return;
    setTretApplied(existingLog.tretApplied);
    setTretMethod((existingLog.tretMethod as any) || "skipped");
    setCysperaApplied(existingLog.cysperaApplied);
    setCysperaDuration(existingLog.cysperaDuration || 15);
    try { setFaceMap(JSON.parse((existingLog as any).faceMap || "{}")); } catch { setFaceMap({}); }
    setSkinFeel(existingLog.skinFeel);
    setAmRoutineDone(existingLog.amRoutineDone);
    setRedLightUsed(existingLog.redLightUsed ?? false);
    setRedLightDuration(existingLog.redLightDuration || 10);
    try { setProcedureTags(JSON.parse(existingLog.procedureTags || "[]")); } catch {}
    setNotes(existingLog.notes || "");
  }, [existingLog]);

  useEffect(() => {
    if (!tretApplied) setTretMethod("skipped");
    else if (tretMethod === "skipped") setTretMethod("sandwich");
  }, [tretApplied]);

  const mutation = useMutation({
    mutationFn: async () => {
      const r = await apiRequest("POST", "/api/logs", {
        date: dateParam,
        tretApplied,
        tretMethod: tretApplied ? tretMethod : "skipped",
        tretNight: 0,
        cysperaApplied,
        cysperaDuration: cysperaApplied ? cysperaDuration : 0,
        faceMap: JSON.stringify(faceMap),
        skinFeel,
        amRoutineDone,
        redLightUsed,
        redLightDuration: redLightUsed ? redLightDuration : 0,
        procedureTags: JSON.stringify(procedureTags),
        notes,
        // Legacy fields — derived from face map for chart compatibility
        dryness: Object.values(faceMap).some(z => z?.issues.includes("dryness")) ? 1 : 0,
        peeling: Object.values(faceMap).some(z => z?.issues.includes("peeling")) ? 1 : 0,
        redness: Object.values(faceMap).some(z => z?.issues.includes("redness")) ? 1 : 0,
        purging: Object.values(faceMap).some(z => z?.issues.includes("purging") || z?.issues.includes("blemish")) ? 1 : 0,
        rosaceaFlare: !!faceMap["perioral"]?.issues?.length,
        rosaceaSeverity: faceMap["perioral"]?.issues?.length ? 1 : 0,
        rosaceaZones: "[]",
        malarBumps: ["cheek_l","cheek_r"].filter(z => (faceMap as any)[z]?.issues?.length > 0).length,
        tolerance: 5,
      });
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/logs", dateParam] });
      toast({ title: "Saved", description: `Log for ${formatDate(dateParam)} saved.` });
      if (isToday) navigate("/");
      else navigate(`/log/${dateParam}`);
    },
    onError: () => toast({ title: "Error", description: "Could not save.", variant: "destructive" }),
  });

  const toggleTag = (t: string) => setProcedureTags(p => p.includes(t) ? p.filter(x => x !== t) : [...p, t]);
  const go = (d: number) => {
    const nd = new Date(dateParam + "T12:00:00");
    nd.setDate(nd.getDate() + d);
    const s = toISODate(nd);
    if (s <= toISODate(new Date())) navigate(`/log/${s}`);
  };

  if (isFuture) return <div className="text-center py-20 text-muted-foreground text-sm">Can't log a future date.</div>;

  // Count annotated zones for summary
  const annotatedZones = Object.entries(faceMap).filter(([, v]) => v && v.issues.length > 0);
  const allIssues = [...new Set(annotatedZones.flatMap(([, v]) => v!.issues))];

  return (
    <div className="max-w-lg mx-auto pb-4 space-y-0.5">
      {/* Date nav */}
      <div className="flex items-center justify-between py-2">
        <button onClick={() => go(-1)} className="p-2 rounded-lg hover:bg-muted text-muted-foreground"><ChevronLeft size={20} /></button>
        <div className="text-center">
          <h1 className="font-display text-lg">{formatDate(dateParam)}</h1>
          {isToday && <span className="text-xs text-primary font-medium">Today</span>}
          {existingLog && !isToday && <span className="text-xs text-muted-foreground">Previously logged · editing</span>}
        </div>
        <button onClick={() => go(1)} className={cn("p-2 rounded-lg transition-colors", dateParam >= toISODate(new Date()) ? "opacity-20 cursor-not-allowed" : "hover:bg-muted text-muted-foreground")} disabled={dateParam >= toISODate(new Date())}><ChevronRight size={20} /></button>
      </div>

      {/* AM Routine */}
      <SectionHeader>AM Routine</SectionHeader>
      <Card><CardContent className="pt-4 pb-4 flex items-center justify-between">
        <div><p className="font-medium text-sm">AM Routine Completed</p><p className="text-xs text-muted-foreground">Triple cream · Vit C · P-TIOX · TiZO3</p></div>
        <Switch checked={amRoutineDone} onCheckedChange={setAmRoutineDone} data-testid="switch-am" />
      </CardContent></Card>

      {/* Cyspera */}
      <SectionHeader>Cyspera</SectionHeader>
      <Card><CardContent className="pt-4 pb-4 space-y-3">
        <div className="flex items-center justify-between">
          <div><p className="font-medium text-sm">Applied Today</p><p className="text-xs text-muted-foreground">Anterior + lateral malar zones</p></div>
          <Switch checked={cysperaApplied} onCheckedChange={setCysperaApplied} data-testid="switch-cyspera" />
        </div>
        {cysperaApplied && (
          <div className="flex items-center gap-3">
            <p className="text-xs text-muted-foreground font-medium flex-1">Duration (minutes)</p>
            <input type="number" min={1} max={30} value={cysperaDuration}
              onChange={e => setCysperaDuration(Number(e.target.value) || 15)}
              className="w-16 text-center text-sm font-medium rounded-lg border border-input bg-background px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-ring"
              data-testid="input-cyspera-duration" />
          </div>
        )}
      </CardContent></Card>

      {/* Tretinoin */}
      <SectionHeader>Tretinoin</SectionHeader>
      <Card><CardContent className="pt-4 pb-4 space-y-3">
        <div className="flex items-center justify-between">
          <div><p className="font-medium text-sm">Applied Tonight</p><p className="text-xs text-muted-foreground">0.025% + 2% niacinamide</p></div>
          <Switch checked={tretApplied} onCheckedChange={setTretApplied} data-testid="switch-tret" />
        </div>
        {tretApplied && (
          <div className="grid grid-cols-2 gap-2">
            {TRET_METHODS.filter(m => m.value !== "skipped").map(({ value, label }) => (
              <button key={value} onClick={() => setTretMethod(value as any)}
                className={cn("flex items-center gap-2 py-2.5 px-3 rounded-lg border text-sm font-medium transition-all",
                  tretMethod === value ? "bg-primary/10 border-primary/40 text-primary" : "border-border text-muted-foreground hover:border-foreground/20 bg-card")}
                data-testid={`method-${value}`}>
                <Layers size={13} />{label}
              </button>
            ))}
          </div>
        )}
      </CardContent></Card>

      {/* Red Light Mask */}
      <SectionHeader>Red Light Mask</SectionHeader>
      <Card><CardContent className="pt-4 pb-4 space-y-3">
        <div className="flex items-center justify-between">
          <div><p className="font-medium text-sm">Used Today</p><p className="text-xs text-muted-foreground">Red light / near-infrared mask</p></div>
          <Switch checked={redLightUsed} onCheckedChange={setRedLightUsed} data-testid="switch-red-light" />
        </div>
        {redLightUsed && (
          <div className="flex items-center gap-3">
            <p className="text-xs text-muted-foreground font-medium flex-1">Duration (minutes)</p>
            <input type="number" min={1} max={60} value={redLightDuration}
              onChange={e => setRedLightDuration(Number(e.target.value) || 10)}
              className="w-16 text-center text-sm font-medium rounded-lg border border-input bg-background px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-ring"
              data-testid="input-red-light-duration" />
          </div>
        )}
      </CardContent></Card>

      {/* Face Map */}
      <SectionHeader>Skin Map</SectionHeader>
      <Card>
        <CardHeader className="pb-1 pt-4">
          <CardTitle className="text-sm font-semibold">Tap a zone to annotate</CardTitle>
          <CardDescription className="text-xs">
            Mirror image — left side of map = your left cheek. Tap any zone to mark redness, blemishes, peeling, etc.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2 pb-4">
          {/* Summary of annotated zones */}
          {annotatedZones.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {annotatedZones.map(([zoneId, ann]) => (
                <span key={zoneId} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border border-border bg-muted">
                  <span className="font-medium capitalize">{zoneId.replace(/_/g, " ")}</span>
                  <span className="text-muted-foreground">·</span>
                  {ann!.issues.map(i => {
                    const issue = ZONE_ISSUES.find(z => z.id === i);
                    return <span key={i}>{issue?.emoji}</span>;
                  })}
                </span>
              ))}
            </div>
          )}

          {/* Face map centered */}
          <div className="flex justify-center">
            <FaceMap value={faceMap} onChange={setFaceMap} />
          </div>

          {annotatedZones.length === 0 && (
            <p className="text-center text-xs text-muted-foreground mt-2">No issues marked — tap any zone to annotate</p>
          )}
        </CardContent>
      </Card>

      {/* Overall Skin Feel */}
      <SectionHeader>Overall Skin Feel</SectionHeader>
      <Card><CardContent className="pt-4 pb-4">
        <div className="grid grid-cols-5 gap-1.5">
          {[1,2,3,4,5].map(v => (
            <button key={v} onClick={() => setSkinFeel(v)}
              className={cn("flex flex-col items-center gap-1 py-2.5 rounded-lg border text-xs transition-all",
                skinFeel === v ? "bg-primary/10 border-primary/40 text-primary" : "border-border text-muted-foreground bg-card hover:border-foreground/20")}
              data-testid={`feel-${v}`}>
              <span className="text-xl">{skinFeelEmoji(v)}</span>
              <span className="leading-tight text-center">{skinFeelLabel(v)}</span>
            </button>
          ))}
        </div>
      </CardContent></Card>

      {/* Procedures */}
      <SectionHeader>Procedures &amp; Events</SectionHeader>
      <Card><CardContent className="pt-4 pb-4">
        <div className="flex flex-wrap gap-2">
          {PROCEDURE_TAGS.map(t => (
            <button key={t} onClick={() => toggleTag(t)}
              className={cn("px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                procedureTags.includes(t) ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground bg-card hover:border-foreground/20")}
              data-testid={`tag-${t}`}>{t}</button>
          ))}
        </div>
      </CardContent></Card>

      {/* Notes */}
      <SectionHeader>Notes</SectionHeader>
      <Card><CardContent className="pt-4 pb-4">
        <Textarea value={notes} onChange={e => setNotes(e.target.value)}
          placeholder="e.g. Sandwich with Atoderm tonight. Cyspera 15 min, no warmth. Good skin day overall."
          className="min-h-[72px] text-sm resize-none" data-testid="textarea-notes" />
      </CardContent></Card>

      <div className="pt-3">
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="w-full" size="lg" data-testid="button-save">
          {mutation.isPending ? "Saving..." : existingLog ? "Update Log" : "Save Log"}
        </Button>
      </div>
    </div>
  );
}
