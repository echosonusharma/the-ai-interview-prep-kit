import { z } from "zod";
import type { IKitRequirement } from "../../types/kit.types.js";
import { PROMPTS } from "../prompts/index.js";

export const flashcardItemSchema = z.object({
  front: z.string().min(1),
  back: z.string().min(1),
  requirement_ids: z.array(z.string()).default([]),
});
export const flashcardListSchema = z.object({ flashcards: z.array(flashcardItemSchema).max(20) });

export type FlashcardDraft = z.infer<typeof flashcardItemSchema>;

export function flashcardsPrompt(
  requirements: Pick<IKitRequirement, "id" | "text" | "kind" | "priority">[],
  questionPrompts: string[]
): { system: string; user: string } {
  const reqList = requirements.slice(0, 12).map((r) => `- [${r.id}] ${r.text.slice(0, 120)}`).join("\n") || "(none)";
  return {
    system: PROMPTS.flashcards,
    user: [
      "<DATA requirements>",
      reqList,
      "</DATA>",
      "<DATA question_bank>",
      questionPrompts.slice(0, 12).map((q, i) => `${i + 1}. ${q.slice(0, 160)}`).join("\n") || "(none yet)",
      "</DATA>",
    ].join("\n"),
  };
}
