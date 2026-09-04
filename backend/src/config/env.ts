import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

/** Muse Spark — reliable structured JSON (Responses API). */
export const JSON_MODELS = [
  "muse-spark-1.3-contributor-free",
  "muse-spark-1.2-contributor-free",
] as const;

/** Chat models — good at prose; poor at JSON. Used for brief (plain text). */
export const TEXT_MODELS = ["mimo-v2.5-free", "big-pickle", "nemotron-3-ultra-free"] as const;

/** In catalog but never auto-selected — thinking prose or rate limits. */
const AVOID_MODELS = new Set(["nemotron-3.5-lightning-free", "ling-3.0-flash-fin-free"]);

const DEFAULT_ZEN_MODELS = [...JSON_MODELS, ...TEXT_MODELS, ...AVOID_MODELS].join(",");

const DEV_SESSION_SECRETS = new Set([
  "dev-secret-change-in-production",
  "dev-secret-change-in-production-min-16-chars",
]);

const nonEmptyString = (fallback: string) =>
  z
    .string()
    .default(fallback)
    .transform((v) => (v.trim() === "" ? fallback : v.trim()));

const schema = z
  .object({
    PORT: z.coerce.number().int().min(1).max(65535).default(5000),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    FRONTEND_URL: z.string().url().optional(),
    MONGODB_URI: z.string().min(1).default("mongodb://localhost:27017/preppilot"),
    SESSION_SECRET: z.string().min(16).default("dev-secret-change-in-production"),

    OPENCODE_API_KEY: nonEmptyString("public"),
    OPENCODE_PROJECT_ID: nonEmptyString("global"),
    OPENCODE_USER_AGENT: nonEmptyString(
      "opencode/1.18.27 ai-sdk/provider-utils/4.0.38 runtime/bun/1.3.14"
    ),

    LLM_ZEN_MODELS: nonEmptyString(DEFAULT_ZEN_MODELS),
    LLM_MAX_CALLS_PER_KIT: z.coerce.number().int().min(1).max(80).default(20),
    LLM_MAX_CONCURRENT: z.coerce.number().int().min(1).max(8).default(4),
    LLM_MAX_FALLBACKS: z.coerce.number().int().min(1).max(6).default(4),
    LLM_DEBUG_RAW: z
      .string()
      .optional()
      .transform((v) => v === "1" || v === "true"),
    BATCH_CONCURRENCY: z.coerce.number().int().min(1).max(5).default(2),
    CASE_TIMEOUT_MS: z.coerce.number().int().min(60_000).max(900_000).default(240_000),
  })
  .refine(
    (data) =>
      data.NODE_ENV !== "production" ||
      (!DEV_SESSION_SECRETS.has(data.SESSION_SECRET) && data.SESSION_SECRET.length >= 32),
    {
      message: "Set SESSION_SECRET to a strong random value (32+ chars) in production",
      path: ["SESSION_SECRET"],
    }
  );

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment variables");
}

export const env = {
  PORT: parsed.data.PORT,
  NODE_ENV: parsed.data.NODE_ENV,
  FRONTEND_URL: parsed.data.FRONTEND_URL,
  MONGODB_URI: parsed.data.MONGODB_URI,
  SESSION_SECRET: parsed.data.SESSION_SECRET,
  isProd: parsed.data.NODE_ENV === "production",
  OPENCODE_API_KEY: parsed.data.OPENCODE_API_KEY,
  OPENCODE_PROJECT_ID: parsed.data.OPENCODE_PROJECT_ID,
  OPENCODE_USER_AGENT: parsed.data.OPENCODE_USER_AGENT,
  LLM_ZEN_MODELS: parsed.data.LLM_ZEN_MODELS,
  LLM_MAX_CALLS_PER_KIT: parsed.data.LLM_MAX_CALLS_PER_KIT,
  LLM_MAX_CONCURRENT: parsed.data.LLM_MAX_CONCURRENT,
  LLM_MAX_FALLBACKS: parsed.data.LLM_MAX_FALLBACKS,
  LLM_DEBUG_RAW: parsed.data.LLM_DEBUG_RAW ?? false,
  BATCH_CONCURRENCY: parsed.data.BATCH_CONCURRENCY,
  CASE_TIMEOUT_MS: parsed.data.CASE_TIMEOUT_MS,
};

export function getZenModels(): string[] {
  return env.LLM_ZEN_MODELS.split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function usableModels(): string[] {
  return getZenModels().filter((m) => !AVOID_MODELS.has(m));
}

export function getZenModelsForStep(step: string): string[] {
  const all = usableModels();
  const tier: readonly string[] = /^brief$/i.test(step) ? [...TEXT_MODELS, ...JSON_MODELS] : JSON_MODELS;
  const ordered = [...tier, ...all].filter((m, i, a) => all.includes(m) && a.indexOf(m) === i);
  return ordered.slice(0, env.LLM_MAX_FALLBACKS);
}

let modelLease = 0;

const DEFAULT_JSON_MODEL = JSON_MODELS[0];
const DEFAULT_TEXT_MODEL = TEXT_MODELS[0];

/** Pick distinct preferred models for labeled pipeline steps (respects JSON vs text tiers). */
export function leaseModelsForSteps(steps: string[], skip: Set<string> = new Set()): string[] {
  const used = new Set<string>();
  return steps.map((step) => {
    const pool = getZenModelsForStep(step).filter((m) => !skip.has(m) && !used.has(m));
    const fallback = /^brief$/i.test(step) ? DEFAULT_TEXT_MODEL : DEFAULT_JSON_MODEL;
    const pick = pool[0] ?? usableModels().find((m) => !skip.has(m) && !used.has(m)) ?? fallback;
    used.add(pick);
    return pick;
  });
}

/** Hand out distinct models for parallel legs (round-robin across JSON-capable pool). */
export function leaseModels(count: number, skip: Set<string> = new Set()): string[] {
  const pool = usableModels().filter(
    (m) =>
      JSON_MODELS.includes(m as (typeof JSON_MODELS)[number]) ||
      !TEXT_MODELS.includes(m as (typeof TEXT_MODELS)[number])
  );
  const jsonPool = pool.filter((m) => JSON_MODELS.includes(m as (typeof JSON_MODELS)[number]));
  const effective = jsonPool.length > 0 ? jsonPool : pool;
  if (effective.length === 0) return Array.from({ length: count }, () => DEFAULT_JSON_MODEL);
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    out.push(effective[(modelLease + i) % effective.length]);
  }
  modelLease += count;
  return out;
}

export function describeProviders(): string {
  return `Zen:${usableModels().join(",") || "(none)"} (fail on exhaustion)`;
}
