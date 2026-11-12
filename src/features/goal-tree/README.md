# goal-tree

## Purpose

Read-only navigation of the shared goal tree ("Point At"): zoomable nested tiles, node focus pages, role views (thinking work for token donors, actions for executors) and search. Changes happen through agents over MCP, so the UI never writes; it points people at the MCP URL instead. The tree is the app's home route.

## Structure

| Layer      | Path                                                 | Purpose                                                                                                                                                                                                                |
| ---------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Types      | `types/goalTree.types.ts`, `types/goalTreeLabels.ts` | API shapes (copied from the prototype store) and display labels/copy                                                                                                                                                   |
| Services   | `services/goalTreeApiService.ts`                     | Plain `fetch` client for the `point-at` Edge Function read API; function URL, region pin, MCP URL and `PointAtNotConfiguredError` come from `src/shared/services/pointAtFunctionService.ts` (shared with agent tokens) |
| Hooks      | `hooks/useGoalTreeQueries.ts`                        | TanStack Query hooks with `goalTreeKeys`; the hint gets the MCP URL from `src/shared/hooks/usePointAtMcpUrl.ts`                                                                                                        |
| Components | `components/Goal*.tsx`, `AgentHint.tsx`              | Tiles, rows, pills, breadcrumbs, node detail, nav + search, query-state wrapper, agent hint                                                                                                                            |

Pages (thin): `src/pages/goal-tree/` — `/` (roots), `/nodes/:id`, `/views/:role` (`donor` or `executor`), `/search?q=`, wired in `src/App.tsx`.

## Dependencies

- Edge Function `point-at` (`supabase/functions/point-at`): `GET /api/roots`, `/api/nodes/:id`, `/api/search?q=`, `/api/views/:role`; MCP at `/mcp`. Called with the publishable key via `getEdgeFunctionConfig` in `src/shared/services/supabaseService.ts`. Every call (and the MCP URL shown in the hint) adds `forceFunctionRegion=eu-west-1`, so the function runs next to its database; unpinned, each query crosses regions and a goal page took about 4x longer (measured 2026-11-08).
- Kit components `Card`, `Badge`, `Alert`, `Input`, `PageLoadingState`; `formatRelativeTime` from `src/shared/utils/`; `react-router-dom`, `@tanstack/react-query`.
- Colors come only from theme tokens (`success`, `warning`, `info`, `primary`, `muted`).

## Decisions

- The tree is the home route.
- Read-only by design: no mutations, so no optimistic-update code.
- The home page hint (`AgentHint`) shows the plain connector link (`usePointAtConnectorUrl`) and links to `/agents` ("Connect your agent"); agents log in through it (`src/features/agent-login/`).
- Prototype zoom animations and hash routes were not ported; React Router paths replace them.
- Adoptions (`adopt_roots`) need no UI of their own: an adopted root disappears from the roots list and shows under its new parent, and its event reads "placed it under a bigger goal".
- Long words (titles without spaces, URLs) wrap through the global `overflow-wrap: anywhere` on `body` in `src/index.css`, not per component.
- Lists (tiles, rows) cut a title off after 3 lines with the full text on hover; the goal's own page shows it in full.
