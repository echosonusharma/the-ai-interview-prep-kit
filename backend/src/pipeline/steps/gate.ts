import { z } from "zod";
import { PROMPTS } from "../prompts/index.js";

/** Minimum JD length the gate accepts — mirrors the "50+ chars" UI hint. */
export const GATE_MIN_JD_CHARS = 50;

/** Minimum distinct job-signal hits for the JD to read as a posting. */
const MIN_JOB_SIGNALS = 2;

const JOB_SIGNALS = [
  /responsib/i,
  /require/i,
  /qualif/i,
  /experienc/i,
  /skill/i,
  /salary|compensat|pay range|pay:/i,
  /benefits/i,
  /apply|application/i,
  /hiring|seeking|looking for/i,
  /full-?time|part-?time|contract|remote|hybrid|on-?site/i,
  /bachelor|master'?s|degree|\byears?\b/i,
  /interview/i,
  /\bteam\b/i,
  /\brole\b|\bposition\b/i,
  /\bduties\b/i,
  /must have|nice-?to-?have|\bplus\b/i,
];

// Hard-fail without spending an LLM call. Tight patterns only — ambiguous
// cases go to the model verdict, which can weigh context.
const STRONG_INJECTION = [
  /ignor(e|ing)\s+(all\s+)?(previous|prior|above|preceding)\s+(instructions?|prompts?|rules?)/i,
  /disregard\s+(all\s+)?(previous|prior|above|preceding).{0,30}(instructions?|rules?)/i,
  /reveal\s+(your|the)\s+(system|prompt|instructions?)/i,
  /forget\s+all\s+. {0,20}instructions?/i,
  /jailbreak/i,
];

/**
 * Free deterministic pre-check. Returns a user-facing fail reason, or null
 * when the input deserves the (paid) model verdict.
 */
export function deterministicGate(jd: string, _companyUrl: string): string | null {
  const normalized = jd.replace(/\s+/g, " ").trim();
  if (normalized.length < GATE_MIN_JD_CHARS) {
    return `Job description too short (${normalized.length} chars); paste the full posting (50+ characters).`;
  }
  if (STRONG_INJECTION.some((re) => re.test(normalized))) {
    return "Job description contains prompt-injection patterns; remove instructions aimed at the AI and resubmit the raw posting.";
  }
  const signals = JOB_SIGNALS.filter((re) => re.test(normalized)).length;
  if (signals < MIN_JOB_SIGNALS) {
    return "Input doesn't read as a job posting (no responsibilities, requirements, or hiring details found).";
  }
  return null;
}

export const gateSchema = z.object({
  is_job_posting: z.boolean(),
  url_matches_jd: z.boolean(),
  injection_detected: z.boolean(),
  reason: z.string().trim().max(300).default(""),
});

export type GateVerdict = z.infer<typeof gateSchema>;

/**
 * Neutralize `</TAG>` collisions so untrusted text can't break out of
 * `<DATA>...</DATA>` prompt framing. The zero-width space keeps the text
 * human-readable while breaking exact closing-tag matches.
 * (Duplicated per step file — steps never import from each other.)
 */
function escapeUntrusted(text: string): string {
  return text.replace(/<\//g, "<\u200b/");
}

export function gatePrompt(jd: string, companyUrl: string): { system: string; user: string } {
  return {
    system: PROMPTS.gate,
    user: `<DATA jd>\n${escapeUntrusted(jd.slice(0, 2000))}\n</DATA>\n<DATA company_url>\n${escapeUntrusted(companyUrl.slice(0, 500))}\n</DATA>`,
  };
}
