import type { IKitQuestion, IKitRequirement } from "../types/kit.types.js";

/**
 * Code-computed coverage (brief §3 — the model's opinion is not trusted here).
 * A requirement is covered when at least one question references its id.
 * Returns uncovered ids in requirement order (deterministic).
 */
export function findUncovered(
  requirements: Pick<IKitRequirement, "id">[],
  questions: Pick<IKitQuestion, "id" | "requirement_ids">[]
): string[] {
  const covered = new Set<string>();
  for (const q of questions) {
    for (const rid of q.requirement_ids) covered.add(rid);
  }
  return requirements.map((r) => r.id).filter((id) => !covered.has(id));
}

/** Must-have subset of uncovered — these block a kit from shipping. */
export function findUncoveredMusts(
  requirements: Pick<IKitRequirement, "id" | "priority">[],
  questions: Pick<IKitQuestion, "id" | "requirement_ids">[]
): string[] {
  const uncovered = new Set(findUncovered(requirements, questions));
  return requirements
    .filter((r) => r.priority === "must" && uncovered.has(r.id))
    .map((r) => r.id);
}
