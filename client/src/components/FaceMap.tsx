import { useState } from "react";
import { ZONE_ISSUES, zoneColor, type ZoneId, type FaceMapData, type IssueId } from "@shared/facemap";
import { cn } from "@/lib/utils";
import { X, Check } from "lucide-react";

interface ZoneDef {
  id: ZoneId;
  label: string;
  cx: number; cy: number; rx: number; ry: number;
}

// 5 zones on a 220×300 viewBox — generous, non-overlapping
const ZONES: ZoneDef[] = [
  { id: "forehead", label: "Forehead",    cx: 110, cy: 52,  rx: 62, ry: 30 },
  { id: "cheek_l",  label: "Left Cheek",  cx: 54,  cy: 158, rx: 42, ry: 48 },
  { id: "cheek_r",  label: "Right Cheek", cx: 166, cy: 158, rx: 42, ry: 48 },
  { id: "nose",     label: "Nose",        cx: 110, cy: 148, rx: 22, ry: 32 },
  { id: "perioral", label: "Peri-oral",   cx: 110, cy: 224, rx: 46, ry: 26 },
];

// ── Zone Popover ───────────────────────────────────────────────────────────
function ZonePopover({ zone, annotation, onSave, onClose }: {
  zone: ZoneDef;
  annotation: { issues: IssueId[]; note?: string };
  onSave: (a: { issues: IssueId[]; note: string }) => void;
  onClose: () => void;
}) {
  const [issues, setIssues] = useState<IssueId[]>(annotation.issues);
  const [note, setNote] = useState(annotation.note || "");
  const toggle = (id: IssueId) =>
    setIssues(p => p.includes(id) ? p.filter(i => i !== id) : [...p, id]);

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/85 backdrop-blur-sm rounded-2xl">
      <div className="bg-card border border-border rounded-2xl shadow-xl p-4 w-[230px]">
        <div className="flex items-center justify-between mb-3">
          <p className="font-semibold text-sm">{zone.label}</p>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1"><X size={15} /></button>
        </div>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {ZONE_ISSUES.map(issue => (
            <button key={issue.id} onClick={() => toggle(issue.id as IssueId)}
              className={cn(
                "px-2.5 py-1 rounded-full text-xs font-medium border transition-all",
                issues.includes(issue.id as IssueId)
                  ? "text-white border-transparent"
                  : "border-border text-muted-foreground hover:border-foreground/20 bg-background"
              )}
              style={issues.includes(issue.id as IssueId) ? { backgroundColor: issue.color } : {}}>
              {issue.emoji} {issue.label}
            </button>
          ))}
        </div>
        <input type="text" value={note} onChange={e => setNote(e.target.value)}
          placeholder="Note (optional)"
          className="w-full text-xs rounded-lg border border-input bg-background px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-ring mb-3" />
        <div className="flex gap-2">
          <button onClick={() => onSave({ issues, note })}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold">
            <Check size={13} /> Save
          </button>
          {(issues.length > 0 || note) && (
            <button onClick={() => onSave({ issues: [], note: "" })}
              className="px-3 py-2 rounded-lg border border-border text-xs text-muted-foreground hover:text-destructive">
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main FaceMap ───────────────────────────────────────────────────────────
interface FaceMapProps {
  value: FaceMapData;
  onChange: (map: FaceMapData) => void;
  readOnly?: boolean;
  compact?: boolean;
}

export default function FaceMap({ value, onChange, readOnly = false, compact = false }: FaceMapProps) {
  const [activeZoneId, setActiveZoneId] = useState<ZoneId | null>(null);
  const activeZone = ZONES.find(z => z.id === activeZoneId) || null;

  const handleSave = (zoneId: ZoneId, annotation: { issues: IssueId[]; note: string }) => {
    const next = { ...value };
    if (annotation.issues.length === 0 && !annotation.note) delete next[zoneId];
    else next[zoneId] = annotation;
    onChange(next);
    setActiveZoneId(null);
  };

  const W = compact ? 130 : 240;
  const H = compact ? 177 : 327;

  return (
    <div className="relative select-none" style={{ width: W, height: H }}>
      <svg viewBox="0 0 220 300" width={W} height={H}>

        {/* ── Face silhouette ── */}
        <path
          d="M110,12 C78,12 50,28 40,56 C30,84 32,114 34,140
             C36,160 30,172 32,188 C34,212 44,238 62,256
             C78,272 94,280 110,280
             C126,280 142,272 158,256
             C176,238 186,212 188,188
             C190,172 184,160 186,140
             C188,114 190,84 180,56
             C170,28 142,12 110,12 Z"
          fill="hsl(var(--accent) / 0.1)"
          stroke="hsl(var(--border))"
          strokeWidth="1.5"
        />

        {/* ── Non-interactive features ── */}

        {/* Eyebrows */}
        <path d="M60,96 Q74,90 88,94" fill="none" stroke="hsl(var(--foreground))" strokeWidth="2.2" strokeLinecap="round" opacity="0.3"/>
        <path d="M132,94 Q146,90 160,96" fill="none" stroke="hsl(var(--foreground))" strokeWidth="2.2" strokeLinecap="round" opacity="0.3"/>

        {/* Eyes */}
        <ellipse cx="76" cy="108" rx="16" ry="9" fill="hsl(var(--background))" stroke="hsl(var(--foreground))" strokeWidth="1.2" opacity="0.45"/>
        <ellipse cx="144" cy="108" rx="16" ry="9" fill="hsl(var(--background))" stroke="hsl(var(--foreground))" strokeWidth="1.2" opacity="0.45"/>
        <circle cx="76"  cy="108" r="4.5" fill="hsl(var(--foreground))" opacity="0.25"/>
        <circle cx="144" cy="108" r="4.5" fill="hsl(var(--foreground))" opacity="0.25"/>

        {/* Nose */}
        <path d="M104,124 L100,158 Q110,165 120,165 Q130,165 120,158 L116,124"
          fill="none" stroke="hsl(var(--foreground))" strokeWidth="1.2" strokeLinecap="round" opacity="0.25"/>
        <ellipse cx="110" cy="163" rx="12" ry="6" fill="none" stroke="hsl(var(--foreground))" strokeWidth="1" opacity="0.2"/>

        {/* Lips */}
        <path d="M88,212 Q99,206 110,209 Q121,206 132,212"
          fill="none" stroke="hsl(var(--foreground))" strokeWidth="1.8" strokeLinecap="round" opacity="0.35"/>
        <path d="M88,212 Q99,222 110,220 Q121,222 132,212"
          fill="hsl(var(--foreground))" fillOpacity="0.07"
          stroke="hsl(var(--foreground))" strokeWidth="1.2" strokeLinecap="round" opacity="0.3"/>

        {/* ── Tappable zones ── */}
        {ZONES.map(zone => {
          const ann = value[zone.id];
          const color = zoneColor(ann);
          const hasIssue = !!color && (ann?.issues?.length ?? 0) > 0;
          const isActive = activeZoneId === zone.id;

          return (
            <g key={zone.id}
              onClick={() => !readOnly && setActiveZoneId(zone.id)}
              style={{ cursor: readOnly ? "default" : "pointer" }}>
              <ellipse
                cx={zone.cx} cy={zone.cy} rx={zone.rx} ry={zone.ry}
                fill={hasIssue ? color + "38" : isActive ? "hsl(var(--primary) / 0.1)" : "hsl(var(--foreground) / 0.03)"}
                stroke={isActive ? "hsl(var(--primary))" : hasIssue ? color : "hsl(var(--foreground) / 0.22)"}
                strokeWidth={isActive || hasIssue ? 2 : 1.2}
                strokeDasharray={!hasIssue && !isActive ? "4 3" : undefined}
                className={!readOnly ? "hover:fill-primary/10 hover:stroke-primary transition-all" : ""}
              />
              {/* Colored dot when annotated */}
              {hasIssue && !compact && (
                <circle cx={zone.cx} cy={zone.cy - zone.ry + 10}
                  r="5" fill={color!} stroke="hsl(var(--background))" strokeWidth="1.5"/>
              )}
              {hasIssue && compact && (
                <circle cx={zone.cx} cy={zone.cy} r="5"
                  fill={color!} stroke="hsl(var(--background))" strokeWidth="1.5"/>
              )}
              {/* Zone label */}
              {!compact && (
                <text x={zone.cx} y={zone.cy + (hasIssue ? 6 : 0)}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize={zone.id === "nose" ? "7.5" : "9"}
                  fontWeight="500"
                  fill={hasIssue ? color! : "hsl(var(--muted-foreground))"}
                  style={{ pointerEvents: "none", userSelect: "none" }}>
                  {zone.label}
                </text>
              )}
              {/* Emoji issue summary under label */}
              {!compact && hasIssue && ann?.issues && (
                <text x={zone.cx} y={zone.cy + 18}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize="9"
                  style={{ pointerEvents: "none", userSelect: "none" }}>
                  {ann.issues.map(i => ZONE_ISSUES.find(z => z.id === i)?.emoji || "").join(" ")}
                </text>
              )}
            </g>
          );
        })}

        {/* Mirror labels */}
        {!compact && (
          <>
            <text x="30" y="292" textAnchor="middle" fontSize="8.5"
              fill="hsl(var(--muted-foreground))" opacity="0.55">← Your L</text>
            <text x="190" y="292" textAnchor="middle" fontSize="8.5"
              fill="hsl(var(--muted-foreground))" opacity="0.55">Your R →</text>
          </>
        )}
      </svg>

      {/* Popover */}
      {activeZone && !readOnly && (
        <ZonePopover
          zone={activeZone}
          annotation={value[activeZone.id] || { issues: [] }}
          onSave={(a) => handleSave(activeZone.id, a)}
          onClose={() => setActiveZoneId(null)}
        />
      )}
    </div>
  );
}
