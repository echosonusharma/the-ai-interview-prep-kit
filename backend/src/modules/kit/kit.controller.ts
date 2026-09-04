import type { Request, Response } from "express";
import {
  createKit,
  createKitBatch,
  listKitsPage,
  type KitListSort,
  getDashboardSummary,
  getKitForOwner,
  getQueuePosition,
  eventPayload,
} from "./kit.service.js";
import {
  updateBrief,
  updateQuestion,
  addQuestion,
  deleteQuestion,
  reorderQuestions,
  updateRequirement,
  addRequirement,
  deleteRequirement,
  updateFlashcard,
  addFlashcard,
  deleteFlashcard,
} from "./kit-builder.service.js";
import { getPracticeDeck, recordFlashcardReview } from "./kit-practice.service.js";
import { isRegenSection, regenerateSection } from "./kit-regenerate.service.js";
import { serializeKitSummary, serializeKitDetail } from "./kit.serializer.js";
import { kickKitWorker } from "./kit.queue.js";
import { kitEvents, type KitEvent, type KitEventPayload, type KitEventType } from "./kit.events.js";

function kitIdParam(req: Request): string {
  const id = req.params.id;
  return Array.isArray(id) ? id[0]! : id!;
}

/**
 * Strict days validation for the single-create API path: integer 1..60, else
 * 400. The batch path intentionally skips this and relies on the service
 * clamp so one out-of-range case doesn't fail the whole batch.
 */
function invalidDaysError(days: unknown): string | null {
  if (typeof days !== "number" || !Number.isInteger(days) || days < 1 || days > 60) {
    return "days must be an integer between 1 and 60";
  }
  return null;
}

function sseWrite(res: Response, event: string, data: unknown, id?: number) {
  if (id !== undefined) res.write(`id: ${id}\n`);
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

function parseLastEventId(req: Request): number | undefined {
  const raw = req.header("Last-Event-ID");
  if (raw == null || raw === "") return undefined;
  const n = Number(Array.isArray(raw) ? raw[0] : raw);
  return Number.isInteger(n) && n > 0 ? n : undefined;
}

async function loadKit(req: Request) {
  return getKitForOwner(kitIdParam(req), req.session.userId!);
}

async function respondKit(res: Response, kit: Awaited<ReturnType<typeof loadKit>>) {
  if (!kit) {
    res.status(404).json({ error: "Kit not found" });
    return null;
  }
  const queuePosition = await getQueuePosition(kit);
  res.json(serializeKitDetail(kit, queuePosition));
  return kit;
}

export async function createKitBatchHandler(req: Request, res: Response): Promise<void> {
  const { cases } = req.body as {
    cases?: Array<{ rawJd?: string; companyUrl?: string; days?: number }>;
  };
  if (!Array.isArray(cases) || cases.length === 0) {
    res.status(400).json({ error: "cases array is required" });
    return;
  }
  if (cases.length > 20) {
    res.status(400).json({ error: "Maximum 20 cases per batch" });
    return;
  }
  const { created, errors } = await createKitBatch(
    req.session.userId!,
    cases.map((c) => ({
      rawJd: c.rawJd ?? "",
      companyUrl: c.companyUrl ?? "",
      days: c.days ?? 5,
    }))
  );
  // Only wake the worker when there is actually queued work.
  if (created.length > 0) kickKitWorker();
  const kits = await Promise.all(
    created.map(async (k) => serializeKitSummary(k, await getQueuePosition(k)))
  );
  res.status(201).json({ kits, errors });
}

export async function createKitHandler(req: Request, res: Response): Promise<void> {
  const { rawJd, companyUrl, days } = req.body as {
    rawJd?: string;
    companyUrl?: string;
    days?: number;
  };

  const daysError = invalidDaysError(days ?? 5);
  if (daysError) {
    res.status(400).json({ error: daysError });
    return;
  }

  const kit = await createKit(req.session.userId!, {
    rawJd: rawJd ?? "",
    companyUrl: companyUrl ?? "",
    days: days ?? 5,
  });

  kickKitWorker();

  const queuePosition = await getQueuePosition(kit);
  res.status(201).json(serializeKitDetail(kit, queuePosition));
}

export async function listKitsHandler(req: Request, res: Response): Promise<void> {
  const q = (name: string): string => {
    const v = req.query[name];
    return String(Array.isArray(v) ? v[0] : v ?? "");
  };
  const page = Math.max(parseInt(q("page") || "1", 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(q("limit") || "50", 10) || 50, 1), 50);
  const rawSort = q("sort");
  const sort: KitListSort = rawSort === "oldest" || rawSort === "upcoming" ? rawSort : "newest";
  const status = q("status") || undefined;
  const search = q("q") || undefined;
  const { kits, total } = await listKitsPage(req.session.userId!, { page, limit, sort, status, q: search });
  const summaries = await Promise.all(
    kits.map(async (kit) => serializeKitSummary(kit, await getQueuePosition(kit)))
  );
  const totalPages = Math.max(Math.ceil(total / limit), 1);
  res.json({ kits: summaries, pagination: { page, limit, total, totalPages, sort } });
}

export async function getDashboardHandler(req: Request, res: Response): Promise<void> {
  const rawPage = Array.isArray(req.query.page) ? req.query.page[0] : req.query.page;
  const rawLimit = Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit;
  const page = Math.max(parseInt(String(rawPage ?? "1"), 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(String(rawLimit ?? "5"), 10) || 5, 1), 20);
  res.json(await getDashboardSummary(req.session.userId!, page, limit));
}

export async function getKitHandler(req: Request, res: Response): Promise<void> {
  const kit = await getKitForOwner(kitIdParam(req), req.session.userId!);
  if (!kit) {
    res.status(404).json({ error: "Kit not found" });
    return;
  }
  const queuePosition = await getQueuePosition(kit);
  res.json(serializeKitDetail(kit, queuePosition));
}

export async function streamKitEventsHandler(req: Request, res: Response): Promise<void> {
  const kitId = kitIdParam(req);
  const resumeFrom = parseLastEventId(req);

  // Subscribe BEFORE the initial load so no event published between the load
  // and subscribe is missed. Anything arriving before the stream is ready
  // (including Last-Event-ID replay) is buffered and flushed in order after
  // the snapshot.
  const pending: Array<{ event: KitEvent; id: number }> = [];
  let forward: (event: KitEvent, id: number) => void = (event, id) => {
    pending.push({ event, id });
  };
  const unsubscribe = kitEvents.subscribe(kitId, (event, id) => forward(event, id), resumeFrom);

  const kit = await getKitForOwner(kitId, req.session.userId!);
  if (!kit) {
    unsubscribe();
    res.status(404).json({ error: "Kit not found" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  // Never move the progress bar backward on this stream: replayed + live
  // events can arrive out of order or repeat an earlier step.
  let lastSentProgress = -1;
  let ended = false;
  const send = (type: string, data: KitEventPayload, id?: number) => {
    if (ended) return;
    const progress = Math.max(data.progress, lastSentProgress);
    lastSentProgress = progress;
    sseWrite(res, type, progress === data.progress ? data : { ...data, progress }, id);
  };

  const heartbeat = setInterval(() => {
    if (!ended) res.write(": heartbeat\n\n");
  }, 15000);
  const cleanup = () => {
    clearInterval(heartbeat);
    unsubscribe();
  };
  req.on("close", cleanup);
  const finish = (type: KitEventType, data: KitEventPayload, id?: number) => {
    send(type, data, id);
    ended = true;
    cleanup();
    res.end();
  };
  const forwardLive = (event: KitEvent, id: number) => {
    if (event.type === "complete" || event.type === "failed") {
      finish(event.type, event.data, id);
      return;
    }
    send(event.type, event.data, id);
  };

  const sendSnapshot = async () => {
    const fresh = await getKitForOwner(kitId, req.session.userId!);
    if (!fresh || ended) return;
    const queuePosition = await getQueuePosition(fresh);
    if (ended) return;
    send("status", eventPayload(fresh, queuePosition));
  };

  await sendSnapshot();

  // Flush buffered events oldest-first.
  pending.sort((a, b) => a.id - b.id);
  for (const { event, id } of pending.splice(0)) {
    forwardLive(event, id);
    if (ended) return;
  }

  // Terminal snapshot uses the same full payload shape as live events so the
  // client doesn't need a refetch after connecting to a finished kit.
  const queuePosition = await getQueuePosition(kit);
  if (ended) return;
  if (kit.job.status === "done") {
    finish("complete", eventPayload(kit, queuePosition));
    return;
  }
  if (kit.job.status === "failed") {
    finish("failed", eventPayload(kit, queuePosition));
    return;
  }

  // Go live: subsequent events stream straight to the client.
  forward = forwardLive;
}

export async function patchBriefHandler(req: Request, res: Response): Promise<void> {
  const kit = await loadKit(req);
  if (!kit) {
    res.status(404).json({ error: "Kit not found" });
    return;
  }
  const updated = await updateBrief(kit, req.body);
  await respondKit(res, updated);
}

export async function patchQuestionHandler(req: Request, res: Response): Promise<void> {
  const kit = await loadKit(req);
  if (!kit) {
    res.status(404).json({ error: "Kit not found" });
    return;
  }
  const qid = Array.isArray(req.params.qid) ? req.params.qid[0]! : req.params.qid!;
  const updated = await updateQuestion(kit, qid, req.body);
  await respondKit(res, updated);
}

export async function postQuestionHandler(req: Request, res: Response): Promise<void> {
  const kit = await loadKit(req);
  if (!kit) {
    res.status(404).json({ error: "Kit not found" });
    return;
  }
  const updated = await addQuestion(kit, req.body);
  await respondKit(res, updated);
}

export async function deleteQuestionHandler(req: Request, res: Response): Promise<void> {
  const kit = await loadKit(req);
  if (!kit) {
    res.status(404).json({ error: "Kit not found" });
    return;
  }
  const qid = Array.isArray(req.params.qid) ? req.params.qid[0]! : req.params.qid!;
  const updated = await deleteQuestion(kit, qid);
  await respondKit(res, updated);
}

export async function reorderQuestionsHandler(req: Request, res: Response): Promise<void> {
  const kit = await loadKit(req);
  if (!kit) {
    res.status(404).json({ error: "Kit not found" });
    return;
  }
  const { order } = req.body as { order?: string[] };
  if (!Array.isArray(order)) {
    res.status(400).json({ error: "order array is required" });
    return;
  }
  const updated = await reorderQuestions(kit, order);
  await respondKit(res, updated);
}

export async function patchFlashcardHandler(req: Request, res: Response): Promise<void> {
  const kit = await loadKit(req);
  if (!kit) {
    res.status(404).json({ error: "Kit not found" });
    return;
  }
  const fid = Array.isArray(req.params.fid) ? req.params.fid[0]! : req.params.fid!;
  const updated = await updateFlashcard(kit, fid, req.body);
  await respondKit(res, updated);
}

export async function postFlashcardHandler(req: Request, res: Response): Promise<void> {
  const kit = await loadKit(req);
  if (!kit) {
    res.status(404).json({ error: "Kit not found" });
    return;
  }
  const updated = await addFlashcard(kit, req.body);
  await respondKit(res, updated);
}

export async function deleteFlashcardHandler(req: Request, res: Response): Promise<void> {
  const kit = await loadKit(req);
  if (!kit) {
    res.status(404).json({ error: "Kit not found" });
    return;
  }
  const fid = Array.isArray(req.params.fid) ? req.params.fid[0]! : req.params.fid!;
  const updated = await deleteFlashcard(kit, fid);
  await respondKit(res, updated);
}

export async function patchRequirementHandler(req: Request, res: Response): Promise<void> {
  const kit = await loadKit(req);
  if (!kit) {
    res.status(404).json({ error: "Kit not found" });
    return;
  }
  const rid = Array.isArray(req.params.rid) ? req.params.rid[0]! : req.params.rid!;
  const updated = await updateRequirement(kit, rid, req.body);
  await respondKit(res, updated);
}

export async function postRequirementHandler(req: Request, res: Response): Promise<void> {
  const kit = await loadKit(req);
  if (!kit) {
    res.status(404).json({ error: "Kit not found" });
    return;
  }
  const updated = await addRequirement(kit, req.body);
  await respondKit(res, updated);
}

export async function deleteRequirementHandler(req: Request, res: Response): Promise<void> {
  const kit = await loadKit(req);
  if (!kit) {
    res.status(404).json({ error: "Kit not found" });
    return;
  }
  const rid = Array.isArray(req.params.rid) ? req.params.rid[0]! : req.params.rid!;
  const updated = await deleteRequirement(kit, rid);
  await respondKit(res, updated);
}

export async function regenerateSectionHandler(req: Request, res: Response): Promise<void> {
  const kit = await loadKit(req);
  if (!kit) {
    res.status(404).json({ error: "Kit not found" });
    return;
  }
  const section = Array.isArray(req.params.section) ? req.params.section[0]! : req.params.section!;
  if (!isRegenSection(section)) {
    res.status(400).json({ error: `Invalid section. Use: brief, technical, behavioural, system-design, company-fit, schedule` });
    return;
  }
  const updated = await regenerateSection(kit, section);
  await respondKit(res, updated);
}

export async function getPracticeHandler(req: Request, res: Response): Promise<void> {
  const kit = await loadKit(req);
  if (!kit) {
    res.status(404).json({ error: "Kit not found" });
    return;
  }
  try {
    res.json(getPracticeDeck(kit));
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    res.status(409).json({ error: message });
  }
}

export async function postPracticeReviewHandler(req: Request, res: Response): Promise<void> {
  const kit = await loadKit(req);
  if (!kit) {
    res.status(404).json({ error: "Kit not found" });
    return;
  }
  const { flashcardId, confidence } = req.body as { flashcardId?: string; confidence?: number };
  if (!flashcardId || confidence === undefined) {
    res.status(400).json({ error: "flashcardId and confidence (1-5) are required" });
    return;
  }
  if (![1, 2, 3, 4, 5].includes(confidence)) {
    res.status(400).json({ error: "confidence must be 1-5" });
    return;
  }
  const updated = await recordFlashcardReview(kit, flashcardId, confidence as 1 | 2 | 3 | 4 | 5);
  res.json(getPracticeDeck(updated));
}
