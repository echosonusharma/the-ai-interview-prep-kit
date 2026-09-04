import type { z } from "zod";

/** Extract balanced `{...}` spans; prefer the last one (models often append JSON after thinking). */
function allJsonObjects(text: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== "{") continue;
    let depth = 0;
    for (let j = i; j < text.length; j++) {
      if (text[j] === "{") depth++;
      else if (text[j] === "}") {
        depth--;
        if (depth === 0) {
          out.push(text.slice(i, j + 1));
          break;
        }
      }
    }
  }
  return out;
}

function tryParse(t: string): unknown | null {
  try {
    return JSON.parse(t.trim());
  } catch {
    return null;
  }
}

/**
 * Pull a JSON value out of free-form model text (fences, preamble, trailing
 * reasoning). Prefers `{...}` objects over `[...]` arrays. Throws when nothing parses.
 */
export function salvageJson(text: string): unknown {
  const trimmedWhole = text.trim();
  const whole = tryParse(trimmedWhole);
  if (whole !== null) {
    if (Array.isArray(whole) && trimmedWhole.startsWith("[")) return whole;
    if (typeof whole === "object" && trimmedWhole.startsWith("{")) return whole;
  }

  const candidates: string[] = [];

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/gi);
  if (fenced) {
    for (const block of fenced) {
      const inner = block.replace(/```(?:json)?/i, "").replace(/```$/, "").trim();
      if (inner) candidates.push(inner);
    }
  }

  for (const obj of allJsonObjects(text)) candidates.push(obj);

  // Prefer the first complete `{...}` in document order (handles Muse duplicating JSON;
  // thinking-only responses still yield a single trailing object).
  for (const obj of allJsonObjects(text)) {
    const v = tryParse(obj);
    if (v !== null && typeof v === "object" && !Array.isArray(v)) return v;
  }

  const trimmed = text.replace(/^\s*[\s\S]*?(?=\{|\[)/, "").trim() || text.trim();
  if (trimmed) candidates.push(trimmed);

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) candidates.push(trimmed.slice(firstBrace, lastBrace + 1));

  const seen = new Set<string>();
  const parsed: unknown[] = [];
  // Last complete object in the response is usually the actual answer.
  for (const c of [...candidates].reverse()) {
    const t = c.trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    const v = tryParse(t);
    if (v !== null) parsed.push(v);
  }

  const object = parsed.find((v) => v !== null && typeof v === "object" && !Array.isArray(v));
  if (object !== undefined) return object;

  const array = parsed.find((v) => Array.isArray(v));
  if (array !== undefined) return array;

  throw new Error("No parseable JSON in model response");
}

/** Fix common root-shape mistakes before Zod validation. */
export function coerceSalvagedRoot(raw: unknown): unknown {
  if (!Array.isArray(raw) || raw.length === 0) return raw;
  const first = raw[0];

  if (first && typeof first === "object" && !Array.isArray(first)) {
    const o = first as Record<string, unknown>;
    if ("requirements" in o || "title" in o || "seniority" in o || "responsibilities" in o) {
      return raw.length === 1 ? first : raw;
    }
  }
  if (typeof first === "string") return { responsibilities: raw };
  if (first && typeof first === "object" && "text" in first && ("kind" in first || "priority" in first)) {
    return { requirements: raw };
  }
  if (first && typeof first === "object" && "prompt" in first) {
    return { questions: raw };
  }
  if (first && typeof first === "object" && "front" in first && "back" in first) {
    return { flashcards: raw };
  }
  return raw;
}

/** Try every salvage strategy; returns parsed value or throws with the raw text attached. */
export function salvageJsonOrThrow(text: string): unknown {
  if (/thinking process|thought process|here's my thought/i.test(text) && !/\{[\s\S]*\}/.test(text)) {
    const preview = text.trim().slice(0, 400);
    throw new Error(`No parseable JSON in model response (thinking-only). Raw output:\n${preview}`);
  }
  try {
    return coerceSalvagedRoot(salvageJson(text));
  } catch {
    const preview = text.trim().slice(0, 1200) || "(empty response)";
    throw new Error(`No parseable JSON in model response. Raw output:\n${preview}`);
  }
}

/** Where a step's output came from — recorded on the kit job for transparency. */
export interface Provenance {
  provider: "zen" | "stub";
  model: string;
}

export interface ObjectPrompt {
  system: string;
  user: string;
  maxOutputTokens?: number;
}

export interface LlmClient {
  readonly provider: Provenance["provider"];
  /** Generate schema-validated JSON. Throws on failure (caller decides fallback). */
  generateObject<T>(prompt: ObjectPrompt, schema: z.ZodType<T>, model: string): Promise<{ object: T; model: string }>;
  /** Plain-text generation (brief and other prose steps). */
  generateText(prompt: ObjectPrompt, model: string): Promise<{ text: string; model: string }>;
}
