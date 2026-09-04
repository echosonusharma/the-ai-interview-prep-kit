import { randomUUID } from "node:crypto";
import { Types } from "mongoose";
import type { PipelineStage, QueryFilter } from "mongoose";
import { Kit } from "../../models/kit.model.js";
import type { IKit } from "../../types/kit.types.js";
import type { KitAppendix } from "../../validators/kit.validator.js";
import { validateKitDocument } from "../../validators/kit.validator.js";
import { generateKit } from "../../pipeline/steps/orchestrator.js";
import { env } from "../../config/env.js";
import { hashKitInput } from "../../utils/jd-hash.js";
import { validateUrl } from "../../crawler/url-validator.js";
import { DEFAULT_CONFIG, kitCrawlerConfig, type CrawlerConfig } from "../../crawler/types.js";
import { kitEvents, type KitEventPayload } from "./kit.events.js";
import { activeStage, stepToProgress } from "./kit.progress.js";
import { serializeKitDetail } from "./kit.serializer.js";

function errorCode(message: string): string {
  if (/timed out after/i.test(message)) return "CASE_TIMEOUT";
  if (/unreachable|enotfound|econn|timeout|fetch failed/i.test(message)) return "COMPANY_UNREACHABLE";
  if (/validat/i.test(message)) return "VALIDATION_FAILED";
  if (/coverage incomplete/i.test(message)) return "COVERAGE_FAILED";
  if (/budget/i.test(message)) return "LLM_FAILED";
  return "PIPELINE_FAILED";
}

export async function getQueuePosition(kit: IKit): Promise<number | null> {
  if (kit.job.status !== "queued") return null;
  // Scoped to the kit owner — never leak global queue depth across users.
  const ahead = await Kit.countDocuments({
    owner: kit.owner,
    "job.status": "queued",
    createdAt: { $lt: kit.createdAt },
  });
  const running = await Kit.exists({ owner: kit.owner, "job.status": "running" });
  return ahead + (running ? 1 : 0);
}

export function eventPayload(kit: IKit, queuePosition: number | null, detail?: string): KitEventPayload {
  const mapped = kit.job.step ? stepToProgress(kit.job.step, detail) : null;
  return {
    kitId: kit._id.toString(),
    status: kit.job.status,
    progress: mapped?.progress ?? kit.job.progress,
    step: kit.job.step,
    label: mapped?.label ?? (kit.job.status === "queued" ? "Waiting in queue" : "Starting"),
    stage: activeStage(kit.job.step),
    detail: detail ?? mapped?.detail,
    queuePosition,
    error: kit.job.error,
  };
}

function publishStatus(kit: IKit, queuePosition: number | null, type: "status" | "progress" | "complete" | "failed" = "status", detail?: string) {
  kitEvents.publish(kit._id.toString(), {
    type,
    data: eventPayload(kit, queuePosition, detail),
  });
}

function applyAppendix(kit: IKit, appendix: KitAppendix) {
  kit.source = appendix.source;

  kit.company_brief.summary = appendix.company_brief.summary;
  kit.company_brief.what_they_do = appendix.company_brief.what_they_do;
  kit.company_brief.sources = appendix.company_brief.sources;
  kit.set("company_brief._meta", kit.company_brief._meta ?? { pinned: false });

  kit.role = appendix.role;
  kit.role.requirements = appendix.role.requirements.map((r) => ({
    ...r,
    _state: { origin: "generated" as const, pinned: false },
  }));
  kit.questions = appendix.questions.map((q) => ({
    ...q,
    _state: { origin: "generated" as const, pinned: false },
  }));
  kit.flashcards = appendix.flashcards.map((f) => ({
    ...f,
    _state: { origin: "generated" as const, pinned: false },
  }));

  kit.schedule.days_available = appendix.schedule.days_available;
  kit.schedule.days = appendix.schedule.days;
  kit.set("schedule._meta", kit.schedule._meta ?? { pinned: false });

  kit.coverage = appendix.coverage;
}

export interface CreateKitInput {
  rawJd: string;
  companyUrl: string;
  days: number;
}

export async function createKit(ownerId: Types.ObjectId | string, input: CreateKitInput): Promise<IKit> {
  const rawJd = input.rawJd?.trim();
  const companyUrl = input.companyUrl?.trim();
  const days = Math.max(1, Math.min(60, Math.floor(input.days) || 1));

  if (!rawJd || rawJd.length < 10) {
    const err = new Error("Job description must be at least 10 characters") as Error & { statusCode?: number };
    err.statusCode = 400;
    throw err;
  }
  if (!companyUrl) {
    const err = new Error("Company URL is required") as Error & { statusCode?: number };
    err.statusCode = 400;
    throw err;
  }

  const crawlerCfg: CrawlerConfig = { ...DEFAULT_CONFIG, ...kitCrawlerConfig(env.isProd) };
  const urlCheck = validateUrl(companyUrl, crawlerCfg);
  if (!urlCheck.valid) {
    const err = new Error(`Invalid company URL: ${urlCheck.error}`) as Error & { statusCode?: number };
    err.statusCode = 400;
    throw err;
  }

  const jdHash = hashKitInput(rawJd, companyUrl, days);
  const generationId = randomUUID();

  try {
    const kit = await Kit.create({
      owner: ownerId,
      input: { rawJd, companyUrl, days, jdHash },
      source: {
        company: "",
        company_url: companyUrl,
        role: "",
        location: "",
        jd_chars: rawJd.length,
        researched_at: new Date().toISOString(),
        pages_used: [],
      },
      schedule: { days_available: days, days: [], _meta: { pinned: false } },
      company_brief: { summary: "", what_they_do: "", sources: [], _meta: { pinned: false } },
      job: { status: "queued", progress: 0, step: "queued", error: null },
      generationId,
    });

    const queuePosition = await getQueuePosition(kit);
    publishStatus(kit, queuePosition);
    return kit;
  } catch (e: unknown) {
    if (e && typeof e === "object" && "code" in e && (e as { code: number }).code === 11000) {
      const err = new Error("You already have a kit for this job description and company URL") as Error & {
        statusCode?: number;
      };
      err.statusCode = 409;
      throw err;
    }
    throw e;
  }
}

export async function createKitBatch(
  ownerId: Types.ObjectId | string,
  cases: CreateKitInput[]
): Promise<{ created: IKit[]; errors: Array<{ index: number; message: string; statusCode: number }> }> {
  const created: IKit[] = [];
  const errors: Array<{ index: number; message: string; statusCode: number }> = [];
  for (let i = 0; i < cases.length; i++) {
    try {
      created.push(await createKit(ownerId, cases[i]!));
    } catch (e) {
      const statusCode =
        e && typeof e === "object" && "statusCode" in e && typeof (e as { statusCode: unknown }).statusCode === "number"
          ? ((e as { statusCode: number }).statusCode as number)
          : 500;
      errors.push({ index: i, message: e instanceof Error ? e.message : String(e), statusCode });
    }
  }
  return { created, errors };
}

export async function listKits(ownerId: string): Promise<IKit[]> {
  return Kit.find({ owner: ownerId }).sort({ createdAt: -1 }).limit(50);
}

export type KitListSort = "upcoming" | "newest" | "oldest";

export interface KitListPage {
  kits: IKit[];
  total: number;
}

const KIT_STATUSES = ["queued", "running", "done", "failed"] as const;

/**
 * Paginated, sortable kit listing. `upcoming` sorts by derived interview
 * date (createdAt + input days), soonest first, past/failed kits last.
 */
export async function listKitsPage(
  ownerId: string,
  opts: { page: number; limit: number; sort: KitListSort; status?: string; q?: string }
): Promise<KitListPage> {
  const { page, limit, sort, status, q } = opts;
  const statusFilter: QueryFilter<IKit> =
    status && (KIT_STATUSES as readonly string[]).includes(status)
      ? { "job.status": status as IKit["job"]["status"] }
      : status === "active"
        ? { "job.status": { $in: ["queued", "running"] } }
        : {};
  // Escaped substring match across company + role — never raw regex from the client.
  const query = q?.trim() ? q.trim().slice(0, 80).replace(/[.*+?^${}()|[\]\\]/g, "\\$&") : "";
  const searchFilter: QueryFilter<IKit> = query
    ? {
        $or: [
          { "source.company": { $regex: query, $options: "i" } },
          { "role.title": { $regex: query, $options: "i" } },
          { "input.companyUrl": { $regex: query, $options: "i" } },
        ],
      }
    : {};

  if (sort === "upcoming") {
    // Derived interview date (createdAt + input.days) computed in-DB so
    // pagination uses real totals instead of an in-memory 200-doc cap.
    const now = new Date();
    const match: QueryFilter<IKit> = {
      owner: new Types.ObjectId(ownerId),
      ...statusFilter,
      ...searchFilter,
    };
    const pipeline: PipelineStage[] = [
      { $match: match },
      {
        $addFields: {
          interviewAt: { $add: ["$createdAt", { $multiply: ["$input.days", DAY_MS] }] },
        },
      },
      {
        $addFields: {
          daysLeft: { $ceil: { $divide: [{ $subtract: ["$interviewAt", now] }, DAY_MS] } },
        },
      },
      {
        $addFields: {
          past: {
            $or: [{ $lt: ["$daysLeft", 0] }, { $eq: ["$job.status", "failed"] }],
          },
        },
      },
      { $sort: { past: 1, daysLeft: 1, interviewAt: -1 } },
      {
        $facet: {
          total: [{ $count: "n" }],
          ids: [{ $skip: (page - 1) * limit }, { $limit: limit }, { $project: { _id: 1 } }],
        },
      },
    ];
    const agg = (await Kit.aggregate(pipeline)) as Array<{
      total: Array<{ n: number }>;
      ids: Array<{ _id: Types.ObjectId }>;
    }>;
    const total = agg[0]?.total[0]?.n ?? 0;
    const ids = (agg[0]?.ids ?? []).map((e) => e._id);
    if (ids.length === 0) return { kits: [], total };
    const docs = await Kit.find({ _id: { $in: ids } });
    const byId = new Map(docs.map((d) => [d._id.toString(), d]));
    const kits = ids.flatMap((id) => {
      const doc = byId.get(id.toString());
      return doc ? [doc] : [];
    });
    return { kits, total };
  }

  const direction = sort === "oldest" ? 1 : -1;
  const [kits, total] = await Promise.all([
    Kit.find({ owner: ownerId, ...statusFilter, ...searchFilter })
      .sort({ createdAt: direction })
      .skip((page - 1) * limit)
      .limit(limit),
    Kit.countDocuments({ owner: ownerId, ...statusFilter, ...searchFilter }),
  ]);
  return { kits, total };
}

const DAY_MS = 86_400_000;

export interface UpcomingInterview extends Record<string, unknown> {
  id: string;
  status: string;
  progress: number;
  company: string;
  role: string;
  companyUrl: string;
  days: number;
  daysLeft: number;
  interviewDate: string;
}

export interface DashboardSummary {
  stats: {
    total: number;
    upcoming: number;
    prepared: number;
    preparing: number;
    prepDaysLeft: number;
  };
  upcoming: UpcomingInterview[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Dashboard aggregation: stat cards plus a paginated list of upcoming
 * interviews (interview date = createdAt + input days), soonest first.
 * Computed in code — the interview date is derived, not stored.
 */
export async function getDashboardSummary(
  ownerId: string,
  page: number,
  limit: number
): Promise<DashboardSummary> {
  // Stats come from countDocuments (no in-memory cap); the upcoming list is a
  // DB-sorted aggregate over the derived interview date (createdAt + input.days).
  const ownerObj = new Types.ObjectId(ownerId);
  const now = new Date();
  const [total, prepared, preparing, counts] = await Promise.all([
    Kit.countDocuments({ owner: ownerId }),
    Kit.countDocuments({ owner: ownerId, "job.status": "done" }),
    Kit.countDocuments({ owner: ownerId, "job.status": { $in: ["queued", "running"] } }),
    Kit.aggregate([
      { $match: { owner: ownerObj, "job.status": { $ne: "failed" } } },
      {
        $addFields: {
          interviewAt: { $add: ["$createdAt", { $multiply: ["$input.days", DAY_MS] }] },
        },
      },
      {
        $addFields: {
          daysLeft: { $ceil: { $divide: [{ $subtract: ["$interviewAt", now] }, DAY_MS] } },
        },
      },
      { $match: { daysLeft: { $gte: 0 } } },
      {
        $facet: {
          total: [{ $count: "n" }],
          prepDays: [{ $group: { _id: null, sum: { $sum: "$daysLeft" } } }],
        },
      },
    ]) as Promise<Array<{ total: Array<{ n: number }>; prepDays: Array<{ sum: number }> }>>,
  ]);
  const upcomingTotal = counts[0]?.total[0]?.n ?? 0;
  const prepDaysLeft = counts[0]?.prepDays[0]?.sum ?? 0;

  const totalPages = Math.max(Math.ceil(upcomingTotal / limit), 1);
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const idsAgg = (await Kit.aggregate([
    { $match: { owner: ownerObj, "job.status": { $ne: "failed" } } },
    {
      $addFields: {
        interviewAt: { $add: ["$createdAt", { $multiply: ["$input.days", DAY_MS] }] },
      },
    },
    {
      $addFields: {
        daysLeft: { $ceil: { $divide: [{ $subtract: ["$interviewAt", now] }, DAY_MS] } },
      },
    },
    { $match: { daysLeft: { $gte: 0 } } },
    { $sort: { daysLeft: 1, interviewAt: -1 } },
    { $skip: (safePage - 1) * limit },
    { $limit: limit },
    { $project: { _id: 1 } },
  ])) as Array<{ _id: Types.ObjectId }>;

  const nowMs = now.getTime();
  let upcoming: UpcomingInterview[] = [];
  if (idsAgg.length > 0) {
    const docs = await Kit.find({ _id: { $in: idsAgg.map((e) => e._id) } });
    const byId = new Map(docs.map((d) => [d._id.toString(), d]));
    upcoming = idsAgg
      .flatMap((e) => {
        const doc = byId.get(e._id.toString());
        return doc ? [doc] : [];
      })
      .map((k) => {
        const interviewAt = k.createdAt.getTime() + k.input.days * DAY_MS;
        return {
          id: k._id.toString(),
          status: k.job.status,
          progress: k.job.progress,
          company: k.source.company || k.input.companyUrl,
          role: k.role.title || "Untitled role",
          companyUrl: k.input.companyUrl,
          days: k.input.days,
          daysLeft: Math.ceil((interviewAt - nowMs) / DAY_MS),
          interviewDate: new Date(interviewAt).toISOString(),
        };
      });
  }

  return {
    stats: { total, upcoming: upcomingTotal, prepared, preparing, prepDaysLeft },
    upcoming,
    pagination: { page: safePage, limit, total: upcomingTotal, totalPages },
  };
}

export async function getKitForOwner(kitId: string, ownerId: string): Promise<IKit | null> {
  return Kit.findOne({ _id: kitId, owner: ownerId });
}

export async function recoverStaleRunningJobs() {
  const cutoff = new Date(Date.now() - env.CASE_TIMEOUT_MS);
  // updateMany is atomic per document and already guarded on job.status still
  // "running" + a stale startedAt, so two workers can't requeue the same job
  // twice — verify modifiedCount for the log line only.
  const stale = await Kit.updateMany(
    { "job.status": "running", "job.startedAt": { $lt: cutoff } },
    {
      $set: {
        "job.status": "queued",
        "job.progress": 0,
        "job.step": "requeued",
        "job.error": null,
      },
      $unset: { "job.startedAt": "", "job.finishedAt": "" },
    }
  );
  if (stale.modifiedCount > 0) {
    console.warn(`Re-queued ${stale.modifiedCount} stale running kit job(s)`);
  }
}

export async function claimNextQueuedKit(): Promise<IKit | null> {
  // Atomic claim: no check-then-claim. Each candidate is claimed with
  // findOneAndUpdate guarded on job.status still "queued" — a second worker
  // racing for the same kit matches nothing and moves to the next candidate.
  const candidates = await Kit.find({ "job.status": "queued" })
    .sort({ createdAt: 1 })
    .limit(5)
    .select("_id");
  for (const c of candidates) {
    const claimed = await Kit.findOneAndUpdate(
      { _id: c._id, "job.status": "queued" },
      {
        $set: {
          "job.status": "running",
          "job.startedAt": new Date(),
          "job.progress": 1,
          "job.step": "starting",
          "job.error": null,
        },
        $unset: { "job.finishedAt": "" },
      },
      { returnDocument: "after" }
    );
    if (!claimed) continue; // lost the race for this candidate — try the next
    // Single-worker invariant: if another kit is already running, roll this
    // claim back to queued and yield (next poll retries). Both racers rolling
    // back just delays one poll cycle; the queue self-heals.
    const otherRunning = await Kit.exists({ _id: { $ne: claimed._id }, "job.status": "running" });
    if (otherRunning) {
      await Kit.findOneAndUpdate(
        { _id: claimed._id, "job.status": "running" },
        {
          $set: {
            "job.status": "queued",
            "job.progress": 0,
            "job.step": "requeued",
            "job.error": null,
          },
          $unset: { "job.startedAt": "", "job.finishedAt": "" },
        }
      );
      return null;
    }
    return claimed;
  }
  return null;
}

export async function runKitGeneration(kit: IKit): Promise<void> {
  const kitId = kit._id.toString();
  let lastProgress = kit.job.progress;
  let progressWrites: Promise<void> = Promise.resolve();

  const onProgress = (step: string, detail?: string): Promise<void> => {
    const mapped = stepToProgress(step, detail);
    lastProgress = Math.max(lastProgress, mapped.progress);
    kit.job.step = step;
    kit.job.progress = mapped.progress;

    progressWrites = progressWrites
      .then(async () => {
        // Direct atomic write: progress must not participate in optimistic
        // concurrency or bump the content version — it would otherwise
        // conflict with user edits landing mid-generation. No validators.
        await Kit.updateOne(
          { _id: kit._id },
          { $set: { "job.step": step, "job.progress": mapped.progress } }
        );
        publishStatus(kit, null, step === "done" ? "complete" : "progress", detail);
      })
      .catch((err) => {
        console.warn(`[kit-worker] progress write failed for ${kitId}:`, err);
      });
    return progressWrites;
  };

  try {
    publishStatus(kit, null, "progress", "Starting generation");

    // The timeout aborts the generation signal (threaded into generateKit, so
    // crawl/LLM waits reject promptly) AND rejects the race — the orphaned
    // fetch/LLM work itself can't be cancelled from here (see orchestrator's
    // withSignal residual note), but we stop waiting and stop spending budget
    // on further steps.
    const timeoutMs = env.CASE_TIMEOUT_MS;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(new Error(`Case timed out after ${timeoutMs}ms (${kitId})`));
      }, timeoutMs);
    });
    let result: Awaited<ReturnType<typeof generateKit>>;
    try {
      result = await Promise.race([
        generateKit({
          jd: kit.input.rawJd,
          companyUrl: kit.input.companyUrl,
          days: kit.input.days,
          signal: controller.signal,
          onProgress: (step, detail) => {
            void onProgress(step, detail);
          },
        }),
        timeoutPromise,
      ]);
    } finally {
      clearTimeout(timer);
    }

    await progressWrites;

    applyAppendix(kit, result.kit);
    kit.job.status = "done";
    kit.job.progress = 100;
    kit.job.step = "done";
    kit.job.error = null;
    kit.job.finishedAt = new Date();
    validateKitDocument(kit.toObject({ depopulate: true, versionKey: false }));
    await kit.save();

    publishStatus(kit, null, "complete");
    if (result.warnings.length) {
      kitEvents.publish(kitId, {
        type: "status",
        data: { ...eventPayload(kit, null), detail: result.warnings.join(" | ") },
      });
    }
  } catch (e) {
    await progressWrites.catch(() => {});
    const message = e instanceof Error ? e.message : String(e);
    kit.job.status = "failed";
    kit.job.progress = lastProgress;
    kit.job.step = kit.job.step ?? "failed";
    kit.job.error = { code: errorCode(message), message };
    kit.job.finishedAt = new Date();
    await kit.save();
    publishStatus(kit, null, "failed", message);
  }
}

export { serializeKitDetail } from "./kit.serializer.js";
