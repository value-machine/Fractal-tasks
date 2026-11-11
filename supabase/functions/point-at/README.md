# point-at (Edge Function)

Backend of Point At, a shared tree of tasks that people point their AI agents at. One function serves two audiences:

- **The browser UI** reads the tree through a small read-only JSON API, and a signed-in person manages their personal agent tokens under `/api/me/tokens`.
- **Agents** (Claude Code, a claude.ai custom connector, any MCP client) read and change the tree through an MCP server at `/mcp`.

The domain rules (node format, leaf rule, claiming, verification levels, adversarial review) live in `supabase/functions/_shared/pointAt/store.ts` and encode the process document. Tables: `supabase/README.md` § Point At tree. Migration: `supabase/migrations/20261102120000_point_at_tree.sql`.

The function connects to Postgres directly with the automatic `SUPABASE_DB_URL` secret (no `supabase-js`, no RLS policies involved). Nothing else needs configuring.

## Routes

Base URL: `https://<ref>.supabase.co/functions/v1/point-at`. Browser calls send the publishable key as `apikey` (and `authorization: Bearer <key>`); with `--no-verify-jwt` the function does not check it.

| Method | Path                         | Returns                                                                                        |
| ------ | ---------------------------- | ---------------------------------------------------------------------------------------------- |
| GET    | `/api/roots`                 | `NodeSummary[]`, each with `children: NodeSummary[]`                                           |
| GET    | `/api/nodes/:id`             | `{ node, ancestors, children, events, links }`; each child carries its own `children`          |
| GET    | `/api/search?q=`             | `NodeSummary[]` (limit 30; blank `q` returns `[]`)                                             |
| GET    | `/api/views/:role?label=&q=` | `(NodeSummary & { why? })[]` (limit 50); `role` is `donor` or `executor`, anything else is 400 |
| GET    | `/api/process`               | The process document as `text/plain`                                                           |
| GET    | `/api/me`                    | `{ display_name, suggested_name }`: the person's public name (null until chosen) and a suggestion from GitHub or Google, never the email |
| PUT    | `/api/me`                    | Same shape, for body `{ display_name }` (1 to 80 characters, no " via "); applies to future writes |
| GET    | `/api/me/tokens`             | The signed-in person's agent tokens (no secrets), newest first                                 |
| POST   | `/api/me/tokens`             | `{ token, record }` for body `{ name }`; the token is shown only here                          |
| DELETE | `/api/me/tokens/:id`         | The revoked token's record                                                                     |
| ALL    | `/mcp`                       | MCP streamable HTTP, stateless, JSON responses                                                 |

`NodeSummary` is a `nodes` row plus `child_count` and `done_child_count`. Errors are JSON `{ "error": "..." }`: unknown node (or malformed id) is 404, a bad role is 400, a non-GET on the read API is 405, `/api/me/*` without a valid Supabase session is 401 (the browser sends the person's session token as `authorization` there, checked against Supabase Auth), a refused request is 400 (no public name chosen yet, an invalid name, no token name, 20 active tokens) or 404 (not your token), anything unexpected is 500 with a generic message (details go to the function logs). CORS allows `GET`/`POST`/`DELETE`/`OPTIONS` from any origin with headers `apikey`, `authorization`, `content-type`, `x-point-at-actor`.

## MCP tools

Who acts depends on the bearer token:

- **Personal agent token** (`pa_…`, created on the site at `/agents`): every write is attributed to the token's owner, as `<display name> via <agent label>`. The label is the tool's `actor` argument, else the `x-point-at-actor` header; an agent cannot write as someone else. Rules about people (a split's author may not review it) compare only the person part, so another agent of the same person counts as the author (`_shared/pointAt/actors.ts`). Revoked tokens get 401. Logic and tests: `supabase/functions/_shared/pointAt/contributors.ts`.
- **Shared token** `POINT_AT_MCP_TOKEN` (being phased out): the actor is whatever the agent sends (`actor` argument, else the header, else `anonymous agent`).

- Read: `read_process`, `list_roots`, `focus_node` (node, root, depth, ancestors with their split hypotheses, siblings, its own split author and review state, children, grandchildren, links, events; empty fields left out), `next_tasks` (role `donor` or `executor`; donor rows carry a `kind`: `review`, `replan`, `split`, `run`, `refine`, and the same `kind` filters the view), `search_nodes`, `review_stats` (also at `GET /api/stats/reviews?label=`). Resource: `pointat://process`.
- Write: `create_root`, `split_node`, `adopt_roots` (place existing roots under a node as a reviewed split; only roots move, loops are refused), `mark_leaf`, `update_node`, `claim_node`, `release_node`, `report`, `mark_overtaken`, `review_split`, `link_nodes`, `add_dependency` (a node needs another closed first; a leaf with an open dependency is left out of `next_tasks` and the Actions view; loops are refused).

## Deploy

```bash
supabase functions deploy point-at --project-ref kyzhhofupypwmfjpbyfc --no-verify-jwt --use-api
```

`--use-api` bundles on Supabase's side, so no Docker is needed. In Claude Code cloud sessions the personal access token is saved as a network secret for `api.supabase.com`; the proxy injects it, so run the command with a placeholder `SUPABASE_ACCESS_TOKEN=sbp_` followed by 40 zeros.

`--no-verify-jwt` is required for two reasons: the browser calls with a publishable key, which is not a user JWT, and agents call `/mcp` with no Supabase session at all. The function does its own check instead:

- `/api/*` (read-only) is public.
- `/mcp` (reads and writes) requires `Authorization: Bearer <POINT_AT_MCP_TOKEN>`, a shared secret set as an Edge Function secret (`supabase secrets set POINT_AT_MCP_TOKEN=<long random value>`). Without the secret set, `/mcp` answers 503, so a fresh deploy is closed by default. Rotate it by setting a new value; every agent then needs the new token.

An Edge Function has no staging: a deploy affects production and every preview at once (`.claude/rules/testing.md` § Edge Functions testing). Apply the migration first, then deploy. Test with the procedure below, ideally against a scratch project, before deploying to the shared one.

## Automated rule tests

`supabase/functions/_shared/pointAt/store.test.ts` tests the process rules (roots, leaves and splits, claims and reports, review, dependencies) against an in-process Postgres (PGlite, `pgliteDb.ts`) built from the Point At migrations. The shared Supabase project is never touched. They run in `pnpm test:run`, so CI runs them on every PR. Add a test here for every new rule before building it; `it.todo` entries list known gaps.

## Manual test procedure

Set `BASE=https://<ref>.supabase.co/functions/v1/point-at`, `KEY=<publishable key>` and `TOKEN=<POINT_AT_MCP_TOKEN>`. The seed (`_shared/pointAt/seed.ts`) is not wired to a route, so an empty database returns `[]` from `/api/roots`; create a root through MCP first (step 9).

1. `curl -s -H "apikey: $KEY" "$BASE/api/roots"` returns a JSON array (200).
2. Take an `id` from step 1: `curl -s -H "apikey: $KEY" "$BASE/api/nodes/<id>"` returns `node`, `ancestors`, `children`, `events`, `links`.
3. `curl -s "$BASE/api/nodes/not-a-uuid"` returns 404 `{"error":"No node with id not-a-uuid"}`.
4. `curl -s "$BASE/api/search?q=sandwich"` returns an array (empty if nothing matches).
5. `curl -s "$BASE/api/views/donor"` and `.../api/views/executor?label=peace` return arrays; `.../api/views/other` returns 400.
6. `curl -s "$BASE/api/process" | head` shows the process document.
7. CORS: `curl -si -X OPTIONS -H "origin: http://localhost:5173" "$BASE/api/roots"` returns 204 with `access-control-allow-origin: *`.
8. MCP without the token: `curl -si "$BASE/mcp" -X POST -d '{}'` returns 401 (503 if the secret is not set).
9. MCP initialize:

   ```bash
   curl -s "$BASE/mcp" -H "authorization: Bearer $TOKEN" -H "content-type: application/json" -H "accept: application/json, text/event-stream" \
     -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"curl","version":"0"}}}'
   ```

   Then list the tools (stateless, so no session header is needed):

   ```bash
   curl -s "$BASE/mcp" -H "authorization: Bearer $TOKEN" -H "content-type: application/json" -H "accept: application/json, text/event-stream" \
     -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}'
   ```

   Expect 15 tools. Create a test root: `tools/call` with `{"name":"create_root","arguments":{"title":"Test root","actor":"curl"}}`, then repeat step 1. Remove test rows afterwards with SQL (there is no delete tool).

## Connect an agent

MCP URL: `https://<ref>.supabase.co/functions/v1/point-at/mcp?forceFunctionRegion=eu-west-1`. The query parameter runs the function next to the database (eu-west-1); without it every query crosses from the region nearest the caller, measured 2026-11-08 at about 4x slower per page. The web view pins its `/api` calls the same way.

- **Process text:** `read_process` and `/api/process` serve a generated copy of `documentation/DOC_POINT_AT_PROCESS.md`. After editing that document, run `pnpm sync:process-doc` and redeploy.
- **Your own token (recommended):** sign in at https://fractal-tasks.tom-fab.workers.dev/agents, create a token, and copy the Claude Code command or JSON settings shown there. Writes are then in your name.
- **Claude Code in this repo (shared token, being phased out):** `.mcp.json` already lists `point-at`. Set the environment variable `POINT_AT_MCP_TOKEN` (and optionally `POINT_AT_ACTOR`, your name as it appears in the tree) and start a new session; Claude Code fills them into the headers. In Claude Code cloud sessions, save the token instead as a network secret for host `kyzhhofupypwmfjpbyfc.supabase.co` (Authorization: Bearer) in the environment's settings; the proxy injects it and the `proxy-injected` default in `.mcp.json` is overwritten. Never put the token in a chat.
- **Claude Code elsewhere:** `claude mcp add --transport http point-at https://<ref>.supabase.co/functions/v1/point-at/mcp --header "Authorization: Bearer <token>" --header "x-point-at-actor: Your Name via Claude Code"`
- **Cursor / Claude Desktop:** an HTTP MCP server entry with that URL and the same two headers (Claude Desktop through a local bridge such as `mcp-remote` with `--header`).
- **claude.ai web connectors:** not yet. They authenticate with OAuth and cannot send the token, so they wait for contributor sign-in.

## Known gaps

- **The shared token still works.** Personal agent tokens attribute writes to a person, but the shared `POINT_AT_MCP_TOKEN` still lets an agent write under any typed-in name until it is removed (follow-up task). The tree lives in the shared Inventhor website project (ref `kyzhhofupypwmfjpbyfc`), so that token guards that database too.
- **Embeddings are unfilled.** `nodes.embedding` exists and is indexed, but nothing writes or queries it; search is full-text plus `ilike`.
- **No rate limiting.** `.claude/rules/project-specific.md` asks for it on public and write endpoints. Personal tokens now give a stable key per contributor, so it can be added (backlog task).
- **Tool callbacks are untyped.** `deno check` reports implicit-any parameters in `mcpServer.ts` tool callbacks (the MCP SDK does not infer zod 4 shapes there). Inputs are still validated by zod at runtime; the rules themselves are tested in `store.test.ts` and `contributors.test.ts`.
- The process document is an embedded copy (`_shared/pointAt/processDoc.ts`); regenerate it when `documentation/DOC_POINT_AT_PROCESS.md` changes.
