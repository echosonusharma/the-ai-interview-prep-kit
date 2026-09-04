import { z } from "zod";
import { PROMPTS } from "../prompts/index.js";
import { normalizeExtractionInput } from "./extract-normalize.js";

const KIND = z.enum(["technical", "behavioural", "domain"]);
const PRIORITY = z.enum(["must", "nice"]);

export const metaSchema = z.object({
  title: z.string().optional().default(""),
  seniority: z.string().optional().default(""),
  location: z.string().optional().default(""),
  responsibilities: z.array(z.string()).optional().default([]),
});

const requirementsBaseSchema = z.object({
  requirements: z.array(z.object({ text: z.string().min(1), kind: KIND, priority: PRIORITY })).optional().default([]),
});

export const requirementsSchema = z.preprocess(
  (raw) => normalizeExtractionInput(typeof raw === "object" && raw && !Array.isArray(raw) ? raw : { requirements: [] }),
  requirementsBaseSchema
);

const extractionBaseSchema = metaSchema.merge(requirementsBaseSchema);
export const extractionSchema = z.preprocess(normalizeExtractionInput, extractionBaseSchema);
export type Extraction = z.infer<typeof extractionSchema>;
export type Meta = z.infer<typeof metaSchema>;
export type RequirementsOnly = z.infer<typeof requirementsSchema>;

/**
 * Neutralize `</TAG>` collisions so untrusted text can't break out of
 * `<DATA>...</DATA>` prompt framing. The zero-width space keeps the text
 * human-readable while breaking exact closing-tag matches.
 * (Duplicated per step file — steps never import from each other.)
 */
function escapeUntrusted(text: string): string {
  return text.replace(/<\//g, "<\u200b/");
}

export function extractMetaPrompt(jd: string): { system: string; user: string } {
  return { system: PROMPTS.extractMeta, user: `<DATA jd>\n${escapeUntrusted(jd.slice(0, 6000))}\n</DATA>` };
}

export function extractRequirementsPrompt(jd: string): { system: string; user: string } {
  return { system: PROMPTS.extractReqs, user: `<DATA jd>\n${escapeUntrusted(jd.slice(0, 6000))}\n</DATA>` };
}
