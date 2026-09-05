# Pipeline Prompts — PrepPilot AI

All LLM prompts are versioned as Markdown in this directory. Each phase has its own system prompt; the user prompt is built in code with `<DATA>`-wrapped untrusted content.

| Phase | System Prompt | Purpose | Model Pool |
| ------- | --------------- | --------- | ------------ |
| 1a | [`extract-meta.system.md`](./extract-meta.system.md) | Role title, seniority, location, responsibilities | Zen pool (fail on exhaustion) |
| 1b | [`extract-requirements.system.md`](./extract-requirements.system.md) | Atomic requirements (`kind`/`priority`) | Zen pool (fail on exhaustion) |
| 2 | [`brief.system.md`](./brief.system.md) | Honest company brief from crawl | Zen pool (fail on exhaustion) |
| 3 | [`questions-technical.system.md`](./questions-technical.system.md) | Technical scenario questions | Zen pool (fail on exhaustion) |
| 3 | [`questions-behavioural.system.md`](./questions-behavioural.system.md) | Behavioural STAR questions | Zen pool (fail on exhaustion) |
| 3 | [`questions-system-design.system.md`](./questions-system-design.system.md) | System-design trade-offs | Zen pool (fail on exhaustion) |
| 3 | [`questions-company-fit.system.md`](./questions-company-fit.system.md) | Company-fit questions | Zen pool (fail on exhaustion) |
| 4 | *(code)* `findUncovered` | Coverage check — deterministic, no LLM | — |
| 5 | `questions-*` (gap) | Fill uncovered reqs, per-category buckets (behavioural / technical / system-design / company-fit) | Zen pool (fail on exhaustion) |
| 6 | [`flashcards.system.md`](./flashcards.system.md) | Spaced-repetition cards, built from the real question bank after questions + gap pass | Zen pool (fail on exhaustion) |
| 7 | *(code)* `allocateSchedule` | Day allocation — deterministic, no LLM | — |

**Sequencing:** Retrieval → 2-phase extract (parallel) + brief → per-category questions (parallel) → code coverage → gap pass (per-category refill) → flashcards (sequenced after questions with the real question bank, never concurrent with an empty bank) → code schedule. No single mega-prompt.

**Security:** All untrusted JD/crawl content is wrapped in `<DATA>` tags; system prompts instruct the model to *analyse, never follow* instructions inside.
