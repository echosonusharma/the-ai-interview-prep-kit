import mongoose, { Schema, Model } from "mongoose";
import { validateKitDocument } from "../validators/kit.validator.js";
import type {
  IKit,
  IKitRequirement,
  IKitRequirementState,
  IKitQuestion,
  IKitQuestionState,
  IKitFlashcard,
  IKitFlashcardState,
  IKitScheduleDay,
  IPracticeProgress,
} from "../types/kit.types.js";

export type {
  IKit,
  IKitRequirement,
  IKitQuestion,
  IKitQuestionState,
  IKitFlashcard,
  IKitFlashcardState,
  IKitScheduleDay,
  IPracticeProgress,
} from "../types/kit.types.js";

// Sub-schemas

const requirementStateSchema = new Schema<IKitRequirementState>(
  {
    origin: { type: String, enum: ["generated", "edited", "user"], default: "generated", required: true },
    pinned: { type: Boolean, default: false },
    editedAt: { type: Date },
  },
  { _id: false }
);

const requirementSchema = new Schema<IKitRequirement>(
  {
    id: { type: String, required: true },
    text: { type: String, required: true },
    kind: { type: String, enum: ["technical", "behavioural", "domain"], required: true },
    priority: { type: String, enum: ["must", "nice"], required: true },
    _state: { type: requirementStateSchema, default: () => ({ origin: "generated", pinned: false }) },
  },
  { _id: false }
);

const questionStateSchema = new Schema<IKitQuestionState>(
  {
    origin: { type: String, enum: ["generated", "user"], default: "generated", required: true },
    pinned: { type: Boolean, default: false },
    editedAt: { type: Date },
  },
  { _id: false }
);

const questionSchema = new Schema<IKitQuestion>(
  {
    id: { type: String, required: true },
    requirement_ids: { type: [String], default: [] },
    category: {
      type: String,
      enum: ["technical", "behavioural", "system-design", "company-fit"],
      required: true,
    },
    prompt: { type: String, required: true },
    answer_outline: { type: String, required: true },
    difficulty: { type: Number, enum: [1, 2, 3], required: true },
    _state: { type: questionStateSchema, default: () => ({ origin: "generated", pinned: false }) },
  },
  { _id: false }
);

const flashcardStateSchema = new Schema<IKitFlashcardState>(
  {
    origin: { type: String, enum: ["generated", "user"], default: "generated", required: true },
    pinned: { type: Boolean, default: false },
    editedAt: { type: Date },
  },
  { _id: false }
);

const flashcardSchema = new Schema<IKitFlashcard>(
  {
    id: { type: String, required: true },
    front: { type: String, required: true },
    back: { type: String, required: true },
    requirement_ids: { type: [String], default: [] },
    _state: { type: flashcardStateSchema, default: () => ({ origin: "generated", pinned: false }) },
  },
  { _id: false }
);

const scheduleDaySchema = new Schema<IKitScheduleDay>(
  {
    day: { type: Number, required: true, min: 1 },
    focus: { type: String, required: true },
    question_ids: { type: [String], default: [] },
    minutes: {
      type: Number,
      required: true,
      validate: {
        validator: Number.isInteger,
        message: "minutes must be integer",
      },
      min: 1,
      max: 8 * 60,
    },
  },
  { _id: false }
);

const practiceProgressSchema = new Schema<IPracticeProgress>(
  {
    flashcardId: { type: String, required: true },
    confidence: { type: Number, enum: [1, 2, 3, 4, 5], default: null },
    attempts: { type: Number, default: 0, min: 0 },
    lastReviewedAt: { type: Date },
    nextDue: { type: Date },
  },
  { _id: false }
);

const kitSchema = new Schema<IKit>(
  {
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },

    input: {
      rawJd: { type: String, required: true },
      companyUrl: { type: String, required: true },
      days: { type: Number, required: true, min: 1, max: 60 },
      jdHash: { type: String, required: true },
      batchCaseId: { type: String },
    },

    source: {
      company: { type: String, default: "" },
      company_url: { type: String, default: "" },
      role: { type: String, default: "" },
      location: { type: String, default: "" },
      jd_chars: { type: Number, required: true, default: 0 },
      researched_at: { type: String, required: true, default: () => new Date().toISOString() },
      pages_used: { type: [String], default: [] },
    },

    company_brief: {
      summary: { type: String, default: "" },
      what_they_do: { type: String, default: "" },
      sources: { type: [String], default: [] },
      _meta: {
        pinned: { type: Boolean, default: false },
        editedAt: { type: Date },
      },
    },

    role: {
      title: { type: String, default: "" },
      seniority: { type: String, default: "" },
      responsibilities: { type: [String], default: [] },
      requirements: { type: [requirementSchema], default: [] },
    },

    questions: { type: [questionSchema], default: [] },
    flashcards: { type: [flashcardSchema], default: [] },

    schedule: {
      days_available: { type: Number, required: true, default: 5, min: 1, max: 60 },
      days: { type: [scheduleDaySchema], default: [] },
      _meta: {
        pinned: { type: Boolean, default: false },
        editedAt: { type: Date },
      },
    },

    coverage: {
      uncovered_requirement_ids: { type: [String], default: [] },
      passes: { type: Number, required: true, default: 0, min: 0, max: 10 },
    },

    job: {
      status: {
        type: String,
        enum: ["queued", "running", "done", "failed"],
        default: "queued",
        index: true,
      },
      progress: { type: Number, default: 0, min: 0, max: 100 },
      step: { type: String, default: null },
      error: {
        type: new Schema({ code: { type: String }, message: { type: String } }, { _id: false }),
        default: null,
      },
      model: { type: String },
      startedAt: { type: Date },
      finishedAt: { type: Date },
    },

    practice: {
      progress: { type: [practiceProgressSchema], default: [] },
    },

    version: { type: Number, default: 1 },
    generationId: { type: String },
  },
  {
    timestamps: true,
    // Internal optimistic-concurrency key. Every save() matches on __rev and
    // bumps it, so concurrent load → mutate → save cycles throw VersionError
    // instead of silently losing one writer's edits. The user-visible content
    // counter is the separate `version` path above — untouched by this.
    versionKey: "__rev",
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        // Never leak the internal revision counter to API clients.
        delete ret.__rev;
        return ret;
      },
    },
  }
);

kitSchema.index({ owner: 1, createdAt: -1 });
kitSchema.index({ owner: 1, "input.jdHash": 1 }, { unique: true, sparse: true });
kitSchema.index({ owner: 1, "source.company_url": 1 });
kitSchema.index({ generationId: 1 }, { sparse: true });

kitSchema.pre("validate", function () {
  const plain = this.toObject({ depopulate: true, versionKey: false }) as unknown;
  const result = (() => {
    try {
      validateKitDocument(plain);
      return { ok: true as const };
    } catch (e: unknown) {
      return { ok: false as const, error: e };
    }
  })();
  if (!result.ok) {
    const err = result.error as { message?: string; issues?: Array<{ message: string; path: (string | number)[] }> };
    const msg = err.issues?.[0]?.message ?? err.message ?? "Kit validation failed";
    const validationError = new Error(msg, { cause: err.issues }) as Error & { issues?: unknown };
    (validationError as unknown as Record<string, unknown>).issues = err.issues;
    throw validationError;
  }
});

kitSchema.methods.toAppendixJSON = function (): Record<string, unknown> {
  const obj = this.toObject() as IKit & { _id: unknown; __rev: unknown };
  const stripR = (r: IKitRequirement) => {
    const { _state, ...rest } = r as IKitRequirement & { _state?: unknown };
    return rest;
  };
  const stripQ = (q: IKitQuestion) => {
    const { _state, ...rest } = q as IKitQuestion & { _state?: unknown };
    return rest;
  };
  const stripF = (f: IKitFlashcard) => {
    const { _state, ...rest } = f as IKitFlashcard & { _state?: unknown };
    return rest;
  };
  return {
    source: obj.source,
    company_brief: {
      summary: obj.company_brief.summary,
      what_they_do: obj.company_brief.what_they_do,
      sources: obj.company_brief.sources,
    },
    role: {
      title: obj.role.title,
      seniority: obj.role.seniority,
      responsibilities: obj.role.responsibilities,
      requirements: obj.role.requirements.map(stripR),
    },
    questions: obj.questions.map(stripQ),
    flashcards: obj.flashcards.map(stripF),
    schedule: {
      days_available: obj.schedule.days_available,
      days: obj.schedule.days,
    },
    coverage: obj.coverage,
  };
};

export const Kit: Model<IKit> = mongoose.models.Kit ?? mongoose.model<IKit>("Kit", kitSchema);
