/** Per-step maxOutputTokens for Zen LLM calls. Tune here only. */
export const LLM_TOKEN_LIMITS = {
  /** Fallback when a step omits maxOutputTokens. */
  DEFAULT: 3_000,
  BRIEF: 4_000,
  EXTRACT_META: 3_000,
  EXTRACT_REQS: 6_000,
  QUESTIONS: 3_000,
  GAP_PASS: 2_500,
  FLASHCARDS: 2_000,
  /** Muse Responses API — reasoning can consume most of the budget. */
  MUSE_MIN: 12_000,
} as const;
