import { z } from "zod";
import { crawlCompanySite, enrichPublicDiscussion } from "../../crawler/index.js";
import { kitCrawlerConfig } from "../../crawler/types.js";
import { env, getZenModelsForStep, leaseModels } from "../../config/env.js";
import { LLM_TOKEN_LIMITS } from "../../config/llm-tokens.js";
import { allocateSchedule } from "../../pipeline/schedule.js";
import type { IKit, IKitQuestion } from "../../types/kit.types.js";
import { ZenClient } from "../../pipeline/llm/zen.js";
import { runWithFallbacks, type Attempt } from "../../pipeline/llm/failover.js";
import { briefPrompt, parseBriefText } from "../../pipeline/steps/brief.js";
import {
  questionListSchema,
  questionsPrompt,
  requirementsForCategory,
  type QuestionCategory,
} from "../../pipeline/steps/questions.js";
import { assertKitEditable, recomputeUncovered, saveKit } from "./kit-builder.utils.js";

const REGEN_SECTIONS = ["brief", "technical", "behavioural", "system-design", "company-fit", "schedule"] as const;
export type RegenSection = (typeof REGEN_SECTIONS)[number];

export function isRegenSection(s: string): s is RegenSection {
  return (REGEN_SECTIONS as readonly string[]).includes(s);
}

function companyNameFrom(hostname: string, title?: string): string {
  const hostOnly = hostname.replace(/^\[|\]$/g, "").split(":")[0].replace(/^www\./, "");
  const clean = (title ?? "").split(/[|–—-]/)[0].trim();
  if (clean && clean.length < 80 && !/^(careers|home|about|jobs|hiring)$/i.test(clean)) return clean;
  return hostOnly || hostname;
}

async function llmRun<T>(step: string, attempts: Attempt<T>[]) {
  return runWithFallbacks(step, attempts);
}

function llmAttempts<T>(
  zen: ZenClient,
  step: string,
  prompt: { system: string; user: string },
  schema: z.ZodType<T>,
  maxOutputTokens?: number,
  preferredModel?: string
): Attempt<T>[] {
  const attempts: Attempt<T>[] = [];
  const base = getZenModelsForStep(step);
  const models = preferredModel
    ? [preferredModel, ...base.filter((m) => m !== preferredModel)].slice(0, env.LLM_MAX_FALLBACKS)
    : base;
  for (const m of models) {
    attempts.push({
      provenance: { provider: zen.provider, model: m },
      retryable: true,
      run: async () => {
        const { object } = await zen.generateObject({ ...prompt, maxOutputTokens }, schema, m);
        return object;
      },
    });
  }
  return attempts;
}

function llmTextAttempts<T>(
  zen: ZenClient,
  step: string,
  prompt: { system: string; user: string },
  parse: (text: string) => T,
  maxOutputTokens?: number,
  preferredModel?: string
): Attempt<T>[] {
  const attempts: Attempt<T>[] = [];
  const base = getZenModelsForStep(step);
  const models = preferredModel
    ? [preferredModel, ...base.filter((m) => m !== preferredModel)].slice(0, env.LLM_MAX_FALLBACKS)
    : base;
  for (const m of models) {
    attempts.push({
      provenance: { provider: zen.provider, model: m },
      retryable: true,
      run: async () => {
        const { text } = await zen.generateText({ ...prompt, maxOutputTokens }, m);
        return parse(text);
      },
    });
  }
  return attempts;
}

function nextId(prefix: "q" | "f", existing: string[]): string {
  const nums = existing.map((id) => parseInt(id.replace(/^\D+/, ""), 10)).filter((n) => !Number.isNaN(n));
  return `${prefix}${(nums.length ? Math.max(...nums) : 0) + 1}`;
}

const MAX_MINUTES_PER_DAY = 8 * 60;

function minutesForDifficulty(difficulty: 1 | 2 | 3): number {
  return difficulty === 1 ? 30 : difficulty === 2 ? 45 : 60;
}

/**
 * Place replacement question ids into the existing days round-robin without
 * exceeding the daily minutes budget; overflow spills onto the emptiest day.
 */
function scheduleNewQuestions(kit: IKit, newQs: IKitQuestion[]) {
  if (kit.schedule.days.length === 0) return;
  let cursor = 0;
  for (const q of newQs) {
    const cost = minutesForDifficulty(q.difficulty);
    let placed = false;
    for (let attempt = 0; attempt < kit.schedule.days.length; attempt++) {
      const day = kit.schedule.days[(cursor + attempt) % kit.schedule.days.length];
      if (day && day.minutes + cost <= MAX_MINUTES_PER_DAY) {
        day.question_ids.push(q.id);
        day.minutes += cost;
        cursor = (cursor + attempt + 1) % kit.schedule.days.length;
        placed = true;
        break;
      }
    }
    if (!placed) {
      let target = kit.schedule.days[0];
      for (const day of kit.schedule.days) {
        if (target && day.minutes < target.minutes) target = day;
      }
      if (target) {
        target.question_ids.push(q.id);
        target.minutes = Math.min(MAX_MINUTES_PER_DAY, target.minutes + cost);
      }
    }
  }
}

export async function regenerateSection(kit: IKit, section: RegenSection): Promise<IKit> {
  assertKitEditable(kit);
  const zen = new ZenClient();
  const requirements = kit.role.requirements;
  const host = (() => {
    try {
      return new URL(kit.input.companyUrl).hostname;
    } catch {
      return kit.input.companyUrl;
    }
  })();

  if (section === "brief") {
    if (kit.company_brief._meta?.pinned) {
      const err = new Error("Brief is pinned; unpin before regenerating") as Error & { statusCode?: number };
      err.statusCode = 409;
      throw err;
    }
    const crawlerCfg = kitCrawlerConfig(env.isProd);
    const hostLabel = companyNameFrom(host);
    const [crawl, discussion] = await Promise.all([
      crawlCompanySite(kit.input.companyUrl, crawlerCfg),
      enrichPublicDiscussion(hostLabel, kit.input.companyUrl, crawlerCfg),
    ]);
    const okPages = crawl.pages
      .filter((p) => p.status === "success" && p.content)
      .map((p) => ({ url: p.url, title: p.title, text: p.content ?? "" }));
    const hiringNotes = okPages
      .filter((p) => /career|job|hiring|interview|process|handbook|culture|values/i.test(p.url + (p.title ?? "")))
      .map((p) => `${p.url}: ${(p.text ?? "").replace(/\s+/g, " ").slice(0, 500)}`);
    const briefBuilt = briefPrompt({
      pages: okPages,
      discussion: discussion.results,
      hiringNotes,
    });
    const briefModel = leaseModels(1)[0];
    const brief = await llmRun(
      "brief",
      llmTextAttempts(zen, "brief", briefBuilt, parseBriefText, LLM_TOKEN_LIMITS.BRIEF, briefModel)
    );
    kit.company_brief.summary = brief.value.summary;
    kit.company_brief.what_they_do = brief.value.what_they_do;
    kit.company_brief.sources = okPages.map((p) => p.url).slice(0, 6);
    kit.source.pages_used = okPages.map((p) => p.url);
    kit.source.researched_at = new Date().toISOString();
    kit.company_brief._meta = { pinned: false, editedAt: new Date() };
    return saveKit(kit);
  }

  if (section === "schedule") {
    if (kit.schedule._meta?.pinned) {
      const err = new Error("Schedule is pinned; unpin before regenerating") as Error & { statusCode?: number };
      err.statusCode = 409;
      throw err;
    }
    const questions = kit.questions.map((q) => ({
      id: q.id,
      requirement_ids: q.requirement_ids,
      category: q.category,
      prompt: q.prompt,
      answer_outline: q.answer_outline,
      difficulty: q.difficulty,
    }));
    const days = allocateSchedule({
      questions,
      requirements,
      daysAvailable: kit.schedule.days_available,
    });
    kit.schedule.days = days;
    kit.schedule._meta = { pinned: false, editedAt: new Date() };
    return saveKit(kit);
  }

  // Question category regen
  // Question category regen — keep pinned, replace generated
  const category = section as QuestionCategory;
  const removedIds = kit.questions
    .filter((q) => q.category === category && !q._state?.pinned)
    .map((q) => q.id);
  kit.questions = kit.questions.filter((q) => !removedIds.includes(q.id));
  for (const day of kit.schedule.days) {
    day.question_ids = day.question_ids.filter((id) => !removedIds.includes(id));
  }

  const relevant = requirementsForCategory(requirements, category);
  const batch = relevant.length > 0 ? relevant : requirements.slice(0, 4);
  const ctx = {
    hiringNotes: [],
    companySummary: `${kit.company_brief.summary} ${kit.company_brief.what_they_do}`.slice(0, 1000),
    seniority: kit.role.seniority,
  };
  const prompt = questionsPrompt(category, batch, ctx);
  const model = leaseModels(1)[0];
  const res = await llmRun(
    `questions:${category}`,
    llmAttempts(zen, `questions:${category}`, prompt, questionListSchema, LLM_TOKEN_LIMITS.QUESTIONS, model)
  );

  const reqIds = new Set(requirements.map((r) => r.id));
  const allIds = kit.questions.map((x) => x.id);

  // Link each draft to known requirements. Drafts that link to nothing are
  // retried once with a fresh LLM call, then dropped and counted.
  const toLinkedQuestion = (q: {
    prompt: string;
    answer_outline: string;
    difficulty: 1 | 2 | 3;
    requirement_ids: string[];
  }): IKitQuestion | null => {
    const linkedIds = q.requirement_ids.filter((id) => reqIds.has(id));
    if (linkedIds.length === 0) return null;
    const id = nextId("q", allIds);
    allIds.push(id);
    return {
      id,
      prompt: q.prompt,
      answer_outline: q.answer_outline,
      difficulty: q.difficulty,
      category,
      requirement_ids: linkedIds,
      _state: { origin: "generated", pinned: false },
    };
  };

  const newQs: IKitQuestion[] = [];
  let droppedUnlinked = 0;
  for (const q of res.value.questions) {
    const built = toLinkedQuestion(q);
    if (built) newQs.push(built);
    else droppedUnlinked += 1;
  }
  if (droppedUnlinked > 0) {
    const retry = await llmRun(
      `questions:${category}`,
      llmAttempts(zen, `questions:${category}`, prompt, questionListSchema, LLM_TOKEN_LIMITS.QUESTIONS, model)
    );
    for (const q of retry.value.questions) {
      const built = toLinkedQuestion(q);
      if (built) newQs.push(built);
      else droppedUnlinked += 1;
    }
  }
  // droppedUnlinked counts replacement drafts discarded for linking to no
  // known requirement, after the single retry above.

  kit.questions.push(...newQs);
  if (newQs.length > 0) {
    if (kit.schedule.days.length === 0) {
      const questions = kit.questions.map((q) => ({
        id: q.id,
        requirement_ids: q.requirement_ids,
        category: q.category,
        prompt: q.prompt,
        answer_outline: q.answer_outline,
        difficulty: q.difficulty,
      }));
      kit.schedule.days = allocateSchedule({
        questions,
        requirements,
        daysAvailable: kit.schedule.days_available,
      });
    } else {
      scheduleNewQuestions(kit, newQs);
    }
  }
  recomputeUncovered(kit);
  return saveKit(kit);
}
