# Pipeline

Turns a job description + company URL into an interview prep kit. Entry: `generateKit()` in `steps/orchestrator.ts`. One kit runs at a time (see `modules/kit/kit.queue.ts`).

## Steps

1. **gate** (`steps/gate.ts`) — free deterministic checks (JD length, injection regex, job signals), then one cheap LLM verdict. Junk fails here with `VALIDATION_FAILED`, before spending crawl + budget.
2. **research** — crawl company site (max 6 pages, depth 2) + public discussion search. No LLM.
3. **extract** — 3 parallel calls: role metadata (JSON) + requirements (JSON) + company brief (prose).
4. **questions** — parallel per category (technical, behavioural, system-design, company-fit), grounded to requirement ids, deduped.
5. **coverage** — up to two LLM gap passes refill uncovered requirements (bucketed by requirement kind, chunked to fit the per-call question cap, with an explicit cover-every-listed-id directive). Any must-have still uncovered gets a deterministic grounded backstop question (zero LLM calls), so a kit never ships with uncovered musts and `COVERAGE_FAILED` is unreachable outside bugs. Two passes, not more: free-tier rate limits + the 5-cases-in-15-min batch budget leave no room for unbounded retries; the backstop guarantees coverage instead of burning calls.
6. **flashcards** — runs after questions so the prompt carries the real question bank.
7. **schedule** — deterministic, no LLM. Must-first sort, day buckets, 8h cap.
8. **validate** — final `validateKitAppendix` zod gate.

## LLM layer

- `llm/zen.ts` — `ZenClient`: chat models via OpenAI-compatible endpoint, muse-spark via Responses API. JSON-only suffix, prose guard, `salvageJsonOrThrow`, 90s timeout, per-model + global (`LLM_MAX_CONCURRENT`) concurrency caps.
- `llm/failover.ts` — per-step model failover. Every attempt counts toward `LLM_MAX_CALLS_PER_KIT` (default 20). Rate-limit/bad-JSON models are disabled for the rest of the kit. Exhaustion fails the kit honestly — except coverage, where a deterministic backstop (grounded in requirement text, no new skills) covers leftover musts so one flaky refill never fails the whole case.
- `llm/gate.ts` — one in-flight request per model.
- Prompts live in `prompts/` (see `PROMPTS.md`). Untrusted content (JD, crawled pages) travels inside escaped `<DATA>` blocks models must summarize, never follow.

## Support files

- `schedule.ts` — day allocation. `coverage.ts` — uncovered-requirement math.
- `retry.ts` — backoff + `Retry-After`; large TPM waits fail over instead of retrying.
- `log.ts` — colored step logging.
