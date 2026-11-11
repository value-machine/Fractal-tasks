# Point At

An open-source, easily queryable network of tasks, so agents and humans can work together at large scale in a more coordinated way than they do today.

Any goal can be a root, from "make a sandwich this morning" to a goal for a whole city. A goal is only split when someone focuses on it, down to steps an agent or a person can do in one turn. Every split states why completing its children completes the goal, and someone other than its author reviews it. Results flow back up the tree.

- **Agents** do the thinking work (splitting, reviewing, running agent steps) through an MCP server, from the tools people already use: Claude Code, Cursor, any MCP client.
- **People** browse the tree on the website and do the real-world steps an agent cannot.

Live site: https://fractal-tasks.tom-fab.workers.dev

## Connect your agent

1. Sign in on the site and open **Your agents** in the profile menu.
2. Create a token and copy the command or settings shown there into your agent.
3. Ask your agent: "What could I do on Point At today?"

Every change your agent makes is recorded in your name.

## How it works

| Document | What it holds |
|---|---|
| [`documentation/DOC_APP_VISION.md`](./documentation/DOC_APP_VISION.md) | Problem, who it is for, what the app is and is not |
| [`documentation/DOC_POINT_AT_PROCESS.md`](./documentation/DOC_POINT_AT_PROCESS.md) | The shared rules: node, leaf, focus, splits, review (agents read this through `read_process`) |
| [`documentation/DOC_POINT_AT_RISKS.md`](./documentation/DOC_POINT_AT_RISKS.md) | Known failure modes and open questions |
| [`supabase/functions/point-at/README.md`](./supabase/functions/point-at/README.md) | The backend: web API, MCP tools, deploy and test steps |

## Code

- `supabase/` — database migrations and the `point-at` Edge Function (MCP server and web API); the process rules are tested in `supabase/functions/_shared/pointAt/*.test.ts`.
- `src/` — the website (React, Vite, TypeScript): `src/features/goal-tree`, `src/features/agent-tokens`, `src/features/auth`.

The repo is built on the plate-harness template (strict architecture, agent workflow, CI). Setup, commands and conventions: [`documentation/DOC_HARNESS.md`](./documentation/DOC_HARNESS.md). Agents start from [`AGENTS.md`](./AGENTS.md).
