// Face map data types — shared between frontend and backend

export const FACE_ZONES = [
  { id: "forehead",   label: "Forehead",    side: "center" },
  { id: "nose",       label: "Nose",        side: "center" },
  { id: "cheek_l",    label: "Left Cheek",  side: "left"   },
  { id: "cheek_r",    label: "Right Cheek", side: "right"  },
  { id: "perioral",   label: "Peri-oral",   side: "center" },
] as const;

export type ZoneId = typeof FACE_ZONES[number]["id"];

export const ZONE_ISSUES = [
  { id: "redness",    label: "Redness",       color: "#c96e6e", emoji: "🔴" },
  { id: "blemish",    label: "Blemish",       color: "#a97bb5", emoji: "⚪" },
  { id: "peeling",    label: "Peeling",       color: "#d4a460", emoji: "🟡" },
  { id: "dryness",    label: "Dryness",       color: "#c9855c", emoji: "🟠" },
  { id: "purging",    label: "Purging bump",  color: "#8b6fbf", emoji: "🟣" },
  { id: "darkspot",   label: "Dark spot",     color: "#7a6045", emoji: "🟤" },
  { id: "irritation", label: "Irritation",    color: "#e07878", emoji: "❗" },
  { id: "bruising",   label: "Bruising",      color: "#6b7ab5", emoji: "🔵" },
] as const;

export type IssueId = typeof ZONE_ISSUES[number]["id"];

export interface ZoneAnnotation {
  issues: IssueId[];
  note?: string;
}

export type FaceMapData = Partial<Record<ZoneId, ZoneAnnotation>>;

export function emptyFaceMap(): FaceMapData { return {}; }

export function hasAnnotations(map: FaceMapData): boolean {
  return Object.values(map).some(z => z && z.issues.length > 0);
}

export function allIssuesInMap(map: FaceMapData): IssueId[] {
  const seen = new Set<IssueId>();
  Object.values(map).forEach(z => z?.issues.forEach(i => seen.add(i)));
  return [...seen];
}

export function zoneColor(annotation: ZoneAnnotation | undefined): string | null {
  if (!annotation || annotation.issues.length === 0) return null;
  // Priority order: irritation > redness > blemish > purging > peeling > dryness > darkspot > bruising
  const priority: IssueId[] = ["irritation", "redness", "blemish", "purging", "peeling", "dryness", "darkspot", "bruising"];
  for (const p of priority) {
    if (annotation.issues.includes(p)) {
      return ZONE_ISSUES.find(i => i.id === p)?.color || null;
    }
  }
  return null;
}
