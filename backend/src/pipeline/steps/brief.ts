import { z } from "zod";
import { salvageJson } from "../llm/client.js";
import { PROMPTS } from "../prompts/index.js";
import type { DiscussionHit } from "../../crawler/types.js";

export type { DiscussionHit };

export const briefSchema = z.object({
  summary: z.string().trim().min(1).catch("Unknown from available sources."),
  what_they_do: z.string().trim().min(1).catch("Unknown from available sources."),
});

export type Brief = z.infer<typeof briefSchema>;

const UNKNOWN = "Unknown from available sources.";

/**
 * Neutralize `</TAG>` collisions so untrusted text can't break out of
 * `<DATA>...</DATA>` / `<PAGE>...</PAGE>` prompt framing. The zero-width
 * space keeps the text human-readable while breaking exact closing-tag matches.
 * (Duplicated per step file — steps never import from each other.)
 */
function escapeUntrusted(text: string): string {
  return text.replace(/<\//g, "<\u200b/");
}

/** Sanitized model-output excerpt for error messages: max 120 chars, no newlines/angle brackets. */
function briefErrorExcerpt(text: string): string {
  return text
    .replace(/[\r\n<>]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

const REASONING_OPENERS =
  /^(okay[,!]?|first[,!]?|let me|the user (provided|requires|wants)|i need to|i'll start|rules:|now,?\s*looking)/i;

/** True when the model emitted planning prose instead of labeled brief sections. */
export function looksLikeBriefReasoning(text: string): boolean {
  const t = text.trim();
  if (/^SUMMARY\s*:/im.test(t)) return false;
  if (REASONING_OPENERS.test(t)) return true;
  return /\b(let me start|i must start|reading through the provided)\b/i.test(t);
}

function hasBriefLabels(text: string): boolean {
  return /SUMMARY\s*:/i.test(text) && /WHAT_THEY_DO\s*:/i.test(text);
}

function inferWhatTheyDo(summary: string): string {
  const sentences = summary.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter((s) => s.length > 20);
  if (sentences.length >= 2) return sentences[sentences.length - 1]!;
  if (sentences.length === 1) return sentences[0]!;
  return UNKNOWN;
}

function parseLabeledBrief(cleaned: string): Brief | null {
  const start = cleaned.search(/SUMMARY\s*:/i);
  if (start === -1) return null;
  const slice = cleaned.slice(start);

  const whatLabel = slice.match(/\nWHAT_THEY_DO\s*:/i) ?? slice.match(/WHAT_THEY_DO\s*:/i);
  const whatIdx = whatLabel?.index ?? -1;

  const summaryBodyStart = slice.indexOf(":") + 1;
  let summary = "";
  let what_they_do = "";

  if (whatIdx !== -1) {
    summary = slice.slice(summaryBodyStart, whatIdx).trim();
    what_they_do = slice
      .slice(whatIdx)
      .replace(/^[\s\S]*?WHAT_THEY_DO\s*:/i, "")
      .trim();
  } else {
    // Truncated before WHAT_THEY_DO — salvage summary only
    const cut = slice.search(/\nWHAT_THE\b/i);
    summary = (cut === -1 ? slice.slice(summaryBodyStart) : slice.slice(summaryBodyStart, cut)).trim();
  }

  summary = summary.replace(/\s+/g, " ").trim();
  what_they_do = what_they_do.replace(/\s+/g, " ").trim();

  if (!summary || summary.length < 30) return null;

  if (!what_they_do || what_they_do.length < 15 || /^WHAT_THE/i.test(what_they_do)) {
    what_they_do = inferWhatTheyDo(summary);
  }

  return briefSchema.parse({
    summary: summary.slice(0, 600),
    what_they_do: what_they_do.slice(0, 400),
  });
}

/** Parse plain-text brief output (labeled sections, with JSON fallback). */
export function parseBriefText(text: string): Brief {
  const cleaned = text.trim();
  if (looksLikeBriefReasoning(cleaned)) {
    throw new Error(`brief:reasoning-only — no parseable brief in model response. Excerpt: "${briefErrorExcerpt(cleaned)}"`);
  }

  const labeled = parseLabeledBrief(cleaned);
  if (labeled) return labeled;

  try {
    const raw = salvageJson(cleaned);
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      const o = raw as Record<string, unknown>;
      if (typeof o.summary === "string" || typeof o.what_they_do === "string") {
        return briefSchema.parse({
          summary: typeof o.summary === "string" ? o.summary : UNKNOWN,
          what_they_do: typeof o.what_they_do === "string" ? o.what_they_do : UNKNOWN,
        });
      }
    }
  } catch {
    /* fall through */
  }

  if (hasBriefLabels(cleaned)) {
    const salvaged = parseLabeledBrief(cleaned);
    if (salvaged) return salvaged;
    throw new Error(`brief:incomplete-labels — no parseable brief in model response. Excerpt: "${briefErrorExcerpt(cleaned)}"`);
  }

  // SUMMARY without WHAT_THEY_DO label (truncated mid-response)
  if (/SUMMARY\s*:/i.test(cleaned)) {
    const salvaged = parseLabeledBrief(cleaned);
    if (salvaged) return salvaged;
  }

  throw new Error(`brief:unparseable — no parseable brief in model response. Excerpt: "${briefErrorExcerpt(cleaned)}"`);
}

export interface ResearchInput {
  pages: { url: string; title?: string; text: string }[];
  discussion: DiscussionHit[];
  hiringNotes: string[];
}

function truncateAtSentence(text: string, max: number): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const slice = t.slice(0, max);
  const lastPeriod = Math.max(slice.lastIndexOf(". "), slice.lastIndexOf("! "), slice.lastIndexOf("? "));
  if (lastPeriod > max * 0.5) return slice.slice(0, lastPeriod + 1).trim();
  return slice.trim();
}

function cleanPageForPrompt(text: string): string {
  return text
    .replace(/Your browser does not support the video tag\.?/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function briefPrompt(input: ResearchInput): { system: string; user: string } {
  const prioritized = [...input.pages].sort((a, b) => {
    const aBlog = /\/blog(\/|$)/i.test(a.url);
    const bBlog = /\/blog(\/|$)/i.test(b.url);
    if (aBlog !== bBlog) return aBlog ? 1 : -1;
    return 0;
  });
  const pageText = prioritized
    .slice(0, 4)
    .map((p, i) => {
      const cleaned = cleanPageForPrompt(p.text || "");
      return `<PAGE ${i + 1} url="${escapeUntrusted(p.url)}">\n${escapeUntrusted(truncateAtSentence(cleaned, 1200))}\n</PAGE>`;
    })
    .join("\n");

  const withBody = input.discussion.filter((d) => d.text?.trim());
  const snippetOnly = input.discussion.filter((d) => !d.text?.trim());
  const publicPages = withBody
    .slice(0, 3)
    .map((d, i) => `<PAGE ${i + 1} url="${escapeUntrusted(d.url)}">\n${escapeUntrusted(truncateAtSentence(cleanPageForPrompt(d.text!), 900))}\n</PAGE>`)
    .join("\n");
  const interviewReports = [...snippetOnly, ...withBody]
    .slice(0, 6)
    .map((d) => `- ${escapeUntrusted(d.title)} (${escapeUntrusted(d.url)}): ${escapeUntrusted(d.snippet.slice(0, 220))}`)
    .join("\n");
  const hiringCleaned = input.hiringNotes
    .map((n) => escapeUntrusted(truncateAtSentence(n.replace(/\s+/g, " ").trim(), 300)))
    .slice(0, 3)
    .join("\n");

  return {
    system: PROMPTS.brief,
    user: [
      "<DATA pages>",
      pageText || "(no pages retrieved)",
      "</DATA>",
      "<DATA public_pages>",
      publicPages || "(no public pages fetched)",
      "</DATA>",
      "<DATA interview_reports>",
      interviewReports || "(no interview/review reports found)",
      "</DATA>",
      `<DATA hiring_notes>\n${hiringCleaned || "(none)"}\n</DATA>`,
    ].join("\n"),
  };
}
