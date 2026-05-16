# CLAUDE.md

Project-specific conventions for this repo. The general sandbox runtime rules come from your system prompt — what's here is what's specific to *this* codebase.

## Stack

- Vite 6 + React 19 + TypeScript
- Tailwind v4 (single CSS entry: `src/index.css`)
- shadcn/ui (style `new-york`, base color `slate`), Radix primitives, Lucide icons
- Path alias `@/*` → `./src/*`
- Package manager: **npm** (`package-lock.json` is committed)

## Commands

- `npm run dev` — Vite dev server (already running in the sandbox; don't tell the user to run it)
- `npm run build` — `tsc -b && vite build`
- `npm run preview` — preview the built bundle

No test runner is configured. Don't add one unless the user explicitly asks.

## Conventions

**Layout**
- shadcn primitives in `src/components/ui/` — you may edit them directly.
- App-level components in `src/components/`.
- Hooks in `src/hooks/`.
- Utilities in `src/lib/` (`cn()` lives in `@/lib/utils`).

**Forms** — use `react-hook-form` + `zod` + `@hookform/resolvers/zod` (already installed). Don't use plain `useState` for form fields in new code.

**Styling** — Tailwind utilities + `cn()` from `@/lib/utils`. Don't introduce CSS Modules, styled-components, or emotion.

**Toasts** — `sonner` (`import { toast } from "sonner"`).

**Icons** — `lucide-react`.

**State**
- UI state: local `useState`.
- Server state: only add a data layer (React Query, SWR) once a backend exists. Don't pre-install one.

**Imports** — always use the `@/` alias for `src/*`. Relative imports only within the same folder.

## Backend

If a `supabase/` directory exists in this repo, the project has a Supabase backend connected. See `supabase/AGENTS.md` for backend conventions — edge functions, migrations, RLS, and the two client entry points (`src/integrations/supabase/client.ts` for browser, `src/integrations/supabase/admin.server.ts` for server).

If no `supabase/` directory exists, treat this as a frontend-only project. Don't invent backend code or import `@supabase/supabase-js` until the user adds Supabase via the chat UI.

## Style

- 2-space indent, double quotes, semicolons. No Prettier config — defaults are fine.
- Keep components small. Prefer composition over prop drilling.
- Comment only the non-obvious *why*. Don't narrate *what* the code does.

<!-- supabase-scaffold-pointer -->
## Supabase backend (connected)

This project has a Supabase backend wired up. See `supabase/AGENTS.md` for backend conventions, edge function patterns, RLS rules, and the two client entry points (`src/integrations/supabase/client.ts` for browser, `src/integrations/supabase/admin.server.ts` for server).
