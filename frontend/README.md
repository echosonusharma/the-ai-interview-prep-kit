# PrepPilot AI - Frontend

Next.js interview prep kits: company brief, questions, flashcards, study schedule, practice mode.

## Run

```bash
npm install
cp .env.example .env.local  # set NEXT_PUBLIC_API_URL
npm run dev                 # http://localhost:3000
```

| Script       | What            |
| ------------ | --------------- |
| `npm run dev`   | dev server   |
| `npm run build` / `start` | prod build / serve |
| `npm run lint`  | eslint          |

## Structure

- `src/app/(app)/kits/` - kit routes (detail, builder, practice, new)
- `src/features/kits/` - kit UI: detail, builder, practice, deck
- `src/features/*` - dashboard, auth, community, practice, resources, settings
- `src/components/ui/` - Button, Card, Badge, Select, logos
- `src/components/{theme,layout}` - dark mode, shell, topbar
- `src/lib/` - `api.ts` (backend client), `types.ts`, `validate.ts`, `format.ts`

## Core packages

Next 16, React 19, Tailwind 4, `react-day-picker` (schedule calendar), `lucide-react` (icons). Backend at `NEXT_PUBLIC_API_URL` (default `http://localhost:5000`).
