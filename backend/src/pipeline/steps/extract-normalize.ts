const KINDS = ["technical", "behavioural", "domain"] as const;
const PRIORITIES = ["must", "nice"] as const;
const SENIORITIES = ["senior", "junior", "lead", "mid", ""] as const;

export type ReqKind = (typeof KINDS)[number];
export type ReqPriority = (typeof PRIORITIES)[number];

export function normalizeKind(raw: unknown): ReqKind {
  const s = String(raw ?? "")
    .toLowerCase()
    .trim();
  if (!s || s === "string" || s.includes("|")) return "technical";
  if (s === "behavioral" || s === "behavioural" || /behav|soft|communicat|collaborat|leadership|stakeholder|mentor|culture|interpersonal/.test(s)) {
    return "behavioural";
  }
  if (/domain|industry|sector|vertical|fintech|health|retail|logistics|supply.?chain|3pl|warehouse/.test(s)) return "domain";
  if (KINDS.includes(s as ReqKind)) return s as ReqKind;
  return "technical";
}

export function normalizePriority(raw: unknown): ReqPriority {
  const s = String(raw ?? "")
    .toLowerCase()
    .trim();
  if (!s || s === "string" || s.includes("|")) return "must";
  if (/nice|prefer|bonus|optional|desired|plus/.test(s)) return "nice";
  if (PRIORITIES.includes(s as ReqPriority)) return s as ReqPriority;
  return "must";
}

export function normalizeSeniority(raw: unknown): string {
  const s = String(raw ?? "")
    .toLowerCase()
    .trim();
  if (SENIORITIES.includes(s as (typeof SENIORITIES)[number])) return s;
  if (/principal|staff|sr\.?|senior/.test(s)) return "senior";
  if (/junior|entry|jr\.?|graduate|intern/.test(s)) return "junior";
  if (/lead|manager|head/.test(s)) return "lead";
  if (/mid|intermediate|experienced/.test(s)) return "mid";
  return "";
}

function isPlaceholderRequirement(text: string): boolean {
  const t = text.trim();
  return t.length < 10 || t === "string" || t.endsWith("+") || /^example\b/i.test(t);
}

/** Coerce messy model output into a shape Zod can validate. */
export function normalizeExtractionInput(raw: unknown): unknown {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return raw;
  const src = raw as Record<string, unknown>;
  const out: Record<string, unknown> = { ...src };

  out.title = typeof src.title === "string" && src.title !== "string" ? src.title.trim() : "";
  out.seniority = normalizeSeniority(src.seniority);
  out.location = typeof src.location === "string" && src.location !== "string" ? src.location.trim() : "";
  out.responsibilities = Array.isArray(src.responsibilities)
    ? src.responsibilities
        .filter((r): r is string => typeof r === "string" && r.trim().length > 0 && r !== "string")
        .map((r) => r.trim())
        .slice(0, 6)
    : [];

  if (Array.isArray(src.requirements)) {
    out.requirements = src.requirements
      .filter((r): r is Record<string, unknown> => !!r && typeof r === "object" && !Array.isArray(r))
      .map((r) => ({
        text: String(r.text ?? "").trim(),
        kind: normalizeKind(r.kind),
        priority: normalizePriority(r.priority),
      }))
      .filter((r) => !isPlaceholderRequirement(r.text));
  } else {
    out.requirements = [];
  }

  return out;
}
