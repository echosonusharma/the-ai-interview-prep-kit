import { z } from "zod";

// Request validation schemas for HTTP intake. Service + Mongoose checks stay as
// defense in depth; these reject malformed bodies/query/params early with 400.

const objectIdParam = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id");
const subId = z.string().min(1).max(64);

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

const days = z.number().int().min(1).max(60);
const requirementIds = z.array(subId).max(50);
const nonEmptyPatch = (msg = "At least one field is required") =>
  z.record(z.string(), z.unknown()).refine((o) => Object.keys(o).length > 0, msg);

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

// Kit create
const kitCase = z.object({
  rawJd: z.string().trim().min(10, "Job description must be at least 10 characters").max(100000),
  companyUrl: httpUrl,
  days: days.default(5),
});

export const createKitBody = z.object({
  rawJd: z.string().trim().min(10, "Job description must be at least 10 characters").max(100000),
  companyUrl: httpUrl,
  days: days.default(5),
});

export const createKitBatchBody = z.object({
  cases: z.array(kitCase).min(1, "cases array is required").max(20, "Maximum 20 cases per batch"),
});

// Builder: brief
export const briefPatchBody = z
  .object({
    summary: z.string().trim().min(1).max(10000).optional(),
    what_they_do: z.string().trim().min(1).max(10000).optional(),
    pinned: z.boolean().optional(),
  })
  .superRefine((o, ctx) => {
    if (Object.keys(o).length === 0) {
      ctx.addIssue({ code: "custom", message: "At least one field is required" });
    }
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
const statusEnum = z.enum(["queued", "running", "done", "failed", "active"]).optional();

export const listKitsQuery = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1).catch(1),
  limit: z.coerce.number().int().min(1).max(50).default(50).catch(50),
  sort: sortEnum,
  status: statusEnum,
  q: z.string().trim().max(200).optional(),
});

export const dashboardQuery = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1).catch(1),
  limit: z.coerce.number().int().min(1).max(20).default(5).catch(5),
});

export { nonEmptyPatch };
