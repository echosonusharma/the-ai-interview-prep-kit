import { z } from "zod";
import type { IKitRequirement } from "../../types/kit.types.js";
import { PROMPTS } from "../prompts/index.js";

export type QuestionCategory = "technical" | "behavioural" | "system-design" | "company-fit";

const difficultySchema = z.preprocess((v) => {
  const n = typeof v === "string" ? Number(v.trim()) : v;
  if (n === 1 || n === 2 || n === 3) return n;
  return 2;
}, z.union([z.literal(1), z.literal(2), z.literal(3)]));

const reqIdsSchema = z.preprocess((v) => {
  if (typeof v === "string") return [v.trim()].filter(Boolean);
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  return [];
}, z.array(z.string()).default([]));

export const questionItemSchema = z.object({
  prompt: z.preprocess((v) => String(v ?? "").trim(), z.string().min(1)),
  answer_outline: z.preprocess((v) => String(v ?? "").trim(), z.string().min(1)),
  difficulty: difficultySchema,
  requirement_ids: reqIdsSchema,
});

export const questionListSchema = z.object({
  questions: z
    .preprocess((v) => (Array.isArray(v) ? v : []), z.array(z.unknown()))
    .transform((raw) =>
      raw
        .map((item) => questionItemSchema.safeParse(item))
        .filter((r): r is z.ZodSafeParseSuccess<z.infer<typeof questionItemSchema>> => r.success)
        .map((r) => r.data)
        .slice(0, 8)
    ),
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
    requirements.map((r) => `- [${r.id}] (${r.kind}/${r.priority}) ${r.text}`).join("\n") || "(none)";
  return {
    system: PROMPTS.questions[category],
    user: [
      `<DATA requirements category="${category}">`,
      reqList,
      "</DATA>",
      `<DATA context seniority="${context.seniority}">`,
      `Company: ${context.companySummary.slice(0, 800)}`,
      `Hiring process: ${context.hiringNotes.join("; ").slice(0, 800) || "(unknown)"}`,
      "</DATA>",
    ].join("\n"),
  };
}
