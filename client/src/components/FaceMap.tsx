import { useState, useRef, useEffect } from "react";
import { ZONE_ISSUES, zoneColor, type ZoneId, type FaceMapData, type IssueId } from "@shared/facemap";
import { cn } from "@/lib/utils";
import { X, Check } from "lucide-react";

// ── SVG zone path data ─────────────────────────────────────────────────────
// Face is drawn on a 200×260 viewBox, center at x=100
// Zones are ellipses/paths. Left = patient's left = viewer's right (mirror image)

const ZONE_SHAPES: Record<ZoneId, { type: "ellipse" | "path"; props: Record<string, number | string> }> = {
  // Forehead — split left/right of center
  forehead_l:   { type: "ellipse", props: { cx: 72, cy: 52, rx: 28, ry: 18 } },
  forehead_r:   { type: "ellipse", props: { cx: 128, cy: 52, rx: 28, ry: 18 } },
  glabella:     { type: "ellipse", props: { cx: 100, cy: 78, rx: 14, ry: 11 } },
  // Under-eye
  undereye_l:   { type: "ellipse", props: { cx: 72, cy: 108, rx: 18, ry: 9 } },
  undereye_r:   { type: "ellipse", props: { cx: 128, cy: 108, rx: 18, ry: 9 } },
  // Anterior malar (front cheeks)
  ant_malar_l:  { type: "ellipse", props: { cx: 64, cy: 132, rx: 20, ry: 16 } },
  ant_malar_r:  { type: "ellipse", props: { cx: 136, cy: 132, rx: 20, ry: 16 } },
  // Lateral malar (outer cheeks)
  lat_malar_l:  { type: "ellipse", props: { cx: 44, cy: 130, rx: 16, ry: 20 } },
  lat_malar_r:  { type: "ellipse", props: { cx: 156, cy: 130, rx: 16, ry: 20 } },
  // Nose
  nose:         { type: "ellipse", props: { cx: 100, cy: 126, rx: 12, ry: 16 } },
  // Nasolabial
  nasolabial_l: { type: "ellipse", props: { cx: 76, cy: 152, rx: 10, ry: 14 } },
  nasolabial_r: { type: "ellipse", props: { cx: 124, cy: 152, rx: 10, ry: 14 } },
  // Perioral
  perioral_l:   { type: "ellipse", props: { cx: 78, cy: 176, rx: 14, ry: 11 } },
  perioral_r:   { type: "ellipse", props: { cx: 122, cy: 176, rx: 14, ry: 11 } },
  upper_lip:    { type: "ellipse", props: { cx: 100, cy: 170, rx: 12, ry: 9 } },
  // Chin / marionette
  chin_l:       { type: "ellipse", props: { cx: 80, cy: 198, rx: 14, ry: 12 } },
  chin_r:       { type: "ellipse", props: { cx: 120, cy: 198, rx: 14, ry: 12 } },
};

// Zone label positions (for small text labels)
const ZONE_LABELS: Record<ZoneId, { x: number; y: number; size?: number }> = {
  forehead_l:   { x: 72,  y: 52  },
  forehead_r:   { x: 128, y: 52  },
  glabella:     { x: 100, y: 78  },
  undereye_l:   { x: 72,  y: 108 },
  undereye_r:   { x: 128, y: 108 },
  ant_malar_l:  { x: 64,  y: 132 },
  ant_malar_r:  { x: 136, y: 132 },
  lat_malar_l:  { x: 44,  y: 130 },
  lat_malar_r:  { x: 156, y: 130 },
  nose:         { x: 100, y: 126 },
  nasolabial_l: { x: 76,  y: 152 },
  nasolabial_r: { x: 124, y: 152 },
  perioral_l:   { x: 78,  y: 176 },
  perioral_r:   { x: 122, y: 176 },
  upper_lip:    { x: 100, y: 170 },
  chin_l:       { x: 80,  y: 198 },
  chin_r:       { x: 120, y: 198 },
};

const ZONE_SHORT: Record<ZoneId, string> = {
  forehead_l:   "F.L", forehead_r:   "F.R",
  glabella:     "Glab", undereye_l:   "UE.L", undereye_r:   "UE.R",
  ant_malar_l:  "AM.L", ant_malar_r:  "AM.R",
  lat_malar_l:  "LM.L", lat_malar_r:  "LM.R",
  nose:         "Nose",
  nasolabial_l: "NL.L", nasolabial_r: "NL.R",
  perioral_l:   "PO.L", perioral_r:   "PO.R",
  upper_lip:    "Lip",  chin_l:       "Ch.L", chin_r:       "Ch.R",
};

// ── Zone popover ───────────────────────────────────────────────────────────
function ZonePopover({
  zoneId, annotation, onSave, onClose,
}: {
  zoneId: ZoneId;
  annotation: { issues: IssueId[]; note?: string };
  onSave: (a: { issues: IssueId[]; note: string }) => void;
  onClose: () => void;
}) {
  const [issues, setIssues] = useState<IssueId[]>(annotation.issues);
  const [note, setNote] = useState(annotation.note || "");

  const toggle = (id: IssueId) =>
    setIssues(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  const zoneName = Object.values(ZONE_SHAPES) // find label from FACE_ZONES
    ? zoneId.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())
    : zoneId;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-xl">
      <div className="bg-card border border-border rounded-2xl shadow-xl p-4 w-[220px] max-w-[90vw]">
        <div className="flex items-center justify-between mb-3">
          <p className="font-semibold text-sm capitalize">{zoneName.replace(/_/g, " ")}</p>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={16} />
          </button>
        </div>

        {/* Issue pills */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {ZONE_ISSUES.map(issue => (
            <button
              key={issue.id}
              onClick={() => toggle(issue.id as IssueId)}
              className={cn(
                "px-2.5 py-1 rounded-full text-xs font-medium border transition-all",
                issues.includes(issue.id as IssueId)
                  ? "text-white border-transparent"
                  : "border-border text-muted-foreground hover:border-foreground/20 bg-card"
              )}
              style={issues.includes(issue.id as IssueId) ? { backgroundColor: issue.color } : {}}
            >
              {issue.emoji} {issue.label}
            </button>
          ))}
        </div>

        {/* Note */}
        <input
          type="text"
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Note (optional)"
          className="w-full text-xs rounded-lg border border-input bg-background px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-ring mb-3"
        />

        <div className="flex gap-2">
          <button
            onClick={() => onSave({ issues, note })}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium"
          >
            <Check size={13} /> Save
          </button>
          {issues.length > 0 && (
            <button
              onClick={() => onSave({ issues: [], note: "" })}
              className="px-3 py-2 rounded-lg border border-border text-xs text-muted-foreground hover:text-destructive"
            >
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
  const [activeZone, setActiveZone] = useState<ZoneId | null>(null);

  const handleZoneClick = (zoneId: ZoneId) => {
    if (readOnly) return;
    setActiveZone(zoneId);
  };

  const handleSave = (zoneId: ZoneId, annotation: { issues: IssueId[]; note: string }) => {
    const next = { ...value };
    if (annotation.issues.length === 0) {
      delete next[zoneId];
    } else {
      next[zoneId] = annotation;
    }
    onChange(next);
    setActiveZone(null);
  };

  const size = compact ? 160 : 220;
  const scale = size / 200;

  return (
    <div className="relative" style={{ width: size, height: Math.round(size * 1.3) }}>
      <svg
        viewBox="0 0 200 260"
        width={size}
        height={Math.round(size * 1.3)}
        className="overflow-visible"
      >
        {/* Face outline */}
        <ellipse cx="100" cy="130" rx="78" ry="108"
          fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="1.5" />

        {/* Hair area */}
        <ellipse cx="100" cy="28" rx="78" ry="32"
          fill="hsl(var(--muted))" stroke="none" />

        {/* Eyes */}
        <ellipse cx="72" cy="95" rx="14" ry="8" fill="hsl(var(--background))" stroke="hsl(var(--border))" strokeWidth="1" />
        <ellipse cx="128" cy="95" rx="14" ry="8" fill="hsl(var(--background))" stroke="hsl(var(--border))" strokeWidth="1" />
        <circle cx="72" cy="95" r="4" fill="hsl(var(--foreground))" opacity="0.4" />
        <circle cx="128" cy="95" r="4" fill="hsl(var(--foreground))" opacity="0.4" />

        {/* Nose bridge line */}
        <line x1="96" y1="105" x2="94" y2="138" stroke="hsl(var(--border))" strokeWidth="1" strokeLinecap="round" />
        <line x1="104" y1="105" x2="106" y2="138" stroke="hsl(var(--border))" strokeWidth="1" strokeLinecap="round" />

        {/* Lips */}
        <path d="M88 163 Q100 170 112 163" fill="none" stroke="hsl(var(--border))" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M88 163 Q100 157 112 163" fill="hsl(var(--border))" opacity="0.2" />

        {/* Chin line */}
        <path d="M76 210 Q100 228 124 210" fill="none" stroke="hsl(var(--border))" strokeWidth="1" strokeLinecap="round" />

        {/* Tappable zone ellipses */}
        {(Object.entries(ZONE_SHAPES) as [ZoneId, typeof ZONE_SHAPES[ZoneId]][]).map(([id, shape]) => {
          const annotation = value[id];
          const color = zoneColor(annotation);
          const hasIssue = !!color;
          const isActive = activeZone === id;

          return (
            <g key={id} onClick={() => handleZoneClick(id)} style={{ cursor: readOnly ? "default" : "pointer" }}>
              <ellipse
                cx={shape.props.cx as number}
                cy={shape.props.cy as number}
                rx={shape.props.rx as number}
                ry={shape.props.ry as number}
                fill={hasIssue ? color + "55" : "transparent"}
                stroke={isActive ? "hsl(var(--primary))" : hasIssue ? color : "hsl(var(--border))"}
                strokeWidth={isActive ? 2 : hasIssue ? 1.5 : 0.75}
                strokeDasharray={!hasIssue && !isActive ? "3 2" : undefined}
                className={readOnly ? "" : "hover:stroke-primary hover:fill-primary/10 transition-all"}
                opacity={readOnly && !hasIssue ? 0.3 : 1}
              />
              {/* Issue dot indicators */}
              {annotation?.issues && annotation.issues.length > 0 && (
                <circle
                  cx={shape.props.cx as number}
                  cy={shape.props.cy as number}
                  r={4}
                  fill={color || "#999"}
                />
              )}
              {/* Zone label — only show on non-compact */}
              {!compact && !hasIssue && (
                <text
                  x={ZONE_LABELS[id].x}
                  y={ZONE_LABELS[id].y + 1}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="5"
                  fill="hsl(var(--muted-foreground))"
                  opacity="0.6"
                  style={{ pointerEvents: "none", userSelect: "none" }}
                >
                  {ZONE_SHORT[id]}
                </text>
              )}
            </g>
          );
        })}

        {/* Mirror label */}
        {!compact && (
          <>
            <text x="30" y="250" textAnchor="middle" fontSize="7" fill="hsl(var(--muted-foreground))" opacity="0.5">Your L</text>
            <text x="170" y="250" textAnchor="middle" fontSize="7" fill="hsl(var(--muted-foreground))" opacity="0.5">Your R</text>
          </>
        )}
      </svg>

      {/* Zone popover */}
      {activeZone && (
        <ZonePopover
          zoneId={activeZone}
          annotation={value[activeZone] || { issues: [] }}
          onSave={(a) => handleSave(activeZone, a)}
          onClose={() => setActiveZone(null)}
        />
      )}
    </div>
  );
}
