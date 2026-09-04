/** Map orchestrator step names to user-facing labels and progress %. */
const STEP_MAP: Record<string, { label: string; progress: number }> = {
  queued: { label: "Queued…", progress: 0 },
  starting: { label: "Starting…", progress: 1 },
  requeued: { label: "Queued…", progress: 0 },
  research: { label: "Researching company site", progress: 8 },
  "research:done": { label: "Research complete", progress: 18 },
  extract: { label: "Extracting role & requirements", progress: 28 },
  "extract:done": { label: "Requirements extracted", progress: 38 },
  questions: { label: "Generating interview questions", progress: 48 },
  "questions:done": { label: "Questions drafted", progress: 58 },
  coverage: { label: "Checking coverage gaps", progress: 65 },
  "coverage:done": { label: "Coverage gaps filled", progress: 72 },
  "flashcards:done": { label: "Flashcards created", progress: 82 },
  schedule: { label: "Building study schedule", progress: 92 },
  done: { label: "Kit ready", progress: 100 },
};

export function stepToProgress(step: string, detail?: string): { step: string; label: string; progress: number; detail?: string } {
  const mapped = STEP_MAP[step];
  if (mapped) {
    return { step, label: mapped.label, progress: mapped.progress, detail };
  }
  return { step, label: step, progress: 5, detail };
}

export const PIPELINE_STAGES = [
  { id: "research", label: "Research" },
  { id: "extract", label: "Extract" },
  { id: "questions", label: "Questions" },
  { id: "coverage", label: "Coverage" },
  { id: "flashcards", label: "Flashcards" },
  { id: "schedule", label: "Schedule" },
] as const;

export function activeStage(step: string | null): string {
  if (!step) return "research";
  const base = step.split(":")[0]!;
  if (base === "done") return "schedule";
  if (PIPELINE_STAGES.some((s) => s.id === base)) return base;
  return "research";
}
