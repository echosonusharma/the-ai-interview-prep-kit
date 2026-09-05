import { z } from "zod";
import { crawlCompanySite, enrichPublicDiscussion } from "../../crawler/index.js";
import { kitCrawlerConfig } from "../../crawler/types.js";
import { env, getZenModelsForStep, leaseModels, leaseModelsForSteps } from "../../config/env.js";
import { LLM_TOKEN_LIMITS } from "../../config/llm-tokens.js";
import { validateKitAppendix, type KitAppendix } from "../../validators/kit.validator.js";
import { allocateSchedule } from "../schedule.js";
import { findUncovered, findUncoveredMusts } from "../coverage.js";
import { ZenClient } from "../llm/zen.js";
import { isRateLimitError } from "../retry.js";
import { runWithFallbacks, type Attempt } from "../llm/failover.js";
import type { LlmClient, Provenance } from "../llm/client.js";
import {
  metaSchema,
  requirementsSchema,
  extractMetaPrompt,
  extractRequirementsPrompt,
  type Extraction,
} from "./extract.js";
import { briefPrompt, parseBriefText, type ResearchInput } from "./brief.js";
import {
  questionListSchema,
  questionsPrompt,
  requirementsForCategory,
  cleanRequirementIds,
  categoryForRequirement,
  chunkGapBatch,
  dedupeDrafts,
  backstopDraftFor,
  type QuestionCategory,
  type QuestionDraft,
} from "./questions.js";
import { flashcardListSchema, flashcardsPrompt, type FlashcardDraft } from "./flashcards.js";
import { deterministicGate, gateError, gatePrompt, gateSchema } from "./gate.js";
import type { IKitRequirement } from "../../types/kit.types.js";

export interface GenerateKitInput {
  jd: string;
  companyUrl: string;
  days: number;
  onProgress?: (step: string, detail?: string) => void;
  /** LLM seam — defaults to Zen. Tests inject a stub; prod always uses Zen. */
  llm?: LlmClient;
  /** Skip DuckDuckGo + public page fetches (e2e / offline). */
  skipPublicSearch?: boolean;
  /** Cancels the run when the case timeout fires (threaded from kit.service). */
  signal?: AbortSignal;
}

export interface GenerateKitResult {
  kit: KitAppendix;
  provenance: Record<string, Provenance>;
  warnings: string[];
}

type Req = Pick<IKitRequirement, "id" | "text" | "kind" | "priority">;

/** Abort promptly instead of awaiting an orphaned crawl/LLM promise to completion. */
function throwIfAborted(signal: AbortSignal | undefined, label: string): void {
  if (signal?.aborted) throw new Error(`Kit generation aborted (${label})`);
}

/**
 * Race a promise against cancellation. Residual: rejection stops *waiting*,
 * but the underlying work can't be truly cancelled from here — crawl fetches
 * own their AbortController inside crawler/fetcher.ts and Zen calls use a
 * fixed 90s AbortSignal.timeout in pipeline/llm/zen.ts (read-only), so an
 * orphaned fetch/LLM call may run until its own timeout while we move on.
 */
function withSignal<T>(promise: Promise<T>, signal: AbortSignal | undefined, label: string): Promise<T> {
  if (!signal) return promise;
  if (signal.aborted) return Promise.reject(new Error(`Kit generation aborted (${label})`));
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(new Error(`Kit generation aborted (${label})`));
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(
      (v) => {
        signal.removeEventListener("abort", onAbort);
        resolve(v);
      },
      (e) => {
        signal.removeEventListener("abort", onAbort);
        reject(e);
      }
    );
  });
}

const CATEGORIES: QuestionCategory[] = ["technical", "behavioural", "system-design", "company-fit"];
// Two LLM gap passes, then a deterministic backstop for leftover musts.
// Bounded deliberately: free-tier rate limits + the 5-cases-in-15-min batch
// budget leave no room for unbounded retries; the backstop (zero LLM calls)
// guarantees must coverage instead of failing the case.
const MAX_PASSES = 2;

function shouldDisableModel(error: unknown): boolean {
  if (isRateLimitError(error)) return true;
  const msg = error instanceof Error ? error.message : String(error);
  return /unavailable|no parseable json|could not parse|invalid json|thinking-only|prose-only|reasoning-only|no parseable brief|empty model response|returned no requirements|400|endpoint is unavailable|model is unavailable|invalid input|invalid option/i.test(
    msg
  );
}

const HIRING_URL_HINTS = /career|job|hiring|interview|process|handbook|culture|values|how-we-hire|join|talent/i;

function companyNameFrom(hostname: string, title?: string): string {
  const hostOnly = hostname.replace(/^\[|\]$/g, "").split(":")[0].replace(/^www\./, "");
  const clean = (title ?? "").split(/[|–—-]/)[0].trim();
  if (clean && clean.length < 80 && !/^(careers|home|about|jobs|hiring)$/i.test(clean)) return clean;
  return hostOnly || hostname;
}


export async function generateKit(input: GenerateKitInput): Promise<GenerateKitResult> {
  const progress = input.onProgress ?? (() => {});
  const signal = input.signal;
  const days = Math.max(1, Math.min(60, Math.floor(input.days) || 1));
  const warnings: string[] = [];
  const provenance: Record<string, Provenance> = {};
  const zen = input.llm ?? new ZenClient();
  let llmCalls = 0;
  const llmBudget = env.LLM_MAX_CALLS_PER_KIT;

  const disabledModels = new Set<string>();
  const isDisabled = (m: string) => disabledModels.has(m);
  const markDisabled = (m: string) => disabledModels.add(m);

  const llmAttempts = <T>(
    step: string,
    prompt: { system: string; user: string },
    schema: z.ZodType<T>,
    maxOutputTokens?: number,
    preferredModel?: string
  ): Attempt<T>[] => {
    const attempts: Attempt<T>[] = [];
    const base = getZenModelsForStep(step);
    const models = preferredModel
      ? [preferredModel, ...base.filter((m) => m !== preferredModel)].slice(0, env.LLM_MAX_FALLBACKS)
      : base;
    for (const m of models) {
      if (isDisabled(m)) continue;
      attempts.push({
        provenance: { provider: zen.provider, model: m },
        retryable: true,
        run: async () => {
          try {
            const { object } = await zen.generateObject({ ...prompt, maxOutputTokens }, schema, m);
            return object;
          } catch (e) {
            if (shouldDisableModel(e)) markDisabled(m);
            throw e;
          }
        },
      });
    }
    return attempts;
  };

  const llmTextAttempts = <T>(
    step: string,
    prompt: { system: string; user: string },
    parse: (text: string) => T,
    maxOutputTokens?: number,
    preferredModel?: string
  ): Attempt<T>[] => {
    const attempts: Attempt<T>[] = [];
    const base = getZenModelsForStep(step);
    const models = preferredModel
      ? [preferredModel, ...base.filter((m) => m !== preferredModel)].slice(0, env.LLM_MAX_FALLBACKS)
      : base;
    for (const m of models) {
      if (isDisabled(m)) continue;
      attempts.push({
        provenance: { provider: zen.provider, model: m },
        retryable: true,
        run: async () => {
          try {
            const { text } = await zen.generateText({ ...prompt, maxOutputTokens }, m);
            return parse(text);
          } catch (e) {
            if (shouldDisableModel(e)) markDisabled(m);
            throw e;
          }
        },
      });
    }
    return attempts;
  };

  const llmRun = async <T>(step: string, attempts: Attempt<T>[]) => {
    if (llmCalls >= llmBudget) throw new Error(`LLM budget exhausted (${llmBudget} calls)`);
    // Budget counts attempts, not steps: every model try costs a call, so the
    // counter increments per failover attempt via onAttempt (failover.ts).
    return runWithFallbacks(step, attempts, {
      signal,
      onAttempt: () => {
        if (llmCalls >= llmBudget) throw new Error(`LLM budget exhausted (${llmBudget} calls)`);
        llmCalls += 1;
      },
    });
  };

  progress("gate", "validating input");
  throwIfAborted(signal, "gate");

  // Step 0: reject junk before spending crawl + LLM budget. Failures throw
  // with the gate prefix so runKitGeneration maps them to VALIDATION_FAILED.
  const gateFail = deterministicGate(input.jd, input.companyUrl);
  if (gateFail) {
    throw gateError(gateFail);
  }
  const [gateModel] = leaseModelsForSteps(["gate"], disabledModels);
  const gateRes = await withSignal(
    llmRun(
      "gate",
      llmAttempts("gate", gatePrompt(input.jd, input.companyUrl), gateSchema, LLM_TOKEN_LIMITS.GATE, gateModel)
    ),
    signal,
    "gate"
  );
  provenance.gate = gateRes.provenance;
  const verdict = gateRes.value;
  if (verdict.injection_detected) {
    throw gateError(
      `prompt-injection patterns detected in job description${verdict.reason ? ` (${verdict.reason})` : ""}`
    );
  }
  if (!verdict.is_job_posting) {
    throw gateError(
      `input doesn't read as a job posting${verdict.reason ? ` (${verdict.reason})` : ""}`
    );
  }
  if (!verdict.url_matches_jd) {
    warnings.push(
      `Company URL doesn't appear to match the job description${verdict.reason ? `: ${verdict.reason}` : "; kit generated from JD only."}`
    );
  }
  progress("gate:done", "input valid");

  progress("research", `crawling ${input.companyUrl}`);
  const crawlerCfg = kitCrawlerConfig(env.isProd);
  const host = (() => {
    try {
      return new URL(input.companyUrl).hostname;
    } catch {
      return input.companyUrl;
    }
  })();
  const hostLabel = companyNameFrom(host);

  const [crawl, discussion] = await withSignal(
    Promise.all([
      crawlCompanySite(input.companyUrl, crawlerCfg).catch((e) => {
        warnings.push(`Crawl failed: ${e instanceof Error ? e.message : e}`);
        return null;
      }),
      input.skipPublicSearch
        ? Promise.resolve({ query: hostLabel, results: [], warnings: [] as string[] })
        : enrichPublicDiscussion(hostLabel, input.companyUrl, crawlerCfg).catch((e) => ({
            query: hostLabel,
            results: [],
            warnings: [`Public discussion search failed: ${e instanceof Error ? e.message : e}`],
          })),
    ]),
    signal,
    "research"
  );

  if (crawl?.warnings?.length) warnings.push(...crawl.warnings);
  if (discussion.warnings.length) warnings.push(...discussion.warnings);

  const okPages = (crawl?.pages ?? [])
    .filter((p) => p.status === "success" && p.content)
    .map((p) => ({ url: p.url, title: p.title, text: p.content ?? "" }));

  if (!crawl || okPages.length === 0) warnings.push("Company site yielded no usable pages; brief will say so honestly.");
  const fetchedPublic = discussion.results.filter((r) => r.text?.trim()).length;
  if (discussion.results.length === 0) warnings.push("No public discussion of the interview process was found.");
  else if (fetchedPublic === 0) warnings.push("Public search returned snippets only; no review pages could be fetched.");
  progress("research:done", `${okPages.length} pages, ${discussion.results.length} reports (${fetchedPublic} fetched)`);

  const hiringNotes = okPages
    .filter((p) => HIRING_URL_HINTS.test(p.url) || HIRING_URL_HINTS.test(p.title ?? ""))
    .map((p) => `${p.url}: ${(p.text ?? "").replace(/\s+/g, " ").slice(0, 500)}`);
  const research: ResearchInput = {
    pages: okPages,
    discussion: discussion.results,
    hiringNotes,
  };
  const pagesUsed = okPages.map((p) => p.url);

  progress("extract", "role + requirements + brief");
  throwIfAborted(signal, "extract");
  const briefBuilt = briefPrompt(research);
  const [metaModel, reqsModel, briefModel] = leaseModelsForSteps(["extract", "extract", "brief"], disabledModels);
  const [metaRes, reqsRes, brief] = await withSignal(
    Promise.all([
      llmRun("extract:meta", llmAttempts("extract", extractMetaPrompt(input.jd), metaSchema, LLM_TOKEN_LIMITS.EXTRACT_META, metaModel)),
      llmRun("extract:reqs", llmAttempts("extract", extractRequirementsPrompt(input.jd), requirementsSchema, LLM_TOKEN_LIMITS.EXTRACT_REQS, reqsModel)),
      llmRun("brief", llmTextAttempts("brief", briefBuilt, parseBriefText, LLM_TOKEN_LIMITS.BRIEF, briefModel)),
    ]),
    signal,
    "extract"
  );
  provenance.brief = brief.provenance;
  provenance["extract:meta"] = metaRes.provenance;
  provenance["extract:reqs"] = reqsRes.provenance;
  provenance.extract = reqsRes.provenance;
  const extracted: Extraction = { ...metaRes.value, requirements: reqsRes.value.requirements };
  progress("extract:done", `${extracted.requirements.length} reqs via ${provenance.extract.provider}`);
  const requirements: Req[] = extracted.requirements.map((r, i) => ({ ...r, id: `r${i + 1}` }));
  if (requirements.length === 0) {
    const jdLen = input.jd.replace(/\s+/g, " ").trim().length;
    if (jdLen > 300) {
      throw new Error(`Extract returned no requirements from job description (${jdLen} chars)`);
    }
    warnings.push("Job description yielded almost no extractable requirements; kit is thin by design.");
  }

  const ctx = {
    hiringNotes,
    companySummary: `${brief.value.summary} ${brief.value.what_they_do}`.slice(0, 1000),
    seniority: extracted.seniority,
  };

  interface ScoredDraft extends QuestionDraft {
    category: QuestionCategory;
  }
  const drafts: ScoredDraft[] = [];
  const draftRefs = () => drafts.map((d, i) => ({ id: `tmp-${i}`, requirement_ids: d.requirement_ids }));
  const activeCategories = CATEGORIES.filter((category) => {
    if (requirements.length === 0) return false;
    const relevant = requirementsForCategory(requirements, category);
    return relevant.length > 0 || category === "company-fit";
  });
  progress("questions", activeCategories.join(", ") || "skipped");
  type QJob = { category: QuestionCategory; batch: Req[]; label: string };
  const qJobs: QJob[] = activeCategories.map((category) => {
    const relevant = requirementsForCategory(requirements, category);
    return {
      category,
      batch: relevant.length > 0 ? relevant : requirements.slice(0, 4),
      label: `questions:${category}`,
    };
  });
  const qModels = leaseModels(qJobs.length, disabledModels);
  // Flashcards run genuinely after questions (PROMPTS.md sequencing) so the
  // prompt carries the real question bank — never concurrently with an empty one.
  throwIfAborted(signal, "questions");
  const qResults = await withSignal(
    Promise.all(
      qJobs.map((job, i) => {
        const prompt = questionsPrompt(job.category, job.batch, ctx);
        return llmRun(job.label, llmAttempts(job.label, prompt, questionListSchema, LLM_TOKEN_LIMITS.QUESTIONS, qModels[i])).then((res) => ({
          job,
          res,
        }));
      })
    ),
    signal,
    "questions"
  );
  for (const { job, res } of qResults) {
    provenance[job.label] = res.provenance;
    for (const q of res.value.questions) {
      drafts.push({
        ...q,
        category: job.category,
        requirement_ids: cleanRequirementIds(q.requirement_ids, requirements),
      });
    }
  }
  if (requirements.length > 0) {
    const grounded = drafts.filter((d) => d.requirement_ids.length > 0);
    if (grounded.length !== drafts.length) warnings.push("Dropped questions with no valid requirement refs; coverage pass regenerates them.");
    drafts.splice(0, drafts.length, ...grounded);
  }
  {
    const before = drafts.length;
    const unique = dedupeDrafts(drafts);
    if (unique.length !== before) warnings.push(`Deduplicated ${before - unique.length} identical questions.`);
    drafts.splice(0, drafts.length, ...unique);
  }

  progress("questions:done", `${drafts.length} drafts`);
  let passes = 1;
  let uncovered = findUncovered(requirements, draftRefs());
  if (uncovered.length > 0) progress("coverage", `${uncovered.length} gaps found`);
  let gapAttempts = 0;
  while (uncovered.length > 0 && gapAttempts < MAX_PASSES) {
    gapAttempts += 1;
    passes += 1;
    const missing = requirements.filter((r) => uncovered.includes(r.id));
    // Bucket uncovered reqs by kind so refills keep
    // behavioural/technical/company-fit fidelity. Chunked: no refill call
    // ever carries more than the per-call question cap can cover.
    type GapJob = { category: QuestionCategory; batch: Req[]; label: string };
    const gapJobs: GapJob[] = (() => {
      const byCategory = new Map<QuestionCategory, Req[]>();
      for (const r of missing) {
        const category = categoryForRequirement(r);
        const list = byCategory.get(category);
        if (list) list.push(r);
        else byCategory.set(category, [r]);
      }
      // CATEGORIES order keeps refill deterministic across passes.
      const jobs: GapJob[] = [];
      for (const category of CATEGORIES.filter((c) => byCategory.has(c))) {
        const chunks = chunkGapBatch(byCategory.get(category)!);
        chunks.forEach((batch, i) => {
          jobs.push({
            category,
            batch,
            label: chunks.length > 1 ? `gap-pass-${gapAttempts}-${category}-${i + 1}` : `gap-pass-${gapAttempts}-${category}`,
          });
        });
      }
      return jobs;
    })();
    const gapModels = leaseModels(gapJobs.length, disabledModels);
    const gapResults = await withSignal(
      Promise.all(
        gapJobs.map((job, i) => {
          const gapPrompt = questionsPrompt(job.category, job.batch, ctx, { gap: true });
          return llmRun(job.label, llmAttempts(job.label, gapPrompt, questionListSchema, LLM_TOKEN_LIMITS.GAP_PASS, gapModels[i])).then((res) => ({
            job,
            res,
          }));
        })
      ),
      signal,
      `gap-pass-${gapAttempts}`
    );
    for (const { job, res } of gapResults) {
      provenance[job.label] = res.provenance;
      for (const q of res.value.questions) {
        drafts.push({
          ...q,
          category: job.category,
          requirement_ids: cleanRequirementIds(q.requirement_ids, requirements),
        });
      }
    }
    uncovered = findUncovered(requirements, draftRefs());
  }

  drafts.splice(0, drafts.length, ...dedupeDrafts(drafts));

  // Deterministic backstop: any must-have still uncovered after LLM passes
  // gets a grounded template question (zero LLM calls). Invents no new
  // skills — the prompt quotes the requirement text — so the kit ships with
  // full must coverage instead of failing the case (spec Sections 4, 9 FAQ).
  {
    const leftoverMusts = requirements.filter(
      (r) => r.priority === "must" && findUncovered(requirements, draftRefs()).includes(r.id)
    );
    for (const r of leftoverMusts) {
      drafts.push(backstopDraftFor(r, ctx.seniority));
    }
    if (leftoverMusts.length > 0) {
      warnings.push(
        `Coverage backstop wrote deterministic questions for uncovered must-haves: ${leftoverMusts.map((r) => r.id).join(", ")}; review recommended.`
      );
    }
  }

  const questions = drafts.map((d, i) => ({
    id: `q${i + 1}`,
    requirement_ids: d.requirement_ids,
    category: d.category,
    prompt: d.prompt,
    answer_outline: d.answer_outline,
    difficulty: d.difficulty,
  }));

  if (gapAttempts > 0) progress("coverage:done", `filled gaps in ${gapAttempts} pass(es)`);

  progress("flashcards", `${drafts.length} questions in bank`);
  throwIfAborted(signal, "flashcards");
  const fcBuilt = flashcardsPrompt(
    requirements,
    drafts.map((d) => d.prompt)
  );
  const fcModel = leaseModels(1, disabledModels)[0];
  const fc = await withSignal(
    llmRun("flashcards", llmAttempts("flashcards", fcBuilt, flashcardListSchema, LLM_TOKEN_LIMITS.FLASHCARDS, fcModel)),
    signal,
    "flashcards"
  );
  provenance.flashcards = fc.provenance;
  progress("flashcards:done", `${fc.value.flashcards.length} cards`);
  const flashcards = fc.value.flashcards
    .filter((f) => f.front.trim() && f.back.trim())
    .map((f, i) => ({
      id: `f${i + 1}`,
      front: f.front,
      back: f.back,
      requirement_ids: cleanRequirementIds(f.requirement_ids, requirements),
    }));

  progress("schedule", `${days}d, ${questions.length} qs`);
  const scheduleDays = allocateSchedule({ questions, requirements, daysAvailable: days });
  const finalUncovered = findUncovered(requirements, questions);
  const finalUncoveredMusts = findUncoveredMusts(requirements, questions);
  // Spec Section 4: uncovered must-haves = failed case — never ship a kit
  // that leaves a must-have requirement without a question.
  if (finalUncoveredMusts.length > 0) {
    throw new Error(
      `Coverage incomplete after ${passes} pass(es): must-have requirements with no question: ${finalUncoveredMusts.join(", ")}`
    );
  }
  progress("done", `${questions.length} qs, ${flashcards.length} cards, ${finalUncovered.length} gaps`);

  const kit: KitAppendix = {
    source: {
      company: companyNameFrom(host, okPages[0]?.title),
      company_url: input.companyUrl,
      role: extracted.title,
      location: extracted.location,
      jd_chars: input.jd.length,
      researched_at: new Date().toISOString(),
      pages_used: pagesUsed,
    },
    company_brief: {
      summary: brief.value.summary,
      what_they_do: brief.value.what_they_do,
      sources: pagesUsed.slice(0, 6),
    },
    role: {
      title: extracted.title,
      seniority: extracted.seniority,
      responsibilities: extracted.responsibilities,
      requirements: requirements.map((r) => ({ id: r.id, text: r.text, kind: r.kind, priority: r.priority })),
    },
    questions,
    flashcards,
    schedule: { days_available: days, days: scheduleDays },
    coverage: { uncovered_requirement_ids: finalUncovered, passes },
  };

  validateKitAppendix(kit);
  return { kit, provenance, warnings };
}
