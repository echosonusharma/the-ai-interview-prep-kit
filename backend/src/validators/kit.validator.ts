import { z } from "zod";

// Zod validators for Kit

// Primitives
const requirementSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  kind: z.enum(["technical", "behavioural", "domain"]),
  priority: z.enum(["must", "nice"]),
});

const questionStateSchema = z
  .object({
    origin: z.enum(["generated", "user"]),
    pinned: z.boolean(),
    editedAt: z.coerce.date().optional(),
  })
  .optional();

const questionSchema = z.object({
  id: z.string().min(1),
  requirement_ids: z.array(z.string().min(1)),
  category: z.enum(["technical", "behavioural", "system-design", "company-fit"]),
  prompt: z.string().min(1),
  answer_outline: z.string().min(1),
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  _state: questionStateSchema,
});

const flashcardSchema = z.object({
  id: z.string().min(1),
  front: z.string().min(1),
  back: z.string().min(1),
  requirement_ids: z.array(z.string().min(1)),
  _state: questionStateSchema,
});

const scheduleDaySchema = z.object({
  day: z.number().int().min(1),
  focus: z.string().min(1),
  question_ids: z.array(z.string().min(1)),
  minutes: z.number().int().min(1).max(8 * 60),
});

// Pure export schema for batch evaluate / LLM output
export const kitAppendixSchema = z.object({
  source: z.object({
    company: z.string(),
    company_url: z.string(),
    role: z.string(),
    location: z.string(),
    jd_chars: z.number().int().min(0),
    researched_at: z.string(),
    pages_used: z.array(z.string()),
  }),
  company_brief: z.object({
    summary: z.string(),
    what_they_do: z.string(),
    sources: z.array(z.string()),
  }),
  role: z.object({
    title: z.string(),
    seniority: z.string(),
    responsibilities: z.array(z.string()),
    requirements: z.array(requirementSchema),
  }),
  questions: z.array(questionSchema.omit({ _state: true })),
  flashcards: z.array(flashcardSchema.omit({ _state: true })),
  schedule: z.object({
    days_available: z.number().int().min(1).max(60),
    days: z.array(scheduleDaySchema),
  }),
  coverage: z.object({
    uncovered_requirement_ids: z.array(z.string()),
    passes: z.number().int().min(0).max(10),
  }),
});

export type KitAppendix = z.infer<typeof kitAppendixSchema>;

// Full document (DB shape) — includes extensions + cross-field invariants
export const kitDocumentSchema = z
  .object({
    owner: z.any(), // ObjectId — validated by Mongoose, not Zod
    input: z.object({
      rawJd: z.string().min(1),
      companyUrl: z.string(),
      days: z.number().int().min(1).max(60),
      jdHash: z.string().min(1),
      batchCaseId: z.string().optional(),
    }),
    source: kitAppendixSchema.shape.source,
    company_brief: z.object({
      summary: z.string(),
      what_they_do: z.string(),
      sources: z.array(z.string()),
      _meta: z.object({ pinned: z.boolean(), editedAt: z.coerce.date().optional() }).optional(),
    }),
    role: kitAppendixSchema.shape.role,
    questions: z.array(questionSchema),
    flashcards: z.array(flashcardSchema),
    schedule: z.object({
      days_available: z.number().int().min(1).max(60),
      days: z.array(scheduleDaySchema),
      _meta: z.object({ pinned: z.boolean(), editedAt: z.coerce.date().optional() }).optional(),
    }),
    coverage: kitAppendixSchema.shape.coverage,
    job: z.object({
      status: z.enum(["queued", "running", "done", "failed"]),
      progress: z.number().int().min(0).max(100),
      step: z.string().nullable().optional(),
      error: z.object({ code: z.string(), message: z.string() }).nullable().optional(),
      model: z.string().optional(),
      startedAt: z.coerce.date().optional(),
      finishedAt: z.coerce.date().optional(),
    }),
    practice: z.object({
      progress: z.array(
        z.object({
          flashcardId: z.string().min(1),
          confidence: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]).nullable(),
          attempts: z.number().int().min(0),
          lastReviewedAt: z.coerce.date().optional(),
          nextDue: z.coerce.date().optional(),
        })
      ),
    }),
    version: z.number().int().min(1),
    generationId: z.string().optional(),
    createdAt: z.coerce.date().optional(),
    updatedAt: z.coerce.date().optional(),
  })
  .superRefine((kit, ctx) => {
    // stable id uniqueness
    const reqIds = kit.role.requirements.map((r) => r.id);
    if (new Set(reqIds).size !== reqIds.length) {
      ctx.addIssue({ code: "custom", path: ["role", "requirements"], message: "requirement ids must be unique" });
    }
    const qIds = kit.questions.map((q) => q.id);
    if (new Set(qIds).size !== qIds.length) {
      ctx.addIssue({ code: "custom", path: ["questions"], message: "question ids must be unique" });
    }
    const fIds = kit.flashcards.map((f) => f.id);
    if (new Set(fIds).size !== fIds.length) {
      ctx.addIssue({ code: "custom", path: ["flashcards"], message: "flashcard ids must be unique" });
    }

    // requirement_ids refs
    const reqSet = new Set(reqIds);
    for (const q of kit.questions) {
      for (const rid of q.requirement_ids) {
        if (!reqSet.has(rid)) {
          ctx.addIssue({ code: "custom", path: ["questions"], message: `question ${q.id} refs unknown requirement ${rid}` });
        }
      }
    }
    for (const f of kit.flashcards) {
      for (const rid of f.requirement_ids) {
        if (!reqSet.has(rid)) {
          ctx.addIssue({ code: "custom", path: ["flashcards"], message: `flashcard ${f.id} refs unknown requirement ${rid}` });
        }
      }
    }

    // schedule invariants
    if (kit.schedule.days.length !== kit.schedule.days_available) {
      ctx.addIssue({
        code: "custom",
        path: ["schedule", "days"],
        message: `schedule days_available=${kit.schedule.days_available} must equal days.length=${kit.schedule.days.length}`,
      });
    }
    const qSet = new Set(qIds);
    for (const d of kit.schedule.days) {
      for (const qid of d.question_ids) {
        if (!qSet.has(qid)) {
          ctx.addIssue({ code: "custom", path: ["schedule", "days"], message: `schedule day ${d.day} refs unknown question ${qid}` });
        }
      }
    }
    // every must requirement scheduled (only when done — draft can be partial mid-generation)
    if (kit.job.status === "done") {
      const scheduledQIds = new Set(kit.schedule.days.flatMap((d) => d.question_ids));
      const scheduledReqIds = new Set(kit.questions.filter((q) => scheduledQIds.has(q.id)).flatMap((q) => q.requirement_ids));
      for (const r of kit.role.requirements.filter((r) => r.priority === "must")) {
        if (!scheduledReqIds.has(r.id)) {
          ctx.addIssue({ code: "custom", path: ["schedule"], message: `must requirement ${r.id} not scheduled` });
        }
      }
    }

    // coverage subset
    for (const rid of kit.coverage.uncovered_requirement_ids) {
      if (!reqSet.has(rid)) {
        ctx.addIssue({ code: "custom", path: ["coverage", "uncovered_requirement_ids"], message: `coverage uncovered ${rid} unknown` });
      }
    }
  });

export type KitDocument = z.infer<typeof kitDocumentSchema>;

/**
 * Validate full DB document. Throws ZodError with all issues (use flatten for API).
 * Called from Mongoose pre('validate') and from generation pipeline before save.
 */
export function validateKitDocument(doc: unknown) {
  return kitDocumentSchema.parse(doc);
}

/**
 * Validate pure JSON for batch evaluate / LLM output.
 * Strips _state first if needed via caller.
 */
export function validateKitAppendix(kit: unknown) {
  return kitAppendixSchema.parse(kit);
}
