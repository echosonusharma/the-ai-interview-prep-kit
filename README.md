# PrepPilot AI — The AI Interview Prep Kit

Monorepo with a polished Next.js (TypeScript + Tailwind) frontend and Express (TypeScript) backend.
App name: **PrepPilot AI** (formerly ElevateAI).

## Repo Structure

```bash
.
├── frontend/                 # Next.js 16 (App Router, Turbopack) + Tailwind v4
│   └── src/
│       ├── app/              # Next.js App Router — THIN pages only (routing)
│       │   ├── layout.tsx    # Root layout (fonts, global css)
│       │   ├── (app)/        # Authed app shell (full-bleed, fixed expandable sidebar)
│       │   │   ├── layout.tsx# AppShell wrapper
│       │   │   ├── page.tsx          → Dashboard
│       │   │   ├── practice/page.tsx → Practice
│       │   │   ├── resources/page.tsx→ Resources
│       │   │   ├── community/page.tsx→ Community
│       │   │   └── settings/page.tsx → Settings
│       │   └── (auth)/       # Centered auth shell (no sidebar)
│       │       ├── layout.tsx
│       │       ├── login/page.tsx
│       │       └── signup/page.tsx
│       ├── components/
│       │   ├── layout/       # AppShell, Topbar, Sidebar (fixed, expandable)
│       │   └── ui/           # Card, Button, Badge — design-system primitives
│       ├── features/         # Domain views (pages delegate here)
│       │   ├── dashboard/DashboardView.tsx
│       │   ├── practice/PracticeView.tsx
│       │   ├── resources/ResourcesView.tsx
│       │   ├── community/CommunityView.tsx
│       │   ├── settings/SettingsView.tsx
│       │   └── auth/{LoginView,SignupView}.tsx
│       ├── config/           # site.ts, nav.ts (single source of truth)
│       ├── lib/              # utils (cn)
│       └── hooks/            # reusable hooks
└── backend/                  # Node 18+ / Express 5 / TypeScript
    └── src/
        ├── app.ts            # createApp() factory
        ├── index.ts          # listens via env.PORT
        ├── config/env.ts    # typed env (dotenv)
        ├── middleware/{notFound,errorHandler}.ts
        ├── modules/health/{health.controller, health.routes}.ts
        ├── crawler/          # company-site crawl (robots, rate-limit, scoring)
        ├── pipeline/         # research + generation pipeline
        │   ├── llm/{client,zen,failover}.ts  # Zen failover chain
        │   ├── steps/{extract,brief,questions,flashcards,orchestrator}.ts
        │   ├── schedule.ts   # deterministic day allocation (code, not LLM)
        │   ├── coverage.ts   # code-computed gap check
        │   └── retry.ts      # backoff + Retry-After for 429/5xx
        ├── scripts/evaluate.ts  # batch entry point (§9)
        ├── validators/kit.validator.ts  # Appendix-A Zod schemas
        └── models/kit.model.ts
```

## Conventions

- **Pages are thin** — `src/app/**/page.tsx` only imports a feature view (`src/features/**`). No JSX business logic in `app/`.
- **Components are layered** — `components/layout` (shell) and `components/ui` (design tokens: `#e7e9f5` canvas, `#0b1220` ink, `#5b5bf5` accent, `#e6e8f2` border) are reusable; `features/**` composes them.
- **Config-driven nav** — `config/nav.ts` drives `Sidebar` + future breadcrumbs.
- **Backend is modular** — `modules/<domain>/` holds `*.controller` + `*.routes`; `middleware/` and `config/` are separate.

## Dev

```bash
# frontend
cd frontend && npm install && npm run dev   # http://localhost:3000
npm run build # static export check (7 routes)

# backend
cd backend && npm install && npm run dev    # http://localhost:5000
npm run build && npm start
```

## Research pipeline (backend)

Linear, deliberate steps — one small model call per step, each seeing only
what it needs. No LangGraph: the flow is a straight line plus one bounded
loop, so a typed orchestrator (`generateKit`) is easier to test and defend.

1. **Research** — `crawlCompanySite` (keyword-ranked BFS, robots.txt,
   1 req/s/host, retries) + `searchPublicDiscussion`, in parallel. Either may
   fail; gaps are recorded honestly, never fatal.
2. **Extract** — JD → title/seniority/responsibilities/requirements. Stable
   `rN` ids are assigned in code. Only stated requirements; thin JD → thin kit.
3. **Brief** — company summary from crawled pages + hiring-process notes.
4. **Questions** — one call per category (`technical`, `behavioural`,
   `system-design`, `company-fit`), each with its own instructions and only
   relevant requirements. `qN` ids assigned in code; unknown refs dropped.
5. **Second pass** — code-computed coverage (`findUncovered`); uncovered
   requirements trigger a targeted gap call, then re-check. Max 2 passes;
   must-haves still uncovered fail the run. `coverage.passes`
   records actual passes.
6. **Flashcards**, then **schedule** — deterministic allocation in code:
   exactly `days` days, must-covering + harder questions chunked early,
   integer minutes from difficulty (30/45/60). Every emitted kit is validated
   against the Appendix-A schema before return.

### LLM providers (failover chain per step)

| Order | Provider | Notes |
|---|---|---|
| 1 | OpenCode Zen free tier (8 models) | OpenAI-compatible `https://opencode.ai/zen/v1` via AI SDK; `Bearer public`, no key; requests mimic opencode CLI headers |

Zen pool (env-overridable): Muse models for JSON steps (extract, questions, flashcards); chat models (`big-pickle`, `mimo`, `nemotron-ultra`) for plain-text brief. Nemotron Lightning and Ling are excluded from auto-routing. Fetched pages and the JD are wrapped as delimited untrusted `<DATA>`; the model never receives them as instructions. No template fallback: if every model fails, extract yields nothing from a real JD, or must-haves stay uncovered after the gap passes, the case records `failed`.

Observed free-tier behavior (Sep 2026): upstream 502s ("Service temporarily
overloaded") and slow reasoning calls happen — hence per-step failover,
`salvageJson` (Zen lacks structured-output support, so malformed JSON is
re-parsed from raw text before failing over), 90s per-call aborts, trimmed
token budgets, and question calls skipped entirely when extraction yields zero
requirements. A full live kit took ~12 min solo; keep `BATCH_CONCURRENCY=2`
and expect the batch budget to be dominated by provider latency, not crawl.

### Batch entry point (§9)

```bash
cd backend && npm install
npm run evaluate -- --input <cases.json> --output <kits.json>
```

Runs the same `generateKit` as the app (no parallel implementation),
concurrency capped by `BATCH_CONCURRENCY=2`, per-case timeout via
`CASE_TIMEOUT_MS` (default 4 min), per-case `try/catch` so one
failure never aborts the run (`failed` only when no kit could be produced).
Loopback company URLs are allowed outside production for the local grader.
No credentials required — Zen uses `Bearer public`. See `backend/.env.example`.

### Tests

```bash
cd backend
npm run test:pipeline     # schedule, coverage, structure validation
npm run test:pipeline:e2e  # stub-LLM success, dead-LLM failure, coverage failure (no network)
npm run test:crawler      # existing crawler suite
```
