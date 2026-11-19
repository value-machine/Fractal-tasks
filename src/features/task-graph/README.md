# task-graph

## Purpose

Graph view of a goal: the goal and every task split from it as boxes on a canvas, with lines for the split tree and for each typed relation (blocked by, also serves, alternative, replaces, duplicate, related, overtakes). Each line type has a switch, so people can look at the same tasks along one relationship at a time. Clicking a task opens its page. Read-only, like the goal tree.

## Structure

| Layer      | Path                                                | Purpose                                                                                                 |
| ---------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Types      | `types/taskGraph.types.ts`                          | API shape of `GET /api/nodes/:id/graph`, line types, positions                                          |
| Services   | `services/taskGraphApiService.ts`                   | Reads the graph through the shared `fetchPointAtJson` (`src/shared/services/pointAtFunctionService.ts`) |
| Services   | `services/taskGraphLayout.ts`                       | Tidy-tree layout of the split tree (d3-hierarchy) and the lines to draw for the switched-on types       |
| Hooks      | `hooks/useTaskGraph.ts`                             | TanStack Query read with `taskGraphKeys`                                                                |
| Components | `components/TaskGraphView.tsx`, `TaskGraphCard.tsx` | React Flow canvas with line switches; one card per task                                                 |

Page (thin): `src/pages/goal-tree/GoalGraphPage.tsx` at `/nodes/:id/graph`, linked as "Show as graph" next to a goal's subtasks.

## Dependencies

- Edge Function `point-at`: `GET /api/nodes/:id/graph` (`Store.graph`, at most 400 tasks, nearest levels first; `truncated` says when it was cut off).
- `@xyflow/react` (React Flow, MIT) for the canvas, pan and zoom; `d3-hierarchy` (ISC) for the tree layout. Owner decision 2026-11-19.
- Shared: relation types and wording in `src/shared/types/taskRelations.ts` (also used by the goal tree's relations panel).
- Kit: `Alert`; the page reuses the goal tree's shell and query-state wrapper.

## Decisions

- Tasks are placed by the split tree only; relations are drawn on top. Switching line types never moves a task, so people keep their bearings.
- A "blocked by" relation is drawn from the blocking task to the blocked one, so arrows follow the order of work. Other relations point from the task they describe to the other one.
- Colors come from theme tokens (CSS variables); relation lines are dashed, the split tree solid.
- Relation lines leave a box on its right and enter on the left, so lines between siblings run side to side instead of looping under the boxes. A relation's note is in the line's accessible label, not drawn on the canvas, where it overlapped boxes.
- Only line types the graph has get a switch, so the row stays short on a phone.
- React Flow loads only on this page (the route is lazy), so the rest of the site does not carry it.
- Tasks cannot be dragged or connected here: changes go through agents, as everywhere on the site.
- React Flow is pinned to 12.12.1: 13.0 was three days old when this was built.
