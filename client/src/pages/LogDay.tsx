import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import type { DailyLog } from "@shared/schema";
import { PROCEDURE_TAGS, TRET_METHODS, FACE_ZONES } from "@shared/schema";
import { toISODate, formatDate, LEVEL_LABELS, LEVEL_COLORS, SYMPTOM_COLORS, skinFeelEmoji, skinFeelLabel, cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Droplets, Zap, Flame, AlertCircle, Layers } from "lucide-react";

function SectionHeader({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-5 mb-2">{children}</h2>;
}

function SymptomPicker({ label, icon: Icon, colorKey, value, onChange }: { label: string; icon: any; colorKey: string; value: number; onChange: (v: number) => void }) {
  const color = SYMPTOM_COLORS[colorKey];
  return (
    <Card>
      <CardContent className="pt-3.5 pb-3.5">
        <div className="flex items-center gap-2.5 mb-2.5">
          <div className="p-1.5 rounded-md" style={{ backgroundColor: color + "20" }}>
            <Icon size={15} style={{ color }} />
          </div>
          <span className="font-medium text-sm flex-1">{label}</span>
          <Badge variant="outline" className={cn("text-xs border", LEVEL_COLORS[value])}>{LEVEL_LABELS[value]}</Badge>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {LEVEL_LABELS.map((lbl, idx) => (
            <button key={idx} onClick={() => onChange(idx)}
              className={cn("py-1.5 text-xs font-medium rounded-lg border transition-all", value === idx ? cn(LEVEL_COLORS[idx], "ring-1 ring-offset-1 ring-muted-foreground/20") : "border-border text-muted-foreground hover:border-foreground/20 bg-card")}
              data-testid={`symptom-${colorKey}-${idx}`}>
              {lbl}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
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
    queryFn: async () => { const r = await fetch(`/api/logs/${dateParam}`); if (r.status === 404) return null; return r.json(); },
  });

  const [tretApplied, setTretApplied] = useState(false);
  const [tretMethod, setTretMethod] = useState<"sandwich"|"direct"|"skipped">("skipped");
  const [cysperaApplied, setCysperaApplied] = useState(false);
  const [cysperaDuration, setCysperaDuration] = useState(10);
  const [dryness, setDryness] = useState(0);
  const [peeling, setPeeling] = useState(0);
  const [redness, setRedness] = useState(0);
  const [purging, setPurging] = useState(0);
  const [rosaceaFlare, setRosaceaFlare] = useState(false);
  const [rosaceaSeverity, setRosaceaSeverity] = useState(0);
  const [rosaceaZones, setRosaceaZones] = useState<string[]>([]);
  const [malarBumps, setMalarBumps] = useState(0);
  const [tolerance, setTolerance] = useState(5);
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
    setCysperaDuration(existingLog.cysperaDuration || 10);
    setDryness(existingLog.dryness); setPeeling(existingLog.peeling);
    setRedness(existingLog.redness); setPurging(existingLog.purging);
    setRosaceaFlare(existingLog.rosaceaFlare);
    setRosaceaSeverity(existingLog.rosaceaSeverity ?? 0);
    try { setRosaceaZones(JSON.parse(existingLog.rosaceaZones || "[]")); } catch {}
    setMalarBumps(existingLog.malarBumps ?? 0);
    setTolerance(existingLog.tolerance); setSkinFeel(existingLog.skinFeel);
    setAmRoutineDone(existingLog.amRoutineDone);
    setRedLightUsed(existingLog.redLightUsed ?? false);
    setRedLightDuration(existingLog.redLightDuration || 10);
    try { setProcedureTags(JSON.parse(existingLog.procedureTags || "[]")); } catch {}
    setNotes(existingLog.notes || "");
  }, [existingLog]);

  useEffect(() => { if (!tretApplied) setTretMethod("skipped"); else if (tretMethod === "skipped") setTretMethod("sandwich"); }, [tretApplied]);

  const mutation = useMutation({
    mutationFn: async () => {
      const r = await apiRequest("POST", "/api/logs", {
        date: dateParam, tretApplied, tretMethod: tretApplied ? tretMethod : "skipped",
        tretNight: 0, cysperaApplied, cysperaDuration: cysperaApplied ? cysperaDuration : 0,
        dryness, peeling, redness, purging, rosaceaFlare,
        rosaceaSeverity: rosaceaFlare ? rosaceaSeverity : 0,
        rosaceaZones: JSON.stringify(rosaceaFlare ? rosaceaZones : []),
        malarBumps, tolerance, skinFeel, amRoutineDone,
        redLightUsed, redLightDuration: redLightUsed ? redLightDuration : 0,
        procedureTags: JSON.stringify(procedureTags), notes,
      });
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/logs", dateParam] });
      toast({ title: "Saved", description: `Log for ${formatDate(dateParam)} saved.` });
      navigate("/");
    },
    onError: () => toast({ title: "Error", description: "Could not save.", variant: "destructive" }),
  });

  const toggleZone = (z: string) => setRosaceaZones(p => p.includes(z) ? p.filter(x => x !== z) : [...p, z]);
  const toggleTag = (t: string) => setProcedureTags(p => p.includes(t) ? p.filter(x => x !== t) : [...p, t]);

  const go = (d: number) => { const nd = new Date(dateParam + "T12:00:00"); nd.setDate(nd.getDate() + d); const s = toISODate(nd); if (s <= toISODate(new Date())) navigate(`/log/${s}`); };

  if (isFuture) return <div className="text-center py-20 text-muted-foreground">Can't log a future date.</div>;

  return (
    <div className="max-w-lg mx-auto pb-4 space-y-0.5">
      {/* Date nav */}
      <div className="flex items-center justify-between py-2">
        <button onClick={() => go(-1)} className="p-2 rounded-lg hover:bg-muted text-muted-foreground"><ChevronLeft size={20} /></button>
        <div className="text-center">
          <h1 className="font-display text-lg">{formatDate(dateParam)}</h1>
          {isToday && <span className="text-xs text-primary font-medium">Today</span>}
        </div>
        <button onClick={() => go(1)} className={cn("p-2 rounded-lg transition-colors", dateParam >= toISODate(new Date()) ? "opacity-20 cursor-not-allowed" : "hover:bg-muted text-muted-foreground")} disabled={dateParam >= toISODate(new Date())}><ChevronRight size={20} /></button>
      </div>

      <SectionHeader>AM Routine</SectionHeader>
      <Card><CardContent className="pt-4 pb-4 flex items-center justify-between">
        <div><p className="font-medium text-sm">AM Routine Completed</p><p className="text-xs text-muted-foreground">Triple cream · Vit C · P-TIOX · TiZO3</p></div>
        <Switch checked={amRoutineDone} onCheckedChange={setAmRoutineDone} data-testid="switch-am" />
      </CardContent></Card>

      <SectionHeader>Cyspera</SectionHeader>
      <Card><CardContent className="pt-4 pb-4 space-y-3">
        <div className="flex items-center justify-between">
          <div><p className="font-medium text-sm">Applied Today</p><p className="text-xs text-muted-foreground">Anterior + lateral malar zones</p></div>
          <Switch checked={cysperaApplied} onCheckedChange={setCysperaApplied} data-testid="switch-cyspera" />
        </div>
        {cysperaApplied && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs text-muted-foreground font-medium">Duration</p>
              <span className="text-sm font-medium">{cysperaDuration} min</span>
            </div>
            <Slider value={[cysperaDuration]} onValueChange={([v]) => setCysperaDuration(v)} min={5} max={20} step={1} />
            <div className="flex justify-between text-xs text-muted-foreground mt-1"><span>5 min</span><span>20 min</span></div>
          </div>
        )}
      </CardContent></Card>

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

      <SectionHeader>Retinization Symptoms</SectionHeader>
      <div className="space-y-2">
        <SymptomPicker label="Dryness" icon={Droplets} colorKey="dryness" value={dryness} onChange={setDryness} />
        <SymptomPicker label="Peeling" icon={Zap} colorKey="peeling" value={peeling} onChange={setPeeling} />
        <SymptomPicker label="Redness" icon={Flame} colorKey="redness" value={redness} onChange={setRedness} />
        <SymptomPicker label="Purging" icon={AlertCircle} colorKey="purging" value={purging} onChange={setPurging} />
      </div>

      <SectionHeader>Rosacea</SectionHeader>
      <Card><CardContent className="pt-4 pb-4 space-y-3">
        <div className="flex items-center justify-between">
          <div><p className="font-medium text-sm">Rosacea Flare</p><p className="text-xs text-muted-foreground">Perioral or facial flare today</p></div>
          <Switch checked={rosaceaFlare} onCheckedChange={setRosaceaFlare} data-testid="switch-rosacea" />
        </div>
        {rosaceaFlare && <>
          <div>
            <p className="text-xs text-muted-foreground font-medium mb-1.5">Severity</p>
            <div className="grid grid-cols-4 gap-1.5">
              {LEVEL_LABELS.map((l, i) => (
                <button key={i} onClick={() => setRosaceaSeverity(i)} className={cn("py-1.5 text-xs font-medium rounded-lg border transition-all", rosaceaSeverity === i ? cn(LEVEL_COLORS[i], "ring-1 ring-offset-1") : "border-border text-muted-foreground bg-card")}>{l}</button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium mb-1.5">Zones affected</p>
            <div className="flex flex-wrap gap-1.5">
              {FACE_ZONES.map(z => (
                <button key={z} onClick={() => toggleZone(z)} className={cn("px-2.5 py-1 rounded-full text-xs border transition-all", rosaceaZones.includes(z) ? "bg-rose-100 dark:bg-rose-900/30 border-rose-300 text-rose-700 dark:text-rose-400" : "border-border text-muted-foreground bg-card hover:border-foreground/20")}>{z}</button>
              ))}
            </div>
          </div>
        </>}
      </CardContent></Card>

      <SectionHeader>Anterior Malar Bumps</SectionHeader>
      <Card><CardContent className="pt-4 pb-4">
        <p className="text-xs text-muted-foreground mb-2.5">Tiny bumps on anterior malar zone (derm tracking)</p>
        <div className="grid grid-cols-4 gap-2">
          {[{v:0,l:"None",s:"0"},{v:1,l:"1 bump",s:"1"},{v:2,l:"2 bumps",s:"2"},{v:3,l:"3+",s:"3+"}].map(({v,l,s}) => (
            <button key={v} onClick={() => setMalarBumps(v)} className={cn("flex flex-col items-center gap-0.5 py-2.5 rounded-lg border text-xs font-medium transition-all",
              malarBumps === v ? (v===0?"bg-green-50 dark:bg-green-900/20 border-green-300 text-green-700 dark:text-green-400":v===3?"bg-red-50 dark:bg-red-900/20 border-red-300 text-red-700":"bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 text-yellow-700") : "border-border text-muted-foreground bg-card")}
              data-testid={`malar-${v}`}>
              <span className="text-base font-display">{s}</span>
              <span className="text-center leading-tight">{l}</span>
            </button>
          ))}
        </div>
      </CardContent></Card>

      <SectionHeader>Tolerance &amp; Skin Feel</SectionHeader>
      <Card><CardContent className="pt-4 pb-4 space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="font-medium text-sm">Tolerance</p>
            <span className="text-lg font-display" style={{ color: SYMPTOM_COLORS.tolerance }}>{tolerance}<span className="text-xs text-muted-foreground">/10</span></span>
          </div>
          <Slider value={[tolerance]} onValueChange={([v]) => setTolerance(v)} min={1} max={10} step={1} />
          <div className="flex justify-between text-xs text-muted-foreground mt-1"><span>Very sensitive</span><span>Fully tolerant</span></div>
        </div>
        <div>
          <p className="font-medium text-sm mb-2">Overall Skin Feel</p>
          <div className="grid grid-cols-5 gap-1.5">
            {[1,2,3,4,5].map(v => (
              <button key={v} onClick={() => setSkinFeel(v)} className={cn("flex flex-col items-center gap-1 py-2 rounded-lg border text-xs transition-all", skinFeel===v?"bg-primary/10 border-primary/40 text-primary":"border-border text-muted-foreground bg-card hover:border-foreground/20")} data-testid={`feel-${v}`}>
                <span className="text-lg">{skinFeelEmoji(v)}</span>
                <span className="leading-tight text-center">{skinFeelLabel(v)}</span>
              </button>
            ))}
          </div>
        </div>
      </CardContent></Card>

      <SectionHeader>Red Light Mask</SectionHeader>
      <Card><CardContent className="pt-4 pb-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-sm">Used Today</p>
            <p className="text-xs text-muted-foreground">Red light / near-infrared mask session</p>
          </div>
          <Switch checked={redLightUsed} onCheckedChange={setRedLightUsed} data-testid="switch-red-light" />
        </div>
        {redLightUsed && (
          <div className="flex items-center gap-3">
            <p className="text-xs text-muted-foreground font-medium flex-1">Duration (minutes)</p>
            <input
              type="number"
              min={1}
              max={60}
              value={redLightDuration}
              onChange={e => setRedLightDuration(Number(e.target.value) || 10)}
              className="w-16 text-center text-sm font-medium rounded-lg border border-input bg-background px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-ring"
              data-testid="input-red-light-duration"
            />
          </div>
        )}
      </CardContent></Card>

      <SectionHeader>Procedures &amp; Events</SectionHeader>
      <Card><CardContent className="pt-4 pb-4">
        <div className="flex flex-wrap gap-2">
          {PROCEDURE_TAGS.map(t => (
            <button key={t} onClick={() => toggleTag(t)} className={cn("px-3 py-1.5 rounded-full text-xs font-medium border transition-all", procedureTags.includes(t)?"bg-primary text-primary-foreground border-primary":"border-border text-muted-foreground bg-card hover:border-foreground/20")} data-testid={`tag-${t}`}>{t}</button>
          ))}
        </div>
      </CardContent></Card>

      <SectionHeader>Notes</SectionHeader>
      <Card><CardContent className="pt-4 pb-4">
        <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Skin felt tight AM. Sandwich with Atoderm. Cyspera 12 min, no warmth. L malar bump resolved." className="min-h-[72px] text-sm resize-none" data-testid="textarea-notes" />
      </CardContent></Card>

      <div className="pt-3">
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="w-full" size="lg" data-testid="button-save">
          {mutation.isPending ? "Saving..." : existingLog ? "Update Log" : "Save Log"}
        </Button>
      </div>
    </div>
  );
}
