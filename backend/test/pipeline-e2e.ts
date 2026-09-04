import assert from "node:assert";
import { createServer } from "node:http";
import type { z } from "zod";
import { generateKit } from "../src/pipeline/steps/orchestrator.js";
import { validateKitAppendix } from "../src/validators/kit.validator.js";
import type { LlmClient, ObjectPrompt } from "../src/pipeline/llm/client.js";

// Deterministic stub: no network, no Zen. Routes on the system-prompt
// header and covers whatever requirement ids the user prompt lists.

const RICH_REQS = [
  { text: "5+ years experience with Python and React", kind: "technical", priority: "must" },
  { text: "Design distributed systems on AWS with PostgreSQL", kind: "technical", priority: "must" },
  { text: "Mentor junior engineers and collaborate with stakeholders", kind: "behavioural", priority: "must" },
  { text: "Go experience", kind: "technical", priority: "nice" },
] as const;

function idsIn(prompt: ObjectPrompt): string[] {
  const ids = prompt.user.match(/\[r\d+\]/g) ?? [];
  return [...new Set(ids.map((s) => s.slice(1, -1)))];
}

function stubFor(mode: "ok" | "no-questions" | "dead"): LlmClient {
  const briefText =
    "SUMMARY:\nAcme Corp builds billing infrastructure for startups. Early-stage team with a take-home, systems, and values interview loop.\n\nWHAT_THEY_DO:\nBilling infrastructure for startups.";

  return {
    provider: "stub",
    async generateText(prompt: ObjectPrompt, model: string) {
      if (mode === "dead") throw new Error("stub LLM down");
      if (!prompt.system.includes("# Research — Company Brief")) {
        throw new Error(`stub: unknown text prompt ${prompt.system.slice(0, 40)}`);
      }
      return { text: briefText, model };
    },
    async generateObject<T>(prompt: ObjectPrompt, schema: z.ZodType<T>, model: string) {
      if (mode === "dead") throw new Error("stub LLM down");
      const sys = prompt.system;
      let raw: unknown;
      if (sys.includes("# Extract — Role Metadata")) {
        raw = {
          title: "Senior Backend Engineer",
          seniority: "senior",
          location: "Remote",
          responsibilities: ["Own backend services end to end", "Mentor junior engineers"],
        };
      } else if (sys.includes("# Extract — Requirements")) {
        raw = { requirements: [...RICH_REQS] };
      } else if (sys.includes("# Questions")) {
        const ids = idsIn(prompt).slice(0, 2);
        raw = {
          questions:
            mode === "no-questions"
              ? []
              : ids.map((id, i) => ({
                  prompt: `Stub question ${i + 1} covering ${id}`,
                  answer_outline: "Outline: approach — trade-offs — validation",
                  difficulty: 2,
                  requirement_ids: [id],
                })),
        };
      } else if (sys.includes("# Flashcards")) {
        const ids = idsIn(prompt).slice(0, 4);
        raw = {
          flashcards: ids.map((id, i) => ({
            front: `Stub card ${i + 1} for ${id}`,
            back: "Recall cue with pitfall",
            requirement_ids: [id],
          })),
        };
      } else {
        throw new Error(`stub: unknown prompt ${sys.slice(0, 40)}`);
      }
      return { object: schema.parse(raw) as T, model };
    },
  };
}

function fixtureServer(): Promise<{ url: string; close: () => Promise<void> }> {
  const server = createServer((req, res) => {
    if (req.url === "/careers") {
      res.writeHead(200, { "content-type": "text/html" });
      res.end(`<html><head><title>Careers</title></head><body><main>
        <h1>How we hire</h1><p>Our process: take-home assignment, then a systems interview, then a values interview.</p>
        <a href="/">Home</a></main></body></html>`);
    } else {
      res.writeHead(200, { "content-type": "text/html" });
      res.end(`<html><head><title>Acme Corp - Build things</title></head><body><main>
        <h1>Acme Corp</h1><p>Acme Corp builds billing infrastructure for startups.</p>
        <a href="/careers">Careers</a> <a href="/about">About</a></main></body></html>`);
    }
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      const port = typeof addr === "object" && addr ? addr.port : 0;
      resolve({ url: `http://127.0.0.1:${port}/`, close: () => new Promise((r) => server.close(() => r())) });
    });
  });
}

const RICH_JD = `Senior Backend Engineer
We are looking for a Senior Backend Engineer with 5+ years of Python and React experience.
Required: distributed systems design, PostgreSQL, AWS.
You will mentor junior engineers and collaborate with product stakeholders.
Bonus points for Go experience and prior fintech work.`;

// Case 1: stub LLM ok → full valid kit, musts covered + scheduled.
{
  const fixture = await fixtureServer();
  try {
    const { kit, provenance } = await generateKit({
      jd: RICH_JD,
      companyUrl: fixture.url,
      days: 5,
      llm: stubFor("ok"),
      skipPublicSearch: true,
    });
    validateKitAppendix(kit);
    assert.ok(kit.source.pages_used.length > 0, "expected crawled pages");
    assert.strictEqual(kit.role.title, "Senior Backend Engineer");
    assert.strictEqual(kit.role.requirements.length, 4);
    const musts = kit.role.requirements.filter((r) => r.priority === "must").map((r) => r.id);
    assert.deepStrictEqual(kit.coverage.uncovered_requirement_ids, []);
    const scheduledReqs = new Set(
      kit.questions.filter((q) => kit.schedule.days.flatMap((d) => d.question_ids).includes(q.id)).flatMap((q) => q.requirement_ids)
    );
    for (const m of musts) assert.ok(scheduledReqs.has(m), `must ${m} scheduled`);
    assert.strictEqual(kit.schedule.days.length, 5);
    assert.strictEqual(provenance.extract.provider, "stub");
    console.log(`ok - stub LLM success: ${kit.role.requirements.length} reqs, ${kit.questions.length} qs, ${kit.flashcards.length} cards`);
  } finally {
    await fixture.close();
  }
}

// Case 2: stub LLM dead → generateKit rejects (no template fallback).
{
  await assert.rejects(
    () => generateKit({ jd: RICH_JD, companyUrl: "http://127.0.0.1:9/dead/", days: 3, llm: stubFor("dead"), skipPublicSearch: true }),
    /stub LLM down/
  );
  console.log("ok - dead LLM fails the run instead of templating");
}

// Case 3: LLM returns no questions → gap passes stay empty → coverage throw.
{
  const fixture = await fixtureServer();
  try {
    await assert.rejects(
      () =>
        generateKit({
          jd: RICH_JD,
          companyUrl: fixture.url,
          days: 3,
          llm: stubFor("no-questions"),
          skipPublicSearch: true,
        }),
      /Coverage incomplete/
    );
    console.log("ok - uncovered must-haves fail the run");
  } finally {
    await fixture.close();
  }
}

console.log("\ne2e pipeline checks passed");
