import { z } from "zod";
import type { IKitRequirement } from "../../types/kit.types.js";
import { PROMPTS } from "../prompts/index.js";

export type QuestionCategory = "technical" | "behavioural" | "system-design" | "company-fit";

/**
 * Neutralize `</TAG>` collisions so untrusted text can't break out of
 * `<DATA>...</DATA>` prompt framing. The zero-width space keeps the text
 * human-readable while breaking exact closing-tag matches.
 * (Duplicated per step file — steps never import from each other.)
 */
function escapeUntrusted(text: string): string {
  return text.replace(/<\//g, "<\u200b/");
}

// Strict: only exact 1|2|3 (numbers, or strings holding exactly those digits)
// pass through — anything else fails validation so the question is dropped
// instead of being silently coerced to a default difficulty.
const difficultySchema = z.preprocess((v) => {
  const n = typeof v === "string" ? Number(v.trim()) : v;
  if (n === 1 || n === 2 || n === 3) return n;
  return v;
}, z.union([z.literal(1), z.literal(2), z.literal(3)]));

// Strict: arrays of strings pass (trimmed, empties removed); a single
// non-empty string wraps to one element. Anything else (numbers, objects,
// null, arrays with non-string elements) fails validation so the question is
// dropped instead of being silently coerced to [].
const reqIdsSchema = z.preprocess((v) => {
  if (typeof v === "string") {
    const t = v.trim();
    return t ? [t] : [];
  }
  if (Array.isArray(v)) {
    if (v.every((x) => typeof x === "string")) return v.map((x) => x.trim()).filter(Boolean);
    return v;
  }
  return v;
}, z.array(z.string().min(1)).default([]));

export const questionItemSchema = z.object({
  prompt: z.preprocess((v) => String(v ?? "").trim(), z.string().min(1)),
  answer_outline: z.preprocess((v) => String(v ?? "").trim(), z.string().min(1)),
  difficulty: difficultySchema,
  requirement_ids: reqIdsSchema,
});

export const questionListSchema = z.object({
  questions: z
    .preprocess((v) => (Array.isArray(v) ? v : []), z.array(z.unknown()))
    .transform((raw) => {
      let dropped = 0;
      const valid: Array<z.infer<typeof questionItemSchema>> = [];
      for (const item of raw) {
        const parsed = questionItemSchema.safeParse(item);
        if (parsed.success) valid.push(parsed.data);
        else dropped += 1;
      }
      if (valid.length === 0) {
        throw new Error(
          `questions step failed: 0 valid questions in model response (dropped ${dropped} of ${raw.length} candidates during strict validation)`
        );
      }
      return valid.slice(0, 8);
    }),
});

export type QuestionDraft = z.infer<typeof questionItemSchema>;

/** Which requirements feed each category call — behavioural reqs never share a call with technical ones. */
export function requirementsForCategory(
  requirements: Pick<IKitRequirement, "id" | "text" | "kind" | "priority">[],
  category: QuestionCategory
): typeof requirements {
  switch (category) {
    case "technical":
      return requirements.filter((r) => r.kind === "technical");
    case "behavioural":
      return requirements.filter((r) => r.kind === "behavioural");
    case "system-design":
      return requirements.filter((r) => r.kind === "technical" && r.priority === "must");
    case "company-fit": {
      const domain = requirements.filter((r) => r.kind === "domain");
      return domain.length > 0 ? domain.slice(0, 4) : requirements.slice(0, 4);
    }
  }
}

export function questionsPrompt(
  category: QuestionCategory,
  requirements: Pick<IKitRequirement, "id" | "text" | "kind" | "priority">[],
  context: { hiringNotes: string[]; companySummary: string; seniority: string }
): { system: string; user: string } {
  const reqList =
    requirements.map((r) => `- [${r.id}] (${r.kind}/${r.priority}) ${escapeUntrusted(r.text)}`).join("\n") || "(none)";
  return {
    system: PROMPTS.questions[category],
    user: [
      `<DATA requirements category="${category}">`,
      reqList,
      "</DATA>",
      `<DATA context seniority="${escapeUntrusted(context.seniority)}">`,
      `Company: ${escapeUntrusted(context.companySummary.slice(0, 800))}`,
      `Hiring process: ${escapeUntrusted(context.hiringNotes.join("; ").slice(0, 800)) || "(unknown)"}`,
      "</DATA>",
    ].join("\n"),
  };
}
