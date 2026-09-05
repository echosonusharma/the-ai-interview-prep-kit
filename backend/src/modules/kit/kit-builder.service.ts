import type { IKit } from "../../types/kit.types.js";
import type { QuestionCategory } from "../../pipeline/steps/questions.js";
import {
  assertKitEditable,
  assertMustRequirementsScheduled,
  markFlashcardEdited,
  markQuestionEdited,
  markRequirementEdited,
  nextFlashcardId,
  nextQuestionId,
  nextRequirementId,
  recomputeUncovered,
  saveKit,
} from "./kit-builder.utils.js";

export async function updateBrief(
  kit: IKit,
  patch: { summary?: string; what_they_do?: string; pinned?: boolean }
) {
  assertKitEditable(kit);
  if (patch.summary !== undefined) kit.company_brief.summary = patch.summary;
  if (patch.what_they_do !== undefined) kit.company_brief.what_they_do = patch.what_they_do;
  kit.company_brief._meta = {
    pinned: patch.pinned ?? true,
    editedAt: new Date(),
  };
  return saveKit(kit);
}

export async function updateQuestion(
  kit: IKit,
  qid: string,
  patch: {
    prompt?: string;
    answer_outline?: string;
    difficulty?: 1 | 2 | 3;
    category?: QuestionCategory;
    requirement_ids?: string[];
    pinned?: boolean;
  }
) {
  assertKitEditable(kit);
  const q = kit.questions.find((x) => x.id === qid);
  if (!q) {
    const err = new Error(`Question ${qid} not found`) as Error & { statusCode?: number };
    err.statusCode = 404;
    throw err;
  }
  if (patch.prompt !== undefined) q.prompt = patch.prompt;
  if (patch.answer_outline !== undefined) q.answer_outline = patch.answer_outline;
  if (patch.difficulty !== undefined) q.difficulty = patch.difficulty;
  if (patch.category !== undefined) q.category = patch.category;
  if (patch.requirement_ids !== undefined) q.requirement_ids = patch.requirement_ids;
  if (patch.pinned !== undefined) {
    q._state = { origin: q._state?.origin ?? "generated", pinned: patch.pinned, editedAt: new Date() };
  } else {
    markQuestionEdited(q);
  }
  recomputeUncovered(kit);
  assertMustRequirementsScheduled(kit, `Updating question ${qid}`);
  return saveKit(kit);
}

export async function addQuestion(
  kit: IKit,
  input: {
    prompt: string;
    answer_outline: string;
    difficulty: 1 | 2 | 3;
    category: QuestionCategory;
    requirement_ids: string[];
  }
) {
  assertKitEditable(kit);
  const id = nextQuestionId(kit);
  kit.questions.push({
    id,
    prompt: input.prompt,
    answer_outline: input.answer_outline,
    difficulty: input.difficulty,
    category: input.category,
    requirement_ids: input.requirement_ids,
    _state: { origin: "user", pinned: true, editedAt: new Date() },
  });
  recomputeUncovered(kit);
  return saveKit(kit);
}

export async function deleteQuestion(kit: IKit, qid: string) {
  assertKitEditable(kit);
  const before = kit.questions.length;
  kit.questions = kit.questions.filter((q) => q.id !== qid);
  if (kit.questions.length === before) {
    const err = new Error(`Question ${qid} not found`) as Error & { statusCode?: number };
    err.statusCode = 404;
    throw err;
  }
  for (const day of kit.schedule.days) {
    day.question_ids = day.question_ids.filter((id) => id !== qid);
  }
  recomputeUncovered(kit);
  assertMustRequirementsScheduled(kit, `Deleting question ${qid}`);
  return saveKit(kit);
}

export async function reorderQuestions(kit: IKit, order: string[]) {
  assertKitEditable(kit);
  const map = new Map(kit.questions.map((q) => [q.id, q]));
  if (order.length !== kit.questions.length || order.some((id) => !map.has(id))) {
    const err = new Error("order must list every question id exactly once") as Error & { statusCode?: number };
    err.statusCode = 400;
    throw err;
  }
  kit.questions = order.map((id) => map.get(id)!);
  return saveKit(kit);
}

export async function updateRequirement(
  kit: IKit,
  rid: string,
  patch: {
    text?: string;
    kind?: "technical" | "behavioural" | "domain";
    priority?: "must" | "nice";
    pinned?: boolean;
  }
) {
  assertKitEditable(kit);
  const r = kit.role.requirements.find((x) => x.id === rid);
  if (!r) {
    const err = new Error(`Requirement ${rid} not found`) as Error & { statusCode?: number };
    err.statusCode = 404;
    throw err;
  }
  if (patch.text !== undefined) {
    if (!patch.text.trim()) {
      const err = new Error("Requirement text must not be empty") as Error & { statusCode?: number };
      err.statusCode = 400;
      throw err;
    }
    r.text = patch.text.trim();
  }
  if (patch.kind !== undefined) r.kind = patch.kind;
  if (patch.priority !== undefined) r.priority = patch.priority;
  if (patch.pinned !== undefined) {
    r._state = { origin: r._state?.origin ?? "generated", pinned: patch.pinned, editedAt: new Date() };
  } else {
    markRequirementEdited(r);
  }
  recomputeUncovered(kit);
  assertMustRequirementsScheduled(kit, `Updating requirement ${rid}`);
  return saveKit(kit);
}

export async function addRequirement(
  kit: IKit,
  input: {
    text: string;
    kind: "technical" | "behavioural" | "domain";
    priority: "must" | "nice";
  }
) {
  assertKitEditable(kit);
  if (!input.text?.trim()) {
    const err = new Error("Requirement text is required") as Error & { statusCode?: number };
    err.statusCode = 400;
    throw err;
  }
  kit.role.requirements.push({
    id: nextRequirementId(kit),
    text: input.text.trim(),
    kind: input.kind,
    priority: input.priority,
    _state: { origin: "user", pinned: true, editedAt: new Date() },
  });
  recomputeUncovered(kit);
  return saveKit(kit);
}

export async function deleteRequirement(kit: IKit, rid: string) {
  assertKitEditable(kit);
  const before = kit.role.requirements.length;
  kit.role.requirements = kit.role.requirements.filter((r) => r.id !== rid);
  if (kit.role.requirements.length === before) {
    const err = new Error(`Requirement ${rid} not found`) as Error & { statusCode?: number };
    err.statusCode = 404;
    throw err;
  }
  for (const q of kit.questions) {
    q.requirement_ids = q.requirement_ids.filter((id) => id !== rid);
  }
  for (const f of kit.flashcards) {
    f.requirement_ids = f.requirement_ids.filter((id) => id !== rid);
  }
  recomputeUncovered(kit);
  return saveKit(kit);
}

export async function updateFlashcard(
  kit: IKit,
  fid: string,
  patch: { front?: string; back?: string; requirement_ids?: string[]; pinned?: boolean }
) {
  assertKitEditable(kit);
  const f = kit.flashcards.find((x) => x.id === fid);
  if (!f) {
    const err = new Error(`Flashcard ${fid} not found`) as Error & { statusCode?: number };
    err.statusCode = 404;
    throw err;
  }
  if (patch.front !== undefined) f.front = patch.front;
  if (patch.back !== undefined) f.back = patch.back;
  if (patch.requirement_ids !== undefined) f.requirement_ids = patch.requirement_ids;
  if (patch.pinned !== undefined) {
    f._state = { origin: f._state?.origin ?? "generated", pinned: patch.pinned, editedAt: new Date() };
  } else {
    markFlashcardEdited(f);
  }
  return saveKit(kit);
}

export async function addFlashcard(
  kit: IKit,
  input: { front: string; back: string; requirement_ids: string[] }
) {
  assertKitEditable(kit);
  kit.flashcards.push({
    id: nextFlashcardId(kit),
    front: input.front,
    back: input.back,
    requirement_ids: input.requirement_ids,
    _state: { origin: "user", pinned: true, editedAt: new Date() },
  });
  return saveKit(kit);
}

export async function deleteFlashcard(kit: IKit, fid: string) {
  assertKitEditable(kit);
  const before = kit.flashcards.length;
  kit.flashcards = kit.flashcards.filter((f) => f.id !== fid);
  if (kit.flashcards.length === before) {
    const err = new Error(`Flashcard ${fid} not found`) as Error & { statusCode?: number };
    err.statusCode = 404;
    throw err;
  }
  kit.practice.progress = kit.practice.progress.filter((p) => p.flashcardId !== fid);
  return saveKit(kit);
}
