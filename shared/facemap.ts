// Face map data types — shared between frontend and backend

export const FACE_ZONES = [
  // Upper face
  { id: "forehead_l",    label: "Forehead L",        side: "left"   },
  { id: "forehead_r",    label: "Forehead R",        side: "right"  },
  { id: "glabella",      label: "Glabella",          side: "center" },
  // Eye area
  { id: "undereye_l",    label: "Under-eye L",       side: "left"   },
  { id: "undereye_r",    label: "Under-eye R",       side: "right"  },
  // Mid face
  { id: "ant_malar_l",   label: "Ant. Malar L",      side: "left"   },
  { id: "ant_malar_r",   label: "Ant. Malar R",      side: "right"  },
  { id: "lat_malar_l",   label: "Lat. Malar L",      side: "left"   },
  { id: "lat_malar_r",   label: "Lat. Malar R",      side: "right"  },
  { id: "nose",          label: "Nose",              side: "center" },
  { id: "nasolabial_l",  label: "Nasolabial L",      side: "left"   },
  { id: "nasolabial_r",  label: "Nasolabial R",      side: "right"  },
  // Lower face
  { id: "perioral_l",    label: "Perioral L",        side: "left"   },
  { id: "perioral_r",    label: "Perioral R",        side: "right"  },
  { id: "upper_lip",     label: "Upper Lip",         side: "center" },
  { id: "chin_l",        label: "Chin/Marionette L", side: "left"   },
  { id: "chin_r",        label: "Chin/Marionette R", side: "right"  },
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
