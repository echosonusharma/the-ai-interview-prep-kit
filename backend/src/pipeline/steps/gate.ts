import { z } from "zod";
import { PROMPTS } from "../prompts/index.js";

// errorCode() matches this prefix for VALIDATION_FAILED — keep stable.
export const GATE_REJECTION_PREFIX = "Input validation failed: ";

export function gateError(reason: string): Error {
  return new Error(`${GATE_REJECTION_PREFIX}${reason}`);
}

export const GATE_MIN_JD_CHARS = 500;
export const GATE_MAX_JD_CHARS = 5000;

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

// Tight patterns only — ambiguous cases go to the model verdict.
const STRONG_INJECTION = [
  /ignor(e|ing)\s+(all\s+)?(previous|prior|above|preceding)\s+(instructions?|prompts?|rules?)/i,
  /disregard\s+(all\s+)?(previous|prior|above|preceding).{0,30}(instructions?|rules?)/i,
  /reveal\s+(your|the)\s+(system|prompt|instructions?)/i,
  /forget\s+all\s+.{0,20}?instructions?/i,
  /jailbreak/i,
];

// Free pre-check. Returns a fail reason, or null when the input deserves the paid verdict.
export function deterministicGate(jd: string, _companyUrl: string): string | null {
  const normalized = jd.replace(/\s+/g, " ").trim();
  if (normalized.length < GATE_MIN_JD_CHARS) {
    return `Job description too short (${normalized.length} chars); paste the full posting (${GATE_MIN_JD_CHARS}+ characters).`;
  }
  if (normalized.length > GATE_MAX_JD_CHARS) {
    return `Job description too long (${normalized.length} chars); paste ${GATE_MAX_JD_CHARS} characters or fewer.`;
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
  reason: z.preprocess(
    (v) => (typeof v === "string" ? v : ""),
    z.string().transform((s) => s.trim().slice(0, 300))
  ),
});

export type GateVerdict = z.infer<typeof gateSchema>;

// Break `</TAG>` collisions so untrusted text can't escape `<DATA>` framing.
function escapeUntrusted(text: string): string {
  return text.replace(/<\//g, "<\u200b/");
}

export function gatePrompt(jd: string, companyUrl: string): { system: string; user: string } {
  // Head + tail so long preambles don't hide responsibilities from the model.
  const normalized = jd.replace(/\s+/g, " ").trim();
  const excerpt =
    normalized.length <= 2000
      ? normalized
      : `${normalized.slice(0, 1200)}\n…[truncated]…\n${normalized.slice(-800)}`;
  return {
    system: PROMPTS.gate,
    user: `<DATA jd>\n${escapeUntrusted(excerpt)}\n</DATA>\n<DATA company_url>\n${escapeUntrusted(companyUrl.slice(0, 500))}\n</DATA>`,
  };
}
