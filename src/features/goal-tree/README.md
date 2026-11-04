# goal-tree

## Purpose

Read-only navigation of the shared goal tree ("Point At"): zoomable nested tiles, node focus pages, role views (thinking work for token donors, actions for executors) and search. Changes happen through agents over MCP, so the UI never writes; it points people at the MCP URL instead. The tree is the app's home route.

## Structure

| Layer      | Path                                                        | Purpose                                                                                               |
| ---------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Types      | `types/goalTree.types.ts`, `types/goalTreeLabels.ts`        | API shapes (copied from the prototype store) and display labels/copy                                  |
| Services   | `services/goalTreeApiService.ts`                            | Plain `fetch` client for the `point-at` Edge Function read API; `GoalTreeNotConfiguredError`; MCP URL |
| Hooks      | `hooks/useGoalTreeQueries.ts`, `hooks/useGoalTreeMcpUrl.ts` | TanStack Query hooks with `goalTreeKeys`; MCP URL for the hint                                        |
| Components | `components/Goal*.tsx`, `AgentHint.tsx`                     | Tiles, rows, pills, breadcrumbs, node detail, nav + search, query-state wrapper, agent hint           |

Pages (thin): `src/pages/goal-tree/` — `/` (roots), `/nodes/:id`, `/views/:role` (`donor` or `executor`), `/search?q=`, wired in `src/App.tsx`. The previous template home page moved to `/welcome`.

## Dependencies

- Edge Function `point-at` (`supabase/functions/point-at`): `GET /api/roots`, `/api/nodes/:id`, `/api/search?q=`, `/api/views/:role`; MCP at `/mcp`. Called with the publishable key via `getEdgeFunctionConfig` in `src/shared/services/supabaseService.ts`.
- Kit components `Card`, `Badge`, `Alert`, `Input`, `PageLoadingState`; `formatRelativeTime` from `src/shared/utils/`; `react-router-dom`, `@tanstack/react-query`.
- Colors come only from theme tokens (`success`, `warning`, `info`, `primary`, `muted`).

## Decisions

- The tree is the home route; the template home (sign-in + harness card) moved to `/welcome`.
- Read-only by design: no mutations, so no optimistic-update code.
- Prototype zoom animations and hash routes were not ported; React Router paths replace them.
