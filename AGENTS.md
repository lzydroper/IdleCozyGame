# AetherGarden — Agent Guide

## Commands

| Command | Action |
|---|---|
| `npm run dev` | Start Vite dev server (port 5173) |
| `npm run build` | `tsc -b && vite build` — run both, order matters |
| `npm run lint` | `oxlint` (no ESLint in this repo) |
| `npx vitest run` | Run all tests |
| `npx vitest run src/components/WorkshopTab.test.tsx` | Single test file |

## TypeScript strictness (tsconfig.app.json)

- `verbatimModuleSyntax: true` → all type-only imports **must** use `import type { ... }`
- `erasableSyntaxOnly: true` → no `enum`, no `namespace`, no parameter properties
- `noUnusedLocals` / `noUnusedParameters` both on

## Tech stack

- **React 19** + **Vite 8** + **Tailwind CSS 4** (via `@tailwindcss/vite` plugin, no PostCSS config)
- **Vitest 4** + **jsdom** + **@testing-library/react**
- **Oxlint** for linting (config in `.oxlintrc.json`, rules: `react/rules-of-hooks`, `react/only-export-components`)

## Testing patterns

- Components must be wrapped in `<GameProvider>` + `<ToastProvider>` in tests
- Each test hydrates game state by writing JSON to `localStorage` key `aether_garden_save_Guest` **before** render
- Default account is `Guest` — always set `aether_garden_save_current_user` pre-test
- Tests using timers must call `vi.useFakeTimers()` in `beforeEach` and `vi.useRealTimers()` in `afterEach`
- Component tests need `// @vitest-environment jsdom` at file top

## Project architecture

- **`src/context/GameContext.tsx`** (~1392 lines) — central game state machine, all core game logic, offline tick calculation, account management
- **`src/configs/`** — config layer: `types/` (domain interfaces), `constants/` (numeric/UI constants), `loaders/` (json import + assertion + DEV guard, per-domain), `mappings/iconMap.ts` (iconKey → Lucide) + `mappings/artMap.ts` (icon string → GameArt), `seed/initialState.ts`. Consumers import ONLY from loaders/constants/types — never from json directly
- **Visuals（icon 单字段）** — json rows carry ONE `icon` string: a `.png` path relative to `src/assets/sprites/` (build-pipeline, hashed URLs, missing file fails the build) or a Lucide iconKey. Loaders resolve to `GameArt` (`{kind:'image'|'glyph'}`); render via `GameIcon`. No `sprite {sheet,index}` / `iconKey` fields remain
- **`public/`** — root-level static files served verbatim (currently only `favicon.svg`). Runtime-string-addressed assets belong here ONLY if they cannot go through the import pipeline
- **`src/data/`** — pure `.json` content data organized by gameplay domain (`regions/<NN_id>/`, `entities/{heroes,enemies}/`, `equipment/`, `items/`, `workshop/`, `shelter/`, `farming/`, `events/`, `combat/`, `progression/`). **JSON only — no .ts files**; identity comes from json content fields (e.g. `id`), folder naming is convention not contract
- **`src/types/config.ts`** — pure configuration interfaces (`PassiveEffect`, `CostFormula`, `UpgradePath`)
- **`src/types/game.ts`** — all TypeScript interfaces (`GameState`, `PlayerStats`, `GreenhouseSlot`, etc.)
- **`src/components/`** — 7 tab components + `SwipeCard.tsx` + `ToastSystem.tsx` + `CloudSyncWidget.tsx`
- Entry: `index.html` → `src/main.tsx` → `src/App.tsx`

## Persistence

- localStorage keys: `aether_garden_save_${username}`, `aether_garden_accounts_list`, `aether_garden_save_current_user`
- Supabase cloud sync is **optional** — gracefully degrades if `.env` vars not set
- Offline progress is calculated from `lastTick` timestamp on app init

## AI tooling in repo

- `.reasonix/` — 22 Reasonix agent skills (permissions in `reasonix.toml`: `run_skill`, `explore`)
- `.agents/` — excluded from git via `.gitignore`
- `docs/project_architecture.md` — detailed architecture reference written for AI onboarding
- `SRC_DIRS` for full-context packing: `src/`, `docs/`, `*.json`, `*.config.*`

## Agent skills

### Issue tracker

Issues and PRDs for this repo live as markdown files under `.scratch/<feature-slug>/` (local-markdown tracker). See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context layout — one `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
