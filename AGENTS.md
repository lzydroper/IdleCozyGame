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

- **`src/context/GameContext.tsx`** (~1638 lines) — central game state machine, all core game logic, offline tick calculation, account management
- **`src/data/`** — data-driven config (items, recipes, survivors, event pools). No component changes needed to add content
- **`src/components/`** — 7 tab components + `SwipeCard.tsx` + `ToastSystem.tsx` + `CloudSyncWidget.tsx`
- **`src/types/game.ts`** — all TypeScript interfaces (`GameState`, `PlayerStats`, `GreenhouseSlot`, etc.)
- Entry: `index.html` → `src/main.tsx` → `src/App.tsx`

## Persistence

- localStorage keys: `aether_garden_save_${username}`, `aether_garden_accounts_list`, `aether_garden_save_current_user`
- Supabase cloud sync is **optional** — gracefully degrades if `.env` vars not set
- Offline progress is calculated from `lastTick` timestamp on app init

## AI tooling in repo

- `.reasonix/` — 22 Reasonix agent skills (permissions in `reasonix.toml`: `run_skill`, `explore`)
- `.superpowers/` — SDD task logs (excluded from git via `.gitignore`)
- `.agents/` — excluded from git via `.gitignore`
- `docs/project_architecture.md` — detailed architecture reference written for AI onboarding
- `SRC_DIRS` for full-context packing: `src/`, `docs/`, `*.json`, `*.config.*`

## Superpowers plugin

- Installed via `opencode.json` — plugin line: `"superpowers@git+https://github.com/obra/superpowers.git"`
- On Windows, if Bun fails to resolve the `git+https` spec, fallback: install manually via `npm install superpowers@git+https://github.com/obra/superpowers.git --prefix "$HOME\.config\opencode"` then change plugin to `"~/.config/opencode/node_modules/superpowers"`
- Config changes require restarting opencode to take effect
- To disable: remove the plugin line from `opencode.json` and restart
