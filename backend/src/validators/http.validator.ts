import { z } from "zod";

// HTTP intake schemas. Service + Mongoose checks remain as defense in depth.

const objectIdParam = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id");
const subId = z.string().min(1).max(64);
const MIN_JD_CHARS = 500;
const MAX_JD_CHARS = 5000;

const httpUrl = z
  .string()
  .trim()
  .min(1, "Company URL is required")
  .max(2048)
  .refine((v) => {
    try {
      const u = new URL(v);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  }, "Invalid company URL");

const days = z.preprocess(
  (v) => (v === null || v === undefined || v === "" ? undefined : v),
  z.coerce.number().int().min(1).max(60).default(5)
);
const requirementIds = z.array(subId).max(50);

const rawJd = z
  .string()
  .trim()
  .min(MIN_JD_CHARS, `Job description must be at least ${MIN_JD_CHARS} characters`)
  .max(MAX_JD_CHARS, `Job description must be at most ${MAX_JD_CHARS} characters`);

// Auth
export const signupBody = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
  name: z.string().trim().min(1).max(100).optional(),
});

export const loginBody = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(72),
});

// rawJd floor mirrors the generation gate and UI hint.
export const kitCase = z.object({
  rawJd,
  companyUrl: httpUrl,
  days,
});

export const createKitBody = z.object({
  rawJd,
  companyUrl: httpUrl,
  days,
});

// Loose per case — the controller folds bad cases into errors[], not a whole-request 400.
export const createKitBatchBody = z.object({
  cases: z.array(z.record(z.string(), z.unknown())).min(1, "cases array is required").max(20, "Maximum 20 cases per batch"),
});

// Brief allows {} (pins the brief, matching updateBrief).
export const briefPatchBody = z.object({
  summary: z.string().trim().min(1).max(10000).optional(),
  what_they_do: z.string().trim().min(1).max(10000).optional(),
  pinned: z.boolean().optional(),
});

// Builder: questions
const questionCategory = z.enum(["technical", "behavioural", "system-design", "company-fit"]);
const difficulty = z.union([z.literal(1), z.literal(2), z.literal(3)]);

export const questionAddBody = z.object({
  prompt: z.string().trim().min(1).max(5000),
  answer_outline: z.string().trim().min(1).max(10000),
  difficulty,
  category: questionCategory,
  requirement_ids: requirementIds,
});

export const questionPatchBody = z
  .object({
    prompt: z.string().trim().min(1).max(5000).optional(),
    answer_outline: z.string().trim().min(1).max(10000).optional(),
    difficulty: difficulty.optional(),
    category: questionCategory.optional(),
    requirement_ids: requirementIds.optional(),
    pinned: z.boolean().optional(),
  })
  .superRefine((o, ctx) => {
    if (Object.keys(o).length === 0) {
      ctx.addIssue({ code: "custom", message: "At least one field is required" });
    }
  });

export const reorderBody = z.object({
  order: z
    .array(subId)
    .min(1)
    .max(500)
    .refine((a) => new Set(a).size === a.length, "order must list every question id exactly once"),
});

// Builder: requirements
const requirementKind = z.enum(["technical", "behavioural", "domain"]);
const requirementPriority = z.enum(["must", "nice"]);

export const requirementAddBody = z.object({
  text: z.string().trim().min(1).max(2000),
  kind: requirementKind,
  priority: requirementPriority,
});

export const requirementPatchBody = z
  .object({
    text: z.string().trim().min(1).max(2000).optional(),
    kind: requirementKind.optional(),
    priority: requirementPriority.optional(),
    pinned: z.boolean().optional(),
  })
  .superRefine((o, ctx) => {
    if (Object.keys(o).length === 0) {
      ctx.addIssue({ code: "custom", message: "At least one field is required" });
    }
  });

// Builder: flashcards
export const flashcardAddBody = z.object({
  front: z.string().trim().min(1).max(2000),
  back: z.string().trim().min(1).max(5000),
  requirement_ids: requirementIds,
});

export const flashcardPatchBody = z
  .object({
    front: z.string().trim().min(1).max(2000).optional(),
    back: z.string().trim().min(1).max(5000).optional(),
    requirement_ids: requirementIds.optional(),
    pinned: z.boolean().optional(),
  })
  .superRefine((o, ctx) => {
    if (Object.keys(o).length === 0) {
      ctx.addIssue({ code: "custom", message: "At least one field is required" });
    }
  });

// Practice
export const practiceReviewBody = z.object({
  flashcardId: subId,
  confidence: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
});

// Params
export const kitIdParams = z.object({ id: objectIdParam });
export const questionIdParams = z.object({ id: objectIdParam, qid: subId });
export const requirementIdParams = z.object({ id: objectIdParam, rid: subId });
export const flashcardIdParams = z.object({ id: objectIdParam, fid: subId });
export const regenParams = z.object({
  id: objectIdParam,
  section: z.enum(["brief", "technical", "behavioural", "system-design", "company-fit", "schedule"]),
});

// Query
const sortEnum = z.enum(["newest", "oldest", "upcoming"]).default("newest").catch("newest");
// Unknown/empty status returns the unfiltered list.
const statusFilter = z.preprocess(
  (v) => (v === "" ? undefined : v),
  z.string().trim().max(200).optional().catch(undefined)
);

// Floor numerics so ?page=2.9 means page 2.
const pageNum = (max: number, fallback: number) =>
  z.preprocess(
    (v) => {
      if (v === null || v === undefined || v === "") return undefined;
      const n = typeof v === "number" ? v : Number(v);
      return Number.isFinite(n) ? Math.floor(n) : v;
    },
    z.number().int().min(1).max(max).default(fallback).catch(fallback)
  );

export const listKitsQuery = z.object({
  page: pageNum(10000, 1),
  limit: pageNum(50, 50),
  sort: sortEnum,
  status: statusFilter,
  q: z.string().trim().max(200).optional(),
});

export const dashboardQuery = z.object({
  page: pageNum(10000, 1),
  limit: pageNum(20, 5),
});
