import type { IKitQuestion, IKitRequirement, IKitScheduleDay } from "../types/kit.types.js";

export interface ScheduleInput {
  questions: Pick<IKitQuestion, "id" | "requirement_ids" | "category" | "difficulty">[];
  requirements: Pick<IKitRequirement, "id" | "priority" | "text">[];
  daysAvailable: number;
}

const MAX_MINUTES_PER_DAY = 8 * 60;

function minutesFor(difficulty: 1 | 2 | 3): number {
  return difficulty === 1 ? 30 : difficulty === 2 ? 45 : 60;
}


export function allocateSchedule(input: ScheduleInput): IKitScheduleDay[] {
  const daysAvailable = Math.max(1, Math.min(60, Math.floor(input.daysAvailable)));
  const mustSet = new Set(input.requirements.filter((r) => r.priority === "must").map((r) => r.id));

  const scored = input.questions.map((q) => ({
    q,
    coversMust: q.requirement_ids.some((rid) => mustSet.has(rid)),
  }));
  scored.sort(
    (a, b) =>
      Number(b.coversMust) - Number(a.coversMust) ||
      b.q.difficulty - a.q.difficulty ||
      (a.q.id < b.q.id ? -1 : 1)
  );

  const buckets: (typeof scored)[] = Array.from({ length: daysAvailable }, () => []);
  if (scored.length === 0) {
    // no questions: all days remain empty review
  } else if (scored.length < daysAvailable) {
    scored.forEach((item, i) => {
      buckets[i].push(item);
    });
  } else {
    const base = Math.floor(scored.length / daysAvailable);
    const rem = scored.length % daysAvailable;
    let idx = 0;
    for (let d = 0; d < daysAvailable; d++) {
      const count = base + (d < rem ? 1 : 0);
      for (let k = 0; k < count; k++) {
        if (idx < scored.length) buckets[d].push(scored[idx++]);
      }
    }
  }

  for (let d = 0; d < buckets.length - 1; d++) {
    while (buckets[d].reduce((sum, s) => sum + minutesFor(s.q.difficulty), 0) > MAX_MINUTES_PER_DAY && buckets[d].length > 1) {
      let idx = 0;
      for (let k = 1; k < buckets[d].length; k++) {
        const a = buckets[d][k];
        const b = buckets[d][idx];
        if (a.q.difficulty < b.q.difficulty || (a.q.difficulty === b.q.difficulty && a.q.id > b.q.id)) idx = k;
      }
      const [moved] = buckets[d].splice(idx, 1);
      buckets[d + 1].unshift(moved);
      if (buckets[d + 1].reduce((sum, s) => sum + minutesFor(s.q.difficulty), 0) <= MAX_MINUTES_PER_DAY) break;
    }
  }

  return buckets.map((items, i) => {
    const ids = items.map((s) => s.q.id);
    const minutes = items.reduce((sum, s) => sum + minutesFor(s.q.difficulty), 0);
    const cats = items.map((s) => s.q.category);
    return {
      day: i + 1,
      focus: focusFor(cats, ids.length, minutes || 30),
      question_ids: ids,
      minutes: Math.max(1, Math.min(MAX_MINUTES_PER_DAY, minutes || 30)),
    };
  });
}

function focusFor(categories: string[], count: number, minutes: number): string {
  if (categories.length === 0) return "Review & consolidation — light review, revisit prior cards and open requirements";
  const counts = new Map<string, number>();
  for (const c of categories) counts.set(c, (counts.get(c) ?? 0) + 1);
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0][0];
  const label: Record<string, string> = {
    technical: "Technical depth",
    behavioural: "Behavioural stories",
    "system-design": "System design",
    "company-fit": "Company fit",
  };
  const base = label[top] ?? top;
  if (categories.length === 1) return `${base} focus — ${count} question${count > 1 ? "s" : ""} · ${minutes} min`;
  return `${base} + ${categories.length - 1} more area${categories.length > 2 ? "s" : ""} — ${count} questions · ${minutes} min`;
}
