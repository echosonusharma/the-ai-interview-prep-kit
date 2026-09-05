import { readFile, writeFile } from "node:fs/promises";
import { z } from "zod";
import { generateKit } from "../pipeline/steps/orchestrator.js";
import { GATE_REJECTION_PREFIX } from "../pipeline/steps/gate.js";
import { describeProviders, env } from "../config/env.js";
import pc from "picocolors";
import { logStyle as s } from "../pipeline/log.js";

const caseSchema = z.object({
  id: z.string().min(1),
  jd: z.string(),
  company_url: z.string(),
  days: z.number(),
});
const inputSchema = z.array(caseSchema);

function errorCode(message: string): string {
  if (/timed out after/i.test(message)) return "CASE_TIMEOUT";
  if (/unreachable|enotfound|econn|timeout|fetch failed/i.test(message)) return "COMPANY_UNREACHABLE";
  if (message.startsWith(GATE_REJECTION_PREFIX)) return "VALIDATION_FAILED";
  if (/coverage incomplete/i.test(message)) return "COVERAGE_FAILED";
  if (/budget/i.test(message)) return "LLM_FAILED";
  return "PIPELINE_FAILED";
}

function fmtMs(ms: number): string {
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Case timed out after ${ms}ms (${label})`)),
      ms
    );
    promise.then(resolve, reject).finally(() => clearTimeout(timer));
  });
}

function colorStep(step: string): string {
  const [phase, rest] = step.includes(":") ? [step.split(":")[0], step.slice(step.indexOf(":"))] : [step, ""];
  const colored =
    phase === "research" ? s.info(phase) :
    phase === "extract" ? s.step(phase) :
    phase === "questions" ? pc.magenta(phase) :
    phase === "coverage" ? s.warn(phase) :
    phase === "flashcards" ? pc.cyan(phase) :
    phase === "schedule" ? s.detail(phase) :
    phase === "done" ? s.ok(phase) :
    s.step(phase);
  return rest ? `${colored}${s.detail(rest)}` : colored;
}

async function main() {
  const args = process.argv.slice(2);
  const argValue = (flag: string): string | undefined => {
    const i = args.indexOf(flag);
    if (i < 0) return undefined;
    const value = args[i + 1];
    return value && !value.startsWith("--") ? value : undefined;
  };
  const inputPath = argValue("--input");
  const outputPath = argValue("--output");
  if (!inputPath || !outputPath) {
    console.error(s.fail("Usage: npm run evaluate -- --input <cases.json> --output <kits.json>"));
    if (!inputPath) console.error(s.fail("Missing required flag: --input <cases.json>"));
    if (!outputPath) console.error(s.fail("Missing required flag: --output <kits.json>"));
    process.exit(1);
  }

  const cases = inputSchema.parse(JSON.parse(await readFile(inputPath, "utf8")));
  const kits: unknown[] = [];
  const concurrency = Math.max(1, env.BATCH_CONCURRENCY);
  const t0 = Date.now();

  console.log(`\n${s.bold("Evaluating")} ${s.caseTag(String(cases.length))} case(s) — concurrency ${s.info(String(concurrency))}, timeout ${s.info(fmtMs(env.CASE_TIMEOUT_MS))}`);
  console.log(`${s.detail("Providers:")} ${describeProviders()} ${s.dim("(failover per step; LLM failure fails the case)")}\n`);

  for (let i = 0; i < cases.length; i += concurrency) {
    const batch = cases.slice(i, i + concurrency);
    const results = await Promise.all(
      batch.map(async (c, j) => {
        const idx = i + j;
        const start = Date.now();
        const tag = `[${idx + 1}/${cases.length}] ${c.id}`;
        console.log(`${s.caseTag(tag)} ${s.dim("→")} ${c.company_url} ${s.detail(`(${c.days}d)`)}`);
        const onProgress = (step: string, detail?: string) => {
          const elapsed = s.elapsed(fmtMs(Date.now() - start).padStart(6));
          const suffix = detail ? ` ${s.dim("—")} ${s.detail(detail)}` : "";
          console.log(`  ${elapsed}  ${colorStep(step)}${suffix}`);
        };
        try {
          const { kit, warnings } = await withTimeout(
            generateKit({
              jd: c.jd,
              companyUrl: c.company_url,
              days: c.days,
              onProgress,
            }),
            env.CASE_TIMEOUT_MS,
            c.id
          );
          const musts = kit.role.requirements.filter((r) => r.priority === "must").length;
          const total = s.elapsed(fmtMs(Date.now() - start));
          console.log(
            `  ${s.ok("✓")} ${s.caseTag(tag)} ${s.ok("ok")} ${s.dim("—")} ${kit.role.requirements.length} reqs (${musts} must), ${kit.questions.length} qs, ${kit.flashcards.length} cards, ${kit.source.pages_used.length} pages ${s.dim("—")} ${total}`
          );
          if (warnings.length) console.log(`    ${s.warn("warnings:")} ${warnings.join(" | ").slice(0, 300)}`);
          if (kit.coverage.uncovered_requirement_ids.length) {
            console.log(`    ${s.warn("uncovered:")} ${kit.coverage.uncovered_requirement_ids.join(", ")}`);
          }
          return { id: c.id, status: "ok" as const, kit, error: null };
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          const total = s.elapsed(fmtMs(Date.now() - start));
          const limit = message.includes("Raw output") ? 1500 : 400;
          console.log(`  ${s.fail("✗")} ${s.caseTag(tag)} ${s.fail("failed")} ${s.dim(`(${total})`)} ${s.dim("—")} ${s.fail(message.slice(0, limit))}`);
          return { id: c.id, status: "failed" as const, kit: null, error: { code: errorCode(message), message } };
        }
      })
    );
    kits.push(...results);
    const done = kits.length;
    const pct = Math.round((done / cases.length) * 100);
    console.log(`\n${s.info("—")} Progress: ${s.bold(`${done}/${cases.length}`)} (${pct}%) ${s.dim("—")} ${s.elapsed(fmtMs(Date.now() - t0))} elapsed ${s.info("—")}\n`);
  }

  await writeFile(outputPath, JSON.stringify({ version: "1.0", generated_at: new Date().toISOString(), kits }, null, 2));
  const failed = kits.filter((k) => (k as { status: string }).status === "failed").length;
  const ok = kits.length - failed;
  const summary =
    failed === 0
      ? `${s.ok(`${ok} ok`)} ${s.dim("in")} ${s.elapsed(fmtMs(Date.now() - t0))} ${s.dim("→")} ${outputPath}`
      : `${s.ok(`${ok} ok`)}, ${s.fail(`${failed} failed`)} ${s.dim("in")} ${s.elapsed(fmtMs(Date.now() - t0))} ${s.dim("→")} ${outputPath}`;
  console.log(`${s.bold("Done:")} ${summary}`);
  process.exit(0);
}

main().catch((e) => {
  console.error(s.fail(e instanceof Error ? e.message : String(e)));
  process.exit(1);
});
