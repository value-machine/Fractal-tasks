# agent-context

## Purpose

Shows what an AI agent working in Point At is given, so a person can check it loads the right context. Two moments:

1. **On connect** (`/agents/context`): the MCP instructions, every tool with its description, and the process document agents are told to read first.
2. **On focusing a task** (`/nodes/:id/agent-view`): the goal's graph with the tasks in the agent's context highlighted and the rest faded, the planning hints it gets, related tasks from other goals, and the exact `focus_node` payload.

Both are read from the live function, not copied by hand: the connect context comes from a real MCP server instance over an in-memory connection, and the focus payload goes through the same trimming the agent tools use (`supabase/functions/_shared/pointAt/agentPayload.ts`).

## Structure

| Layer      | Path                                                           | Purpose                                                                                     |
| ---------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Types      | `types/agentContext.types.ts`                                  | Connect context, focus payload (fields this view reads), context scope                      |
| Services   | `services/agentContextApiService.ts`                           | `GET /api/agent-context`, `GET /api/nodes/:id/agent-view` via the shared `fetchPointAtJson` |
| Services   | `services/agentContextScope.ts`                                | Which tasks a focus payload names, and which sit outside the drawn tree                     |
| Hooks      | `hooks/useAgentContext.ts`, `hooks/useAgentContextScope.ts`    | TanStack Query reads; the scope for a payload and a drawn tree                              |
| Components | `components/AgentConnectView.tsx`, `AgentFocusPayloadView.tsx` | Instructions, tools and process document; hints, other-goal relations and raw payload       |

Pages (thin): `src/pages/agents/AgentConnectContextPage.tsx` (`/agents/context`, linked from "Connect your agent") and `src/pages/goal-tree/GoalAgentViewPage.tsx` (`/nodes/:id/agent-view`, linked from every task page). The focus page composes the graph from `src/features/task-graph/` with this feature's scope.

## Dependencies

- Edge Function `point-at`: `GET /api/agent-context` (`agentContext.ts`, loaded on demand), `GET /api/nodes/:id/agent-view`.
- `src/features/task-graph/` (`TaskGraphView` with `highlight` and `focusId`), composed on the page.
- Kit: `Badge`, `CopyableBlock`.

## Decisions

- The view shows what the server really sends, never a description of it, so a wrong or missing piece of context is visible here before an agent trips on it.
- The graph is the focused task's whole tree; the context is shown by highlighting, so what the agent does not see is as visible as what it sees.
