import type { IKit, IKitFlashcard, IKitQuestion, IKitRequirement } from "../../types/kit.types.js";
import { validateKitDocument } from "../../validators/kit.validator.js";

export function assertKitEditable(kit: IKit) {
  if (kit.job.status !== "done") {
    const err = new Error("Kit is not ready for editing yet") as Error & { statusCode?: number };
    err.statusCode = 409;
    throw err;
  }
}

export function nextQuestionId(kit: IKit): string {
  const nums = kit.questions
    .map((q) => parseInt(q.id.replace(/^q/, ""), 10))
    .filter((n) => !Number.isNaN(n));
  return `q${(nums.length ? Math.max(...nums) : 0) + 1}`;
}

export function nextFlashcardId(kit: IKit): string {
  const nums = kit.flashcards
    .map((f) => parseInt(f.id.replace(/^f/, ""), 10))
    .filter((n) => !Number.isNaN(n));
  return `f${(nums.length ? Math.max(...nums) : 0) + 1}`;
}

export async function saveKit(kit: IKit, opts?: { bumpVersion?: boolean }) {
  validateKitDocument(kit.toObject({ depopulate: true, versionKey: false }));
  if (opts?.bumpVersion !== false) kit.version += 1;
  await kit.save();
  return kit;
}

export function nextRequirementId(kit: IKit): string {
  const nums = kit.role.requirements
    .map((r) => parseInt(r.id.replace(/^r/, ""), 10))
    .filter((n) => !Number.isNaN(n));
  return `r${(nums.length ? Math.max(...nums) : 0) + 1}`;
}

export function markRequirementEdited(r: IKitRequirement) {
  r._state = {
    origin: r._state?.origin === "user" ? "user" : "edited",
    pinned: true,
    editedAt: new Date(),
  };
}

/** Recompute uncovered reqs: any requirement no question references. */
export function recomputeUncovered(kit: IKit) {
  const covered = new Set(kit.questions.flatMap((q) => q.requirement_ids));
  kit.coverage.uncovered_requirement_ids = kit.role.requirements
    .map((r) => r.id)
    .filter((id) => !covered.has(id));
}

/**
 * Pre-check the must-scheduled invariant before save/validation can throw.
 * Call after applying an edit so callers surface a clean 409 instead of a 500.
 */
export function assertMustRequirementsScheduled(kit: IKit, action: string) {
  if (kit.job.status !== "done") return;
  const scheduledQIds = new Set(kit.schedule.days.flatMap((d) => d.question_ids));
  const scheduledReqIds = new Set(
    kit.questions.filter((q) => scheduledQIds.has(q.id)).flatMap((q) => q.requirement_ids)
  );
  const missing = kit.role.requirements.filter((r) => r.priority === "must" && !scheduledReqIds.has(r.id));
  if (missing.length > 0) {
    const ids = missing.map((r) => r.id).join(", ");
    const err = new Error(
      `${action} would leave must requirement(s) ${ids} without a scheduled question; reschedule or restore coverage first`
    ) as Error & { statusCode?: number };
    err.statusCode = 409;
    throw err;
  }
}
export function markQuestionEdited(q: IKitQuestion, userOrigin = false) {
  q._state = {
    origin: userOrigin ? "user" : q._state?.origin ?? "generated",
    pinned: true,
    editedAt: new Date(),
  };
}

export function markFlashcardEdited(f: IKitFlashcard, userOrigin = false) {
  f._state = {
    origin: userOrigin ? "user" : f._state?.origin ?? "generated",
    pinned: true,
    editedAt: new Date(),
  };
}
