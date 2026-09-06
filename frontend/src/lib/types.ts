export interface User {
  id: string;
  email: string;
  name?: string;
}

export type KitStatus = "queued" | "running" | "done" | "failed";

export type RequirementOrigin = "generated" | "edited" | "user";

export interface KitRequirement {
  id: string;
  text: string;
  kind: string;
  priority: string;
  _state?: { origin: RequirementOrigin; pinned: boolean; editedAt?: string };
}

export interface KitSummary {
  id: string;
  status: KitStatus;
  progress: number;
  step: string | null;
  stage: string;
  company: string;
  role: string;
  companyUrl: string;
  days: number;
  queuePosition: number | null;
  error: { code: string; message: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface KitDetail extends KitSummary {
  kit: KitAppendix | null;
}

export interface KitAppendix {
  source: {
    company: string;
    company_url: string;
    role: string;
    location: string;
    jd_chars: number;
    researched_at: string;
    pages_used: string[];
  };
  company_brief: { summary: string; what_they_do: string; sources: string[] };
  role: {
    title: string;
    seniority: string;
    responsibilities: string[];
    requirements: KitRequirement[];
  };
  questions: Array<{
    id: string;
    requirement_ids: string[];
    category: string;
    prompt: string;
    answer_outline: string;
    difficulty: number;
  }>;
  flashcards: Array<{ id: string; front: string; back: string; requirement_ids: string[] }>;
  schedule: {
    days_available: number;
    days: Array<{ day: number; focus: string; question_ids: string[]; minutes: number }>;
  };
  coverage: { uncovered_requirement_ids: string[]; passes: number };
}

export interface KitProgressEvent {
  kitId: string;
  status: KitStatus;
  progress: number;
  step: string | null;
  label: string;
  stage: string;
  detail?: string;
  queuePosition?: number | null;
  error?: { code: string; message: string } | null;
}

export const PIPELINE_STAGES = [
  { id: "research", label: "Research" },
  { id: "extract", label: "Extract" },
  { id: "questions", label: "Questions" },
  { id: "coverage", label: "Coverage" },
  { id: "flashcards", label: "Flashcards" },
  { id: "schedule", label: "Schedule" },
] as const;

// Mirrors backend STEP_MAP labels so the panel can render poll data when SSE stalls.
export const STEP_LABELS: Record<string, string> = {
  queued: "Queued…",
  starting: "Starting…",
  requeued: "Queued…",
  gate: "Validating input",
  "gate:done": "Input valid",
  research: "Researching company site",
  "research:done": "Research complete",
  extract: "Extracting role & requirements",
  "extract:done": "Requirements extracted",
  questions: "Generating interview questions",
  "questions:done": "Questions drafted",
  coverage: "Checking coverage gaps",
  "coverage:done": "Coverage gaps filled",
  "flashcards:done": "Flashcards created",
  schedule: "Building study schedule",
  done: "Kit ready",
};

export function stepLabel(step: string | null, status: KitStatus): string {
  if (step && STEP_LABELS[step]) return STEP_LABELS[step];
  return status === "queued" ? "Waiting in queue" : "Starting…";
}

export interface DashboardStats {
  total: number;
  upcoming: number;
  prepared: number;
  preparing: number;
  prepDaysLeft: number;
}

export interface KitListResponse {
  kits: KitSummary[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    sort: string;
  };
}
export interface UpcomingInterview {
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
  stats: DashboardStats;
  upcoming: UpcomingInterview[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PracticeDeck {  stats: { total: number; reviewed: number; unseen: number; averageConfidence: number | null };
  nextFlashcardId: string | null;
  flashcards: Array<{ id: string; front: string; back: string; requirement_ids: string[] }>;
  progress: Array<{
    flashcardId: string;
    confidence: number | null;
    attempts: number;
    lastReviewedAt: string | null;
    nextDue: string | null;
  }>;
}
