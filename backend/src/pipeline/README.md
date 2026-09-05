# Pipeline

Turns a job description + company URL into an interview prep kit. Entry: `generateKit()` in `steps/orchestrator.ts`. One kit runs at a time (see `modules/kit/kit.queue.ts`).

## Steps

1. **gate** (`steps/gate.ts`) — free deterministic checks (JD length, injection regex, job signals), then one cheap LLM verdict. Junk fails here with `VALIDATION_FAILED`, before spending crawl + budget.
2. **research** — crawl company site (max 6 pages, depth 2) + public discussion search. No LLM.
3. **extract** — 3 parallel calls: role metadata (JSON) + requirements (JSON) + company brief (prose).
4. **questions** — parallel per category (technical, behavioural, system-design, company-fit), grounded to requirement ids, deduped.
5. **coverage** — one gap pass refills uncovered requirements.
6. **flashcards** — runs after questions so the prompt carries the real question bank.
7. **schedule** — deterministic, no LLM. Must-first sort, day buckets, 8h cap.
8. **validate** — final `validateKitAppendix` zod gate.

## LLM layer

- `llm/zen.ts` — `ZenClient`: chat models via OpenAI-compatible endpoint, muse-spark via Responses API. JSON-only suffix, prose guard, `salvageJsonOrThrow`, 90s timeout, per-model + global (`LLM_MAX_CONCURRENT`) concurrency caps.
- `llm/failover.ts` — per-step model failover. Every attempt counts toward `LLM_MAX_CALLS_PER_KIT` (default 20). Rate-limit/bad-JSON models are disabled for the rest of the kit. No template fallback — exhaustion fails the kit honestly.
- `llm/gate.ts` — one in-flight request per model.
- Prompts live in `prompts/` (see `PROMPTS.md`). Untrusted content (JD, crawled pages) travels inside escaped `<DATA>` blocks models must summarize, never follow.

## Support files

- `schedule.ts` — day allocation. `coverage.ts` — uncovered-requirement math.
- `retry.ts` — backoff + `Retry-After`; large TPM waits fail over instead of retrying.
- `log.ts` — colored step logging.
