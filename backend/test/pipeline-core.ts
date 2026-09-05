import assert from "node:assert";
import { allocateSchedule } from "../src/pipeline/schedule.js";
import { findUncovered, findUncoveredMusts } from "../src/pipeline/coverage.js";
import { salvageJson, coerceSalvagedRoot } from "../src/pipeline/llm/client.js";
import { extractionSchema } from "../src/pipeline/steps/extract.js";
import {
  cleanRequirementIds,
  categoryForRequirement,
  chunkGapBatch,
  dedupeDrafts,
  backstopDraftFor,
} from "../src/pipeline/steps/questions.js";
import { parseBriefText, looksLikeBriefReasoning } from "../src/pipeline/steps/brief.js";
import { validateKitAppendix } from "../src/validators/kit.validator.js";

let passed = 0;
function check(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`ok - ${name}`);
}

// --- schedule ---

check("schedule spans exactly the days requested", () => {
  const days = allocateSchedule({ questions: [], requirements: [], daysAvailable: 5 });
  assert.strictEqual(days.length, 5);
  assert.deepStrictEqual(days.map((d) => d.day), [1, 2, 3, 4, 5]);
});

check("1-day schedule holds everything; 60-day schedule holds shape", () => {
  const qs = [
    { id: "q1", requirement_ids: ["r1"], category: "technical" as const, difficulty: 3 as const },
    { id: "q2", requirement_ids: ["r2"], category: "behavioural" as const, difficulty: 1 as const },
  ];
  const reqs = [
    { id: "r1", priority: "must" as const, text: "React" },
    { id: "r2", priority: "nice" as const, text: "Mentoring" },
  ];
  const one = allocateSchedule({ questions: qs, requirements: reqs, daysAvailable: 1 });
  assert.strictEqual(one.length, 1);
  assert.deepStrictEqual([...one[0].question_ids].sort(), ["q1", "q2"]);
  const sixty = allocateSchedule({ questions: qs, requirements: reqs, daysAvailable: 60 });
  assert.strictEqual(sixty.length, 60);
  for (const d of sixty) {
    assert.ok(Number.isInteger(d.minutes) && d.minutes >= 1);
    assert.ok(d.focus.length > 0);
  }
});

check("harder, must-covering questions land on earlier days", () => {
  const qs = [
    { id: "q-easy", requirement_ids: ["r-nice"], category: "company-fit" as const, difficulty: 1 as const },
    { id: "q-hard", requirement_ids: ["r-must"], category: "technical" as const, difficulty: 3 as const },
    { id: "q-mid", requirement_ids: ["r-must"], category: "system-design" as const, difficulty: 2 as const },
  ];
  const reqs = [
    { id: "r-must", priority: "must" as const, text: "Systems" },
    { id: "r-nice", priority: "nice" as const, text: "Culture" },
  ];
  const days = allocateSchedule({ questions: qs, requirements: reqs, daysAvailable: 3 });
  assert.deepStrictEqual(days[0].question_ids, ["q-hard"]);
  assert.deepStrictEqual(days[1].question_ids, ["q-mid"]);
  assert.deepStrictEqual(days[2].question_ids, ["q-easy"]);
});

check("every must requirement is scheduled when a covering question exists", () => {
  const qs = [
    { id: "q1", requirement_ids: ["r1"], category: "technical" as const, difficulty: 2 as const },
    { id: "q2", requirement_ids: ["r2", "r3"], category: "behavioural" as const, difficulty: 2 as const },
  ];
  const reqs = [
    { id: "r1", priority: "must" as const, text: "A" },
    { id: "r2", priority: "must" as const, text: "B" },
    { id: "r3", priority: "nice" as const, text: "C" },
  ];
  const days = allocateSchedule({ questions: qs, requirements: reqs, daysAvailable: 4 });
  const scheduled = new Set(days.flatMap((d) => d.question_ids));
  const coveredReqs = new Set(qs.filter((q) => scheduled.has(q.id)).flatMap((q) => q.requirement_ids));
  assert.ok(coveredReqs.has("r1") && coveredReqs.has("r2"));
});

// --- coverage ---

check("coverage finds requirements with no question", () => {
  const reqs = [{ id: "r1" }, { id: "r2" }, { id: "r3" }];
  const qs = [{ id: "q1", requirement_ids: ["r1", "r2"] }];
  assert.deepStrictEqual(findUncovered(reqs, qs), ["r3"]);
});

check("coverage is empty when all covered; musts subset works", () => {
  const reqs = [
    { id: "r1", priority: "must" as const },
    { id: "r2", priority: "nice" as const },
  ];
  const qs = [
    { id: "q1", requirement_ids: ["r1"] },
    { id: "q2", requirement_ids: ["r2"] },
  ];
  assert.deepStrictEqual(findUncovered(reqs, qs), []);
  const qs2 = [{ id: "q1", requirement_ids: ["r2"] }];
  assert.deepStrictEqual(findUncoveredMusts(reqs, qs2), ["r1"]);
});

check("gap helpers: ids normalize, categories route by kind, batches chunk", () => {
  const reqs = [{ id: "r1" }, { id: "r2" }];
  assert.deepStrictEqual(cleanRequirementIds([" R1 ", "r2", "r9", 42], reqs), ["r1", "r2"]);
  assert.strictEqual(categoryForRequirement({ kind: "technical", priority: "must" }), "technical");
  assert.strictEqual(categoryForRequirement({ kind: "behavioural", priority: "must" }), "behavioural");
  assert.strictEqual(categoryForRequirement({ kind: "domain", priority: "nice" }), "company-fit");
  const chunks = chunkGapBatch(["a", "b", "c", "d", "e", "f", "g"]);
  assert.strictEqual(chunks.length, 2);
  assert.deepStrictEqual(chunks[0], ["a", "b", "c", "d", "e", "f"]);
});

check("dedupe merges requirement refs instead of dropping coverage", () => {
  const out = dedupeDrafts([
    { prompt: "Walk through X", requirement_ids: ["r1"] },
    { prompt: "walk through x ", requirement_ids: ["r5"] },
  ]);
  assert.strictEqual(out.length, 1);
  assert.deepStrictEqual([...out[0].requirement_ids].sort(), ["r1", "r5"]);
});

check("backstop draft grounds in requirement text with a valid ref", () => {
  const d = backstopDraftFor({ id: "r7", text: "3+ years with Postgres", kind: "technical", priority: "must" }, "senior");
  assert.strictEqual(d.category, "technical");
  assert.deepStrictEqual(d.requirement_ids, ["r7"]);
  assert.ok(d.prompt.includes("3+ years with Postgres"));
  assert.ok(d.answer_outline.includes(";"));
  assert.strictEqual(d.difficulty, 3);
});
check("salvageJson pulls JSON from fenced and noisy model text", () => {
  assert.deepStrictEqual(salvageJson('```json\n{"a":1}\n```'), { a: 1 });
  assert.deepStrictEqual(salvageJson('[{"a":1}]'), [{ a: 1 }]);
  assert.deepStrictEqual(salvageJson('Here is {"a":1} done'), { a: 1 });
  assert.deepStrictEqual(salvageJson('thinking aloud\n{"summary":"x","what_they_do":"y"}'), {
    summary: "x",
    what_they_do: "y",
  });
  const dup = '{"summary":"a","what_they_do":"b"}{"summary":"a","what_they_do":"b"}{"summary":"a","what_they_do":"b';
  assert.deepStrictEqual(salvageJson(dup), { summary: "a", what_they_do: "b" });
  assert.throws(() => salvageJson("no json here at all"));
});

check("coerceSalvagedRoot wraps common array mistakes", () => {
  assert.deepStrictEqual(coerceSalvagedRoot([{ text: "x", kind: "technical", priority: "must" }]), {
    requirements: [{ text: "x", kind: "technical", priority: "must" }],
  });
  assert.deepStrictEqual(coerceSalvagedRoot([{ title: "Eng", requirements: [] }]), { title: "Eng", requirements: [] });
});

check("normalizeExtractionInput fixes common model enum mistakes", () => {
  const raw = {
    title: "Engineer",
    requirements: [
      { text: "5+ years Python experience", kind: "behavioral", priority: "required" },
      { text: "React and Node.js proficiency", kind: "technical skill", priority: "must" },
      { text: "string", kind: "technical|behavioural|domain", priority: "must|nice" },
    ],
  };
  const out = extractionSchema.parse(raw);
  assert.strictEqual(out.requirements[0].kind, "behavioural");
  assert.strictEqual(out.requirements[0].priority, "must");
  assert.strictEqual(out.requirements.length, 2);
});

check("parseBriefText reads labeled plain-text sections", () => {
  const out = parseBriefText(
    "SUMMARY:\nAcme builds billing APIs for startups.\n\nWHAT_THEY_DO:\nB2B billing infrastructure."
  );
  assert.ok(out.summary.includes("billing"));
  assert.ok(out.what_they_do.includes("infrastructure"));
});

check("parseBriefText rejects reasoning-only chat model output", () => {
  const reasoning =
    "Okay, the user provided company information and wants a summary. Let me start by reading through the provided data pages.";
  assert.throws(() => parseBriefText(reasoning), /reasoning-only/);
  assert.ok(looksLikeBriefReasoning(reasoning));
});

check("parseBriefText salvages truncated brief when SUMMARY is complete", () => {
  const truncated =
    "SUMMARY: UNIS is an asset-based 3PL company founded in 1989 with 50+ facilities nationwide serving 1,200+ customers. No hiring process details were found.\n\nWHAT_THE";
  const out = parseBriefText(truncated);
  assert.ok(out.summary.includes("3PL"));
  assert.ok(out.what_they_do.length > 10);
});

check("parseBriefText salvages summary-only when WHAT_THEY_DO never arrives", () => {
  const truncated = "SUMMARY:\nAcme builds billing APIs for startups and enterprises across fintech.";
  const out = parseBriefText(truncated);
  assert.ok(out.summary.includes("billing"));
  assert.ok(out.what_they_do.length > 5);
});

// --- structure validation ---

check("appendix validator rejects float minutes and dangling refs", () => {
  const base = {
    source: { company: "Acme", company_url: "http://x", role: "Eng", location: "", jd_chars: 10, researched_at: new Date().toISOString(), pages_used: [] },
    company_brief: { summary: "s", what_they_do: "w", sources: [] },
    role: { title: "Eng", seniority: "", responsibilities: [], requirements: [{ id: "r1", text: "X", kind: "technical", priority: "must" }] },
    questions: [{ id: "q1", requirement_ids: ["r1"], category: "technical", prompt: "p", answer_outline: "a", difficulty: 2 }],
    flashcards: [{ id: "f1", front: "f", back: "b", requirement_ids: ["r1"] }],
    schedule: { days_available: 1, days: [{ day: 1, focus: "f", question_ids: ["q1"], minutes: 60 }] },
    coverage: { uncovered_requirement_ids: [], passes: 1 },
  };
  validateKitAppendix(base); // should not throw
  assert.throws(() =>
    validateKitAppendix({ ...base, schedule: { days_available: 1, days: [{ day: 1, focus: "f", question_ids: ["q-nope"], minutes: 60.5 }] } })
  );
});

console.log(`\n${passed} pipeline checks passed`);
