import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

export function toISODate(date: Date): string { return date.toISOString().split("T")[0]; }

export function formatDate(date: string | Date, opts?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === "string" ? new Date(date + "T12:00:00") : date;
  return d.toLocaleDateString("en-US", opts ?? { weekday: "short", month: "short", day: "numeric" });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function addDays(date: Date, n: number): Date {
  const d = new Date(date); d.setDate(d.getDate() + n); return d;
}

export function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

export const SYMPTOM_COLORS: Record<string, string> = {
  dryness: "#c9855c", peeling: "#d4a460", redness: "#c96e6e", purging: "#a97bb5", tolerance: "#5a9e7a", rosacea: "#e07878",
};

export const LEVEL_LABELS = ["None", "Mild", "Moderate", "Severe"];
export const LEVEL_COLORS = [
  "bg-muted text-muted-foreground border-border",
  "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700",
  "bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border-orange-300 dark:border-orange-700",
  "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-300 dark:border-red-700",
];

export function skinFeelEmoji(v: number) { return ["", "😣", "😟", "😐", "🙂", "😊"][v] || "😐"; }
export function skinFeelLabel(v: number) { return ["", "Very Rough", "Rough", "Okay", "Good", "Smooth"][v] || "Okay"; }
