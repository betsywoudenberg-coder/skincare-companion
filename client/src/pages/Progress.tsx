import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { DailyLog } from "@shared/schema";
import { formatDate, SYMPTOM_COLORS } from "@/lib/utils";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, Legend, ReferenceLine,
} from "recharts";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";

const TRET_START = "2026-02-27";

function getWeek(startDate: string, date: string): number {
  const s = new Date(startDate + "T12:00:00");
  const d = new Date(date + "T12:00:00");
  return Math.max(1, Math.ceil((d.getTime() - s.getTime()) / (7 * 86400000) + 1));
}

function weeklyStats(logs: DailyLog[]) {
  const buckets: Record<number, {
    dryness: number[]; peeling: number[]; redness: number[]; purging: number[];
    tolerance: number[]; rosacea: number[]; malarBumps: number[];
    redLightDays: number; redLightMins: number; days: number;
  }> = {};

  logs.forEach(log => {
    const w = getWeek(TRET_START, log.date);
    if (w < 1 || w > 20) return;
    if (!buckets[w]) buckets[w] = { dryness: [], peeling: [], redness: [], purging: [], tolerance: [], rosacea: [], malarBumps: [], redLightDays: 0, redLightMins: 0, days: 0 };
    const b = buckets[w];
    b.dryness.push(log.dryness); b.peeling.push(log.peeling);
    b.redness.push(log.redness); b.purging.push(log.purging);
    b.tolerance.push(log.tolerance);
    b.rosacea.push(log.rosaceaFlare ? (log.rosaceaSeverity ?? 0) : 0);
    b.malarBumps.push(log.malarBumps ?? 0);
    if (log.redLightUsed) { b.redLightDays++; b.redLightMins += log.redLightDuration || 10; }
    b.days++;
  });

  const weeks = Array.from(new Set(logs.map(l => getWeek(TRET_START, l.date)))).filter(w => w >= 1 && w <= 20).sort((a, b) => a - b);

  return weeks.map(w => {
    const b = buckets[w];
    const avg = (arr: number[]) => arr.length ? Math.round((arr.reduce((a, c) => a + c, 0) / arr.length) * 10) / 10 : null;
    return {
      week: w, label: `Wk ${w}`,
      dryness: avg(b.dryness), peeling: avg(b.peeling),
      redness: avg(b.redness), purging: avg(b.purging),
      tolerance: avg(b.tolerance),
      rosacea: avg(b.rosacea),
      malarBumps: avg(b.malarBumps),
      redLightDays: b.redLightDays,
      redLightMins: b.redLightMins,
      days: b.days,
    };
  });
}

function TrendBadge({ values }: { values: (number | null)[] }) {
  const filled = values.filter((v): v is number => v !== null);
  if (filled.length < 2) return <Badge variant="secondary" className="text-xs"><Minus size={10} className="mr-1" />Not enough data</Badge>;
  const half = Math.floor(filled.length / 2);
  const first = filled.slice(0, half).reduce((a, b) => a + b, 0) / half;
  const last = filled.slice(half).reduce((a, b) => a + b, 0) / (filled.length - half);
  const diff = last - first;
  if (Math.abs(diff) < 0.15) return <Badge variant="secondary" className="text-xs"><Minus size={10} className="mr-1" />Stable</Badge>;
  return diff < 0
    ? <Badge className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-300"><TrendingDown size={10} className="mr-1" />Improving</Badge>
    : <Badge className="text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-300"><TrendingUp size={10} className="mr-1" />Worsening</Badge>;
}

function StatCard({ label, value, unit, color, trend }: { label: string; value: string; unit?: string; color?: string; trend?: (number | null)[] }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center gap-1.5 mb-1.5">
          {color && <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />}
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <div className="text-xl font-display mb-1.5" style={{ color }}>
          {value}<span className="text-xs text-muted-foreground ml-0.5">{unit}</span>
        </div>
        {trend && <TrendBadge values={trend} />}
      </CardContent>
    </Card>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-3 text-xs min-w-[140px]">
      <p className="font-semibold mb-2">{label}</p>
      {payload.map((e: any) => (
        <div key={e.name} className="flex items-center justify-between gap-3 mb-0.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: e.color }} />
            <span className="text-muted-foreground capitalize">{e.name}</span>
          </div>
          <span className="font-medium" style={{ color: e.color }}>{e.value}</span>
        </div>
      ))}
    </div>
  );
};

export default function Progress() {
  const { data: logs = [] } = useQuery<DailyLog[]>({ queryKey: ["/api/logs"] });

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
        <p className="text-3xl">📈</p>
        <h2 className="font-display text-xl">No data yet</h2>
        <p className="text-muted-foreground text-sm">Start logging daily to see your progress charts here.</p>
      </div>
    );
  }

  const wData = weeklyStats(logs);
  const totalRedLightSessions = logs.filter(l => l.redLightUsed).length;
  const totalRedLightMins = logs.filter(l => l.redLightUsed).reduce((s, l) => s + (l.redLightDuration || 10), 0);
  const avgTolerance = wData.length ? (wData.reduce((s, w) => s + (w.tolerance ?? 0), 0) / wData.length).toFixed(1) : "—";
  const rosaceaDays = logs.filter(l => l.rosaceaFlare).length;
  const malarAvg = logs.length ? (logs.reduce((s, l) => s + (l.malarBumps ?? 0), 0) / logs.length).toFixed(1) : "0";

  return (
    <div className="space-y-5 pb-6">
      <h1 className="font-display text-xl">Progress</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-2">
        <StatCard label="Tolerance (avg)" value={avgTolerance} unit="/10" color={SYMPTOM_COLORS.tolerance} trend={wData.map(w => w.tolerance)} />
        <StatCard label="Rosacea Flare Days" value={String(rosaceaDays)} color="#e07878" />
        <StatCard label="Malar Bumps (avg)" value={malarAvg} unit="/day" color="#d4a460" trend={wData.map(w => w.malarBumps)} />
        <StatCard label="Red Light Sessions" value={String(totalRedLightSessions)} unit={`· ${totalRedLightMins} min total`} color="#c9855c" />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="symptoms">
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="symptoms">Symptoms</TabsTrigger>
          <TabsTrigger value="rosacea">Rosacea</TabsTrigger>
          <TabsTrigger value="tolerance">Tolerance</TabsTrigger>
          <TabsTrigger value="redlight">Red Light</TabsTrigger>
        </TabsList>

        {/* Symptoms */}
        <TabsContent value="symptoms" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-base">Weekly Retinization Symptoms</CardTitle>
              <CardDescription className="text-xs">0=None · 1=Mild · 2=Moderate · 3=Severe</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={wData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis domain={[0, 3]} ticks={[0,1,2,3]} tickFormatter={v => ["—","Mi","Mo","Se"][v]||""} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                  <ReferenceLine x="Wk 6" stroke="hsl(var(--border))" strokeDasharray="4 4" label={{ value: "Typical peak", position: "insideTopRight", fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
                  <Line type="monotone" dataKey="dryness" stroke={SYMPTOM_COLORS.dryness} strokeWidth={2} dot={{ r: 3 }} connectNulls={false} />
                  <Line type="monotone" dataKey="peeling" stroke={SYMPTOM_COLORS.peeling} strokeWidth={2} dot={{ r: 3 }} connectNulls={false} />
                  <Line type="monotone" dataKey="redness" stroke={SYMPTOM_COLORS.redness} strokeWidth={2} dot={{ r: 3 }} connectNulls={false} />
                  <Line type="monotone" dataKey="purging" stroke={SYMPTOM_COLORS.purging} strokeWidth={2} dot={{ r: 3 }} connectNulls={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Malar bumps */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-base">Anterior Malar Bumps</CardTitle>
              <CardDescription className="text-xs">Weekly average — derm tracking</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={150}>
                <AreaChart data={wData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="malarGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#d4a460" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#d4a460" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis domain={[0, 3]} ticks={[0,1,2,3]} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="malarBumps" name="Malar bumps" stroke="#d4a460" fill="url(#malarGrad)" strokeWidth={2} dot={{ r: 3 }} connectNulls={false} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Rosacea */}
        <TabsContent value="rosacea" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-base">Rosacea Flare Severity</CardTitle>
              <CardDescription className="text-xs">Weekly average · 0=None · 3=Severe</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={wData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="rosGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#e07878" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#e07878" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis domain={[0, 3]} ticks={[0,1,2,3]} tickFormatter={v => ["—","Mi","Mo","Se"][v]||""} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="rosacea" name="Rosacea" stroke="#e07878" fill="url(#rosGrad)" strokeWidth={2} dot={{ r: 3 }} connectNulls={false} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Rosacea vs Tret redness */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-base">Rosacea vs. Tret Redness</CardTitle>
              <CardDescription className="text-xs">Compare flare severity to retinization redness</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={190}>
                <LineChart data={wData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis domain={[0, 3]} ticks={[0,1,2,3]} tickFormatter={v => ["—","Mi","Mo","Se"][v]||""} tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                  <Line type="monotone" dataKey="redness" name="Tret redness" stroke={SYMPTOM_COLORS.redness} strokeWidth={2} dot={{ r: 2 }} connectNulls={false} />
                  <Line type="monotone" dataKey="rosacea" name="Rosacea flare" stroke="#e07878" strokeWidth={2} strokeDasharray="5 3" dot={{ r: 2 }} connectNulls={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tolerance */}
        <TabsContent value="tolerance" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-base">Tolerance Over Time</CardTitle>
              <CardDescription className="text-xs">1=very sensitive · 10=fully tolerant</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={wData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="tolGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#5a9e7a" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#5a9e7a" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis domain={[0, 10]} ticks={[0,2,4,6,8,10]} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine y={7} stroke="hsl(var(--border))" strokeDasharray="4 4" label={{ value: "Well-tolerated", position: "insideTopRight", fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
                  <Area type="monotone" dataKey="tolerance" name="Tolerance" stroke="#5a9e7a" fill="url(#tolGrad)" strokeWidth={2.5} dot={{ r: 4, fill: "#5a9e7a" }} connectNulls={false} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Red Light */}
        <TabsContent value="redlight" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-base">Red Light Mask — Sessions per Week</CardTitle>
              <CardDescription className="text-xs">Number of days mask was used each week</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={190}>
                <BarChart data={wData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis domain={[0, 7]} ticks={[0,1,2,3,4,5,6,7]} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="redLightDays" name="Sessions" fill="#c9855c" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-base">Total Minutes per Week</CardTitle>
              <CardDescription className="text-xs">Cumulative mask time each week</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={wData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="rlGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#c9855c" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#c9855c" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="redLightMins" name="Minutes" stroke="#c9855c" fill="url(#rlGrad)" strokeWidth={2} dot={{ r: 3 }} connectNulls={false} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Red Light + Rosacea overlay */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-base">Red Light vs. Rosacea</CardTitle>
              <CardDescription className="text-xs">Sessions per week alongside rosacea flare severity</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={wData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis yAxisId="rl" domain={[0, 7]} tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis yAxisId="ros" orientation="right" domain={[0, 3]} ticks={[0,1,2,3]} tickFormatter={v => ["—","Mi","Mo","Se"][v]||""} tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                  <Line yAxisId="rl" type="monotone" dataKey="redLightDays" name="Red light (days)" stroke="#c9855c" strokeWidth={2} dot={{ r: 3 }} connectNulls={false} />
                  <Line yAxisId="ros" type="monotone" dataKey="rosacea" name="Rosacea severity" stroke="#e07878" strokeWidth={2} strokeDasharray="5 3" dot={{ r: 3 }} connectNulls={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Stats */}
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-2xl font-display" style={{ color: "#c9855c" }}>{totalRedLightSessions}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Total sessions</p>
                </div>
                <div>
                  <p className="text-2xl font-display" style={{ color: "#c9855c" }}>{totalRedLightMins}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Total minutes</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Recent log table */}
      <div>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Recent Entries</h2>
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Date</th>
                  <th className="text-center py-2 px-1.5 text-muted-foreground font-medium" style={{ color: SYMPTOM_COLORS.dryness }}>Dry</th>
                  <th className="text-center py-2 px-1.5 text-muted-foreground font-medium" style={{ color: SYMPTOM_COLORS.redness }}>Red</th>
                  <th className="text-center py-2 px-1.5 text-muted-foreground font-medium text-rose-400">Ros</th>
                  <th className="text-center py-2 px-1.5 text-muted-foreground font-medium text-amber-500">Malar</th>
                  <th className="text-center py-2 px-1.5 text-muted-foreground font-medium" style={{ color: SYMPTOM_COLORS.tolerance }}>Tol</th>
                  <th className="text-center py-2 px-1.5 text-muted-foreground font-medium" style={{ color: "#c9855c" }}>💡</th>
                </tr>
              </thead>
              <tbody>
                {[...logs].reverse().slice(0, 14).map(log => (
                  <tr key={log.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-1.5 px-3 font-medium whitespace-nowrap">{formatDate(log.date)}</td>
                    <td className="text-center py-1.5 px-1.5" style={{ color: SYMPTOM_COLORS.dryness }}>{["—","Mi","Mo","Se"][log.dryness]}</td>
                    <td className="text-center py-1.5 px-1.5" style={{ color: SYMPTOM_COLORS.redness }}>{["—","Mi","Mo","Se"][log.redness]}</td>
                    <td className="text-center py-1.5 px-1.5 text-rose-500">{log.rosaceaFlare ? ["—","Mi","Mo","Se"][log.rosaceaSeverity ?? 0] : "—"}</td>
                    <td className="text-center py-1.5 px-1.5 text-amber-600 dark:text-amber-400">{log.malarBumps ?? 0}</td>
                    <td className="text-center py-1.5 px-1.5 font-medium" style={{ color: SYMPTOM_COLORS.tolerance }}>{log.tolerance}</td>
                    <td className="text-center py-1.5 px-1.5">{log.redLightUsed ? `${log.redLightDuration || 10}m` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
