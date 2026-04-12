import { useState } from "react";
import { ZONE_ISSUES, zoneColor, type ZoneId, type FaceMapData, type IssueId } from "@shared/facemap";
import { cn } from "@/lib/utils";
import { X, Check } from "lucide-react";

// ── Zone definitions with clean non-overlapping paths ─────────────────────
// ViewBox: 0 0 240 320 — face centered, generous spacing
// Mirror image: left on map = patient's left cheek

interface ZoneDef {
  id: ZoneId;
  label: string;
  // ellipse params
  cx: number; cy: number; rx: number; ry: number;
}

const ZONES: ZoneDef[] = [
  // ── Forehead ──
  { id: "forehead_l",   label: "Forehead L",      cx: 82,  cy: 60,  rx: 28, ry: 20 },
  { id: "forehead_r",   label: "Forehead R",      cx: 158, cy: 60,  rx: 28, ry: 20 },
  { id: "glabella",     label: "Glabella",        cx: 120, cy: 86,  rx: 16, ry: 13 },
  // ── Under-eye ──
  { id: "undereye_l",   label: "Under-eye L",     cx: 82,  cy: 126, rx: 20, ry: 10 },
  { id: "undereye_r",   label: "Under-eye R",     cx: 158, cy: 126, rx: 20, ry: 10 },
  // ── Cheeks ──
  { id: "ant_malar_l",  label: "Ant. Malar L",    cx: 80,  cy: 155, rx: 22, ry: 17 },
  { id: "ant_malar_r",  label: "Ant. Malar R",    cx: 160, cy: 155, rx: 22, ry: 17 },
  { id: "lat_malar_l",  label: "Lat. Malar L",    cx: 52,  cy: 168, rx: 18, ry: 20 },
  { id: "lat_malar_r",  label: "Lat. Malar R",    cx: 188, cy: 168, rx: 18, ry: 20 },
  // ── Nose ──
  { id: "nose",         label: "Nose",            cx: 120, cy: 152, rx: 14, ry: 20 },
  // ── Nasolabial ──
  { id: "nasolabial_l", label: "Nasolabial L",    cx: 88,  cy: 182, rx: 12, ry: 14 },
  { id: "nasolabial_r", label: "Nasolabial R",    cx: 152, cy: 182, rx: 12, ry: 14 },
  // ── Perioral ──
  { id: "perioral_l",   label: "Perioral L",      cx: 96,  cy: 208, rx: 16, ry: 12 },
  { id: "perioral_r",   label: "Perioral R",      cx: 144, cy: 208, rx: 16, ry: 12 },
  { id: "upper_lip",    label: "Upper Lip",       cx: 120, cy: 202, rx: 14, ry: 10 },
  // ── Chin / marionette ──
  { id: "chin_l",       label: "Chin L",          cx: 96,  cy: 238, rx: 18, ry: 14 },
  { id: "chin_r",       label: "Chin R",          cx: 144, cy: 238, rx: 18, ry: 14 },
];

// Short labels for inside zones
const SHORT: Record<ZoneId, string> = {
  forehead_l: "Fore L",   forehead_r: "Fore R",
  glabella: "Glabella",
  undereye_l: "UE L",     undereye_r: "UE R",
  ant_malar_l: "Ant\nMal L", ant_malar_r: "Ant\nMal R",
  lat_malar_l: "Lat\nMal L", lat_malar_r: "Lat\nMal R",
  nose: "Nose",
  nasolabial_l: "NL L",   nasolabial_r: "NL R",
  perioral_l: "Peri L",   perioral_r: "Peri R",
  upper_lip: "Lip",
  chin_l: "Chin L",       chin_r: "Chin R",
};

// ── Zone popover ───────────────────────────────────────────────────────────
function ZonePopover({
  zone, annotation, onSave, onClose,
}: {
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
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1">
            <X size={15} />
          </button>
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

// ── Main FaceMap component ─────────────────────────────────────────────────
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

  // Compact mode: 140px wide
  const W = compact ? 140 : 260;
  const H = compact ? 188 : 372;

  return (
    <div className="relative select-none" style={{ width: W, height: H }}>
      <svg viewBox="0 0 240 340" width={W} height={H} className="overflow-visible">

        {/* ── Face silhouette ── */}
        {/* Main face shape — wider mid-face, narrower forehead and chin */}
        <path
          d="M120,18 C88,18 58,34 46,62 C34,90 36,118 38,138
             C40,158 36,168 36,178 C36,200 44,224 58,244
             C72,264 90,276 120,278
             C150,276 168,264 182,244
             C196,224 204,200 204,178
             C204,168 200,158 202,138
             C204,118 206,90 194,62
             C182,34 152,18 120,18 Z"
          fill="hsl(var(--accent) / 0.12)"
          stroke="hsl(var(--border))"
          strokeWidth="1.5"
        />

        {/* ── Facial features (non-interactive) ── */}

        {/* Eyebrows */}
        <path d="M62 100 Q74 94 86 98" fill="none" stroke="hsl(var(--foreground))" strokeWidth="2" strokeLinecap="round" opacity="0.35"/>
        <path d="M154 98 Q166 94 178 100" fill="none" stroke="hsl(var(--foreground))" strokeWidth="2" strokeLinecap="round" opacity="0.35"/>

        {/* Eyes */}
        <ellipse cx="78" cy="112" rx="16" ry="9"
          fill="hsl(var(--background))" stroke="hsl(var(--foreground))" strokeWidth="1.2" opacity="0.5"/>
        <ellipse cx="162" cy="112" rx="16" ry="9"
          fill="hsl(var(--background))" stroke="hsl(var(--foreground))" strokeWidth="1.2" opacity="0.5"/>
        <circle cx="78"  cy="112" r="4.5" fill="hsl(var(--foreground))" opacity="0.3"/>
        <circle cx="162" cy="112" r="4.5" fill="hsl(var(--foreground))" opacity="0.3"/>

        {/* Nose */}
        <path d="M114,128 L110,162 Q120,170 130,162 L126,128"
          fill="none" stroke="hsl(var(--foreground))" strokeWidth="1.2" strokeLinecap="round" opacity="0.3"/>
        <path d="M106,162 Q110,168 120,168 Q130,168 134,162"
          fill="none" stroke="hsl(var(--foreground))" strokeWidth="1.2" strokeLinecap="round" opacity="0.3"/>

        {/* Lips */}
        <path d="M100,208 Q110,202 120,205 Q130,202 140,208"
          fill="none" stroke="hsl(var(--foreground))" strokeWidth="1.5" strokeLinecap="round" opacity="0.4"/>
        <path d="M100,208 Q110,216 120,214 Q130,216 140,208"
          fill="hsl(var(--foreground))" fillOpacity="0.08"
          stroke="hsl(var(--foreground))" strokeWidth="1.2" strokeLinecap="round" opacity="0.35"/>

        {/* Chin crease */}
        <path d="M100,258 Q120,268 140,258"
          fill="none" stroke="hsl(var(--foreground))" strokeWidth="1" strokeLinecap="round" opacity="0.2"/>

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
              {/* Zone fill */}
              <ellipse
                cx={zone.cx} cy={zone.cy} rx={zone.rx} ry={zone.ry}
                fill={hasIssue ? color + "40" : isActive ? "hsl(var(--primary) / 0.08)" : "transparent"}
                stroke={
                  isActive ? "hsl(var(--primary))" :
                  hasIssue ? color :
                  "hsl(var(--foreground) / 0.18)"
                }
                strokeWidth={isActive ? 2 : hasIssue ? 2 : 1}
                strokeDasharray={!hasIssue && !isActive ? "3 2" : undefined}
                className={!readOnly ? "transition-all" : ""}
              />
              {/* Hover ring (non-compact only) */}
              {!compact && !readOnly && (
                <ellipse
                  cx={zone.cx} cy={zone.cy} rx={zone.rx + 1} ry={zone.ry + 1}
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="1.5"
                  opacity="0"
                  className="hover:opacity-40 transition-opacity"
                />
              )}
              {/* Issue dot */}
              {hasIssue && (
                <circle cx={zone.cx} cy={zone.cy} r={compact ? 4 : 5}
                  fill={color!} stroke="hsl(var(--background))" strokeWidth="1.5"/>
              )}
              {/* Zone label — full mode only */}
              {!compact && (
                <>
                  {SHORT[zone.id].includes("\n") ? (
                    <>
                      <text x={zone.cx} y={zone.cy - 3} textAnchor="middle" dominantBaseline="middle"
                        fontSize="6.5" fill={hasIssue ? color! : "hsl(var(--muted-foreground))"}
                        fontWeight={hasIssue ? "600" : "400"}
                        style={{ pointerEvents: "none", userSelect: "none" }}>
                        {SHORT[zone.id].split("\n")[0]}
                      </text>
                      <text x={zone.cx} y={zone.cy + 6} textAnchor="middle" dominantBaseline="middle"
                        fontSize="6.5" fill={hasIssue ? color! : "hsl(var(--muted-foreground))"}
                        fontWeight={hasIssue ? "600" : "400"}
                        style={{ pointerEvents: "none", userSelect: "none" }}>
                        {SHORT[zone.id].split("\n")[1]}
                      </text>
                    </>
                  ) : (
                    <text x={zone.cx} y={zone.cy} textAnchor="middle" dominantBaseline="middle"
                      fontSize="6.5" fill={hasIssue ? color! : "hsl(var(--muted-foreground))"}
                      fontWeight={hasIssue ? "600" : "400"}
                      style={{ pointerEvents: "none", userSelect: "none" }}>
                      {SHORT[zone.id]}
                    </text>
                  )}
                </>
              )}
            </g>
          );
        })}

        {/* Mirror labels */}
        {!compact && (
          <>
            <text x="28" y="330" textAnchor="middle" fontSize="8"
              fill="hsl(var(--muted-foreground))" opacity="0.6">← Your L</text>
            <text x="212" y="330" textAnchor="middle" fontSize="8"
              fill="hsl(var(--muted-foreground))" opacity="0.6">Your R →</text>
          </>
        )}
      </svg>

      {/* Zone popover overlay */}
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
