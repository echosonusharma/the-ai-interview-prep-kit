import type { Document, Types } from "mongoose";

export type RequirementOrigin = "generated" | "edited" | "user";

export interface IKitRequirementState {
  origin: RequirementOrigin;
  pinned: boolean;
  editedAt?: Date;
}

export interface IKitRequirement {
  id: string;
  text: string;
  kind: "technical" | "behavioural" | "domain";
  priority: "must" | "nice";
  _state?: IKitRequirementState;
}

export interface IKitQuestionState {
  origin: "generated" | "user";
  pinned: boolean;
  editedAt?: Date;
}

export interface IKitQuestion {
  id: string;
  requirement_ids: string[];
  category: "technical" | "behavioural" | "system-design" | "company-fit";
  prompt: string;
  answer_outline: string;
  difficulty: 1 | 2 | 3;
  _state?: IKitQuestionState;
}

export interface IKitFlashcardState {
  origin: "generated" | "user";
  pinned: boolean;
  editedAt?: Date;
}

export interface IKitFlashcard {
  id: string;
  front: string;
  back: string;
  requirement_ids: string[];
  _state?: IKitFlashcardState;
}

export interface IKitScheduleDay {
  day: number;
  focus: string;
  question_ids: string[];
  minutes: number;
}

export interface IPracticeProgress {
  flashcardId: string;
  confidence: number | null; // 1-5 or null=unseen
  attempts: number;
  lastReviewedAt?: Date;
  nextDue?: Date;
}

export interface IKit extends Document {
  _id: Types.ObjectId;
  owner: Types.ObjectId;

  input: {
    rawJd: string;
    companyUrl: string;
    days: number;
    jdHash: string;
    batchCaseId?: string;
  };

  source: {
    company: string;
    company_url: string;
    role: string;
    location: string;
    jd_chars: number;
    researched_at: string; // ISO
    pages_used: string[];
  };
  company_brief: {
    summary: string;
    what_they_do: string;
    sources: string[];
    _meta?: { pinned: boolean; editedAt?: Date };
  };
  role: {
    title: string;
    seniority: string;
    responsibilities: string[];
    requirements: IKitRequirement[];
  };
  questions: IKitQuestion[];
  flashcards: IKitFlashcard[];
  schedule: {
    days_available: number;
    days: IKitScheduleDay[];
    _meta?: { pinned: boolean; editedAt?: Date };
  };
  coverage: {
    uncovered_requirement_ids: string[];
    passes: number; // §4 second pass count
  };

  job: {
    status: "queued" | "running" | "done" | "failed";
    progress: number;
    step: string | null;
    error: { code: string; message: string } | null;
    model?: string;
    startedAt?: Date;
    finishedAt?: Date;
  };

  practice: {
    progress: IPracticeProgress[];
  };

  version: number;
  generationId?: string;

  createdAt: Date;
  updatedAt: Date;

  toAppendixJSON(): Record<string, unknown>;
}
