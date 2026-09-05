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
  context: { hiringNotes: string[]; companySummary: string; seniority: string },
  opts?: { gap?: boolean }
): { system: string; user: string } {
  const reqList =
    requirements.map((r) => `- [${r.id}] (${r.kind}/${r.priority}) ${escapeUntrusted(r.text)}`).join("\n") || "(none)";
  const lines = [
    `<DATA requirements category="${category}">`,
    reqList,
    "</DATA>",
    `<DATA context seniority="${escapeUntrusted(context.seniority)}">`,
    `Company: ${escapeUntrusted(context.companySummary.slice(0, 800))}`,
    `Hiring process: ${escapeUntrusted(context.hiringNotes.join("; ").slice(0, 800)) || "(unknown)"}`,
    "</DATA>",
  ];
  if (opts?.gap) {
    lines.push(
      `COVERAGE GAP PASS: every requirement above currently has zero questions. You MUST return exactly one question per listed requirement id — cover ALL of them, skip none. Do not repeat ids already covered elsewhere; only the ids listed above count.`
    );
  }
  return {
    system: PROMPTS.questions[category],
    user: lines.join("\n"),
  };
}

/** Canonicalize a model-returned id (` R1 ` → `r1`) and keep it only when it matches a known requirement. */
export function cleanRequirementIds(
  ids: unknown,
  requirements: Pick<IKitRequirement, "id">[]
): string[] {
  if (!Array.isArray(ids)) return [];
  const known = new Map(requirements.map((r) => [r.id.toLowerCase(), r.id]));
  const out: string[] = [];
  for (const raw of ids) {
    if (typeof raw !== "string") continue;
    const canonical = known.get(raw.trim().toLowerCase());
    if (canonical && !out.includes(canonical)) out.push(canonical);
  }
  return out;
}

/** Gap + backstop owner for an uncovered requirement — kind decides, never the caller's convenience. */
export function categoryForRequirement(
  r: Pick<IKitRequirement, "kind" | "priority">
): QuestionCategory {
  if (r.kind === "behavioural") return "behavioural";
  if (r.kind === "domain") return "company-fit";
  return "technical";
}

/** Split a gap batch so every refill call fits the per-call question cap with headroom. */
export function chunkGapBatch<T>(batch: T[], size = 6): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < batch.length; i += size) chunks.push(batch.slice(i, i + size));
  return chunks;
}

/** Merge duplicate prompts (case-insensitive) by unioning their requirement refs instead of dropping them. */
export function dedupeDrafts<T extends { prompt: string; requirement_ids: string[] }>(drafts: T[]): T[] {
  const seen = new Map<string, T>();
  for (const d of drafts) {
    const key = d.prompt.trim().toLowerCase();
    const kept = seen.get(key);
    if (!kept) {
      seen.set(key, d);
      continue;
    }
    for (const id of d.requirement_ids) {
      if (!kept.requirement_ids.includes(id)) kept.requirement_ids.push(id);
    }
  }
  return [...seen.values()];
}

/**
 * Deterministic last-resort question for a must-have requirement the model
 * left uncovered. Grounded in the requirement text verbatim — invents no new
 * skills — so a kit always ships with every must covered (spec Section 4)
 * instead of failing the whole case.
 */
export function backstopDraftFor(
  r: Pick<IKitRequirement, "id" | "text" | "kind" | "priority">,
  seniority: string
): QuestionDraft & { category: QuestionCategory } {
  const category = categoryForRequirement(r);
  const text = r.text.trim();
  const senior = /senior|lead|staff|principal/i.test(seniority ?? "");
  if (category === "behavioural") {
    return {
      category,
      prompt: `Tell me about a time you demonstrated strength in this area: ${text}. What was the situation, what did you do, and what was the outcome?`,
      answer_outline: `Situation and task you faced; Actions you took and why; Outcome and what you would repeat`,
      difficulty: 2,
      requirement_ids: [r.id],
    };
  }
  if (category === "company-fit") {
    return {
      category,
      prompt: `This role emphasizes: ${text}. How would you speak to your fit and interest in that aspect of the work?`,
      answer_outline: `Why this aspect matters for the role; Relevant experience you would cite; What you would want to learn first`,
      difficulty: 1,
      requirement_ids: [r.id],
    };
  }
  return {
    category,
    prompt: `Walk through how you would handle this requirement in production: ${text}. Cover your approach, key decisions, and trade-offs.`,
    answer_outline: `Approach and key decisions; Trade-offs you would weigh; How you would validate the outcome in production`,
    difficulty: senior ? 3 : 2,
    requirement_ids: [r.id],
  };
}
