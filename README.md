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
        └── modules/health/{health.controller, health.routes}.ts
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
