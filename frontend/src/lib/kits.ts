import type { KitSummary } from "./types";

/** Days from now until the interview (createdAt + days). Negative = past. */
export function daysLeft(k: KitSummary): number | null {
  if (!k.createdAt || k.days == null) return null;
  const target = new Date(k.createdAt).getTime() + k.days * 86_400_000;
  if (Number.isNaN(target)) return null;
  return Math.ceil((target - Date.now()) / 86_400_000);
}

export type SortKey = "upcoming" | "newest" | "oldest";

export const DIFFICULTY_LABELS = ["", "Easy", "Medium", "Hard"] as const;
