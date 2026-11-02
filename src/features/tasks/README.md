# Dev task backlog (`/tasks`)

In-repo development backlog for coding agents and local UI.

## Purpose

- Dev-only task board at `/tasks` for onboarding and agent work
- SSOT for active and archived tasks in JSON files
- Pre-seeded onboarding checklist on fresh clones (Supabase, Hosting, App vision, Theme)

**Intentional exception:** This feature uses local React state + `fetch` (not TanStack Query) because it is a dev-only tool backed by the Vite dev plugin, not user-facing server state.

## Structure

| Layer | Path | Purpose |
|-------|------|---------|
| Components | `components/` | `TasksBacklogPanel`, `ActiveTaskList`, `ArchiveTaskList`, task rows, `TasksAutosaveIndicator`, `TasksListEmptyState`, `taskStatusUi`, `DevTasksFab` |
| Hooks | `hooks/` | `useAppTasksBacklog` — CRUD, reorder, archive/restore, dirty-aware text autosave |
| Services | `services/` | `appTasksDomain` (validation/logic), `appTasksApiService` (HTTP to dev API) |
| Types | `types/` | `AppTask`, `ActiveTaskStatus`, file path constants |

**Config SSOT:** `src/config/app-tasks.json` (active), `src/config/app-tasks-archive.json` (done).

**Dev API (Vite serve only):** `vite-plugin-dev-tasks.ts` — `/__dev/tasks`, `/__dev/tasks/archive`, `/__dev/tasks/restore`.

**UI entry:** `DevTasksFab` (floating pill `Button` link) on all routes in dev; route `/tasks` with minimal chrome (card rows, toolbar autosave chip, no column headers).

**Bundle:** Task UI components import kit components from `src/components/common/` and icons from `lucide-react` (named, tree-shaken imports) to keep the lazy `/tasks` chunk lean in dev and production.

## User feedback policy

- **Mutation/async errors:** single fixed top `Alert` via `TasksFeedback` (tasks pattern is SSOT for non-form mutations).
- **Initial load failures:** same feedback path via `reloadForView` try/catch.

## Testing

Colocated `*.test.ts` under `services/`; shared wrappers in `tests/test-utils.tsx`. See `documentation/DOC_TESTING.md`.

## Dependencies

- `vite-plugin-dev-tasks.ts` (project root)
- shadcn/ui kit (`src/components/common/`), lucide-react, dnd-kit (reorder). Styling uses theme token utilities only (`elevation-*`, `duration-(--duration-*)`, color tokens), so rows follow the active theme and light/dark mode.
- Agent skills: `.agents/skills/loop-backlog/SKILL.md` (order, pick-up, onboarding), `loop-verdict` (archive on Pass)

## Onboarding

Fresh clones ship four pre-seeded tasks in `app-tasks.json`. Agents sync status per `loop-backlog` (catch-up and pick-up) and `loop-verdict` (archive on Pass).
