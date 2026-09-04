import type { IKit } from "../../types/kit.types.js";
import { assertKitEditable, saveKit } from "./kit-builder.utils.js";

export interface PracticeStats {
  total: number;
  reviewed: number;
  unseen: number;
  averageConfidence: number | null;
}

export function getPracticeStats(kit: IKit): PracticeStats {
  assertKitEditable(kit);
  const total = kit.flashcards.length;
  const byId = new Map(kit.practice.progress.map((p) => [p.flashcardId, p]));
  const reviewed = kit.flashcards.filter((f) => {
    const p = byId.get(f.id);
    return p && p.confidence !== null;
  }).length;
  const confidences = kit.practice.progress
    .map((p) => p.confidence)
    .filter((c): c is 1 | 2 | 3 | 4 | 5 => c !== null);
  const averageConfidence =
    confidences.length > 0 ? confidences.reduce((a, b) => a + b, 0) / confidences.length : null;
  return { total, reviewed, unseen: total - reviewed, averageConfidence };
}

/** Next card: overdue nextDue first, then unseen, then lowest confidence, then oldest review. */
export function pickNextFlashcardId(kit: IKit): string | null {
  assertKitEditable(kit);
  if (kit.flashcards.length === 0) return null;
  const byId = new Map(kit.practice.progress.map((p) => [p.flashcardId, p]));
  const now = Date.now();

  const ranked = kit.flashcards.map((f) => {
    const p = byId.get(f.id);
    const confidence = p?.confidence ?? null;
    const last = p?.lastReviewedAt?.getTime() ?? 0;
    const due = p?.nextDue?.getTime() ?? null;
    const overdue = due !== null && due <= now;
    const unseen = confidence === null;
    const confScore = confidence ?? 0;
    return { id: f.id, overdue, unseen, confScore, last };
  });

  ranked.sort((a, b) => {
    if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
    if (a.unseen !== b.unseen) return a.unseen ? -1 : 1;
    if (a.confScore !== b.confScore) return a.confScore - b.confScore;
    return a.last - b.last;
  });

  return ranked[0]?.id ?? null;
}

export async function recordFlashcardReview(
  kit: IKit,
  flashcardId: string,
  confidence: 1 | 2 | 3 | 4 | 5
) {
  assertKitEditable(kit);
  if (!kit.flashcards.some((f) => f.id === flashcardId)) {
    const err = new Error(`Flashcard ${flashcardId} not found`) as Error & { statusCode?: number };
    err.statusCode = 404;
    throw err;
  }

  const now = new Date();
  const existing = kit.practice.progress.find((p) => p.flashcardId === flashcardId);
  if (existing) {
    existing.confidence = confidence;
    existing.attempts += 1;
    existing.lastReviewedAt = now;
    // Simple spaced repetition: lower confidence → sooner due
    const days = confidence <= 2 ? 1 : confidence === 3 ? 3 : confidence === 4 ? 7 : 14;
    existing.nextDue = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  } else {
    const days = confidence <= 2 ? 1 : confidence === 3 ? 3 : confidence === 4 ? 7 : 14;
    kit.practice.progress.push({
      flashcardId,
      confidence,
      attempts: 1,
      lastReviewedAt: now,
      nextDue: new Date(now.getTime() + days * 24 * 60 * 60 * 1000),
    });
  }

  // Pure study activity: persist review state without bumping the content version.
  return saveKit(kit, { bumpVersion: false });
}

export function getPracticeDeck(kit: IKit) {
  assertKitEditable(kit);
  const stats = getPracticeStats(kit);
  const nextId = pickNextFlashcardId(kit);
  const knownIds = new Set(kit.flashcards.map((f) => f.id));
  const progress = kit.practice.progress
    .filter((p) => knownIds.has(p.flashcardId))
    .map((p) => ({
    flashcardId: p.flashcardId,
    confidence: p.confidence,
    attempts: p.attempts,
    lastReviewedAt: p.lastReviewedAt?.toISOString() ?? null,
    nextDue: p.nextDue?.toISOString() ?? null,
  }));
  return {
    stats,
    nextFlashcardId: nextId,
    flashcards: kit.flashcards.map((f) => ({
      id: f.id,
      front: f.front,
      back: f.back,
      requirement_ids: f.requirement_ids,
    })),
    progress,
  };
}
