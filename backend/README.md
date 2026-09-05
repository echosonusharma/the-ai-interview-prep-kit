# Backend

Express + TypeScript + MongoDB API serving interview prep kits. Session auth (Mongo-backed cookies), one-at-a-time kit generation worker, LLM pipeline for content.

## Layout

- `src/index.ts` — boot: connects Mongo, starts kit worker, listens, graceful shutdown.
- `src/app.ts` — middleware + route mounts (`/api/health`, `/api/auth`, `/api/kits`).
- `src/modules/` — route domains: `auth` (signup/login/logout/me), `health`, `kit` (CRUD, builder edits, practice, SSE progress, regeneration, delete).
- `src/pipeline/` — kit generation: gate → research → extract → questions → coverage → flashcards → schedule. See `src/pipeline/README.md`.
- `src/crawler/` — polite company-site crawler (robots.txt, rate limits, SSRF guards). See `src/crawler/README.md`.
- `src/models/` — `User`, `Kit` Mongoose schemas (optimistic `__rev` locking, pre-validate zod check).
- `src/validators/` — `kit.validator.ts` (kit document shape), `http.validator.ts` (request intake).
- `src/middleware/` — auth gate, zod `validate`, rate limits, origin check, error mapping.
- `src/config/` — env (zod-parsed, fail-fast), DB, per-step LLM token caps.
- `src/scripts/evaluate.ts` — batch kit evaluation harness.
- `test/` — `pipeline-core` (unit), `pipeline-e2e` (stub-LLM generation), `crawler-comprehensive`, `kit-progress`.

## Request flow

`requireAuth` → `validate` (zod body/query/params, 400 with details) → controller → service → Mongo. Mutations return serialized kit detail; live progress streams over SSE (`GET /kits/:id/events`, resumable via `Last-Event-ID`).

Kit creation only queues a doc (`job.status: queued`); the global worker (`kit.queue.ts`) claims FIFO, runs `generateKit`, marks done/failed with error codes. Delete is owner-scoped, blocked while queued/running.

## Env

Copy `.env.example` to `.env`. Required: `MONGODB_URI`, `SESSION_SECRET` (32+ chars in production), `OPENCODE_API_KEY` for Zen LLM access. See `src/config/env.ts` for all knobs (model lists, budgets, timeouts).

## Scripts

- `npm run dev` — watch mode. `npm run build` / `npm start` — compiled server.
- `npm run typecheck` — `tsc --noEmit`.
- `npm run test:pipeline` / `test:pipeline:e2e` / `test:crawler` / `test:kit`.
- `npm run evaluate -- --input cases.json --output kits.json` — batch evaluation.
