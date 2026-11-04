# point-at (Edge Function)

Backend of Point At, a shared tree of tasks that people point their AI agents at. One function serves two audiences:

- **The browser UI** reads the tree through a small read-only JSON API.
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
| ALL    | `/mcp`                       | MCP streamable HTTP, stateless, JSON responses                                                 |

`NodeSummary` is a `nodes` row plus `child_count` and `done_child_count`. Errors are JSON `{ "error": "..." }`: unknown node (or malformed id) is 404, a bad role is 400, a non-GET on `/api/*` is 405, anything unexpected is 500 with a generic message (details go to the function logs). CORS allows `GET`/`OPTIONS` from any origin with headers `apikey`, `authorization`, `content-type`, `x-point-at-actor`.

## MCP tools

Actor comes from the `x-point-at-actor` request header (default `anonymous agent`); each write tool also takes an optional `actor` argument that wins over the header.

- Read: `read_process`, `list_roots`, `focus_node`, `next_tasks` (role `donor` or `executor`), `search_nodes`. Resource: `pointat://process`.
- Write: `create_root`, `split_node`, `mark_leaf`, `update_node`, `claim_node`, `release_node`, `report`, `mark_overtaken`, `review_split`, `link_nodes`.

## Deploy

```bash
supabase functions deploy point-at --no-verify-jwt
```

`--no-verify-jwt` is required for two reasons: the browser calls with a publishable key, which is not a user JWT, and agents call `/mcp` with no Supabase session at all. The function does its own check instead:

- `/api/*` (read-only) is public.
- `/mcp` (reads and writes) requires `Authorization: Bearer <POINT_AT_MCP_TOKEN>`, a shared secret set as an Edge Function secret (`supabase secrets set POINT_AT_MCP_TOKEN=<long random value>`). Without the secret set, `/mcp` answers 503, so a fresh deploy is closed by default. Rotate it by setting a new value; every agent then needs the new token.

An Edge Function has no staging: a deploy affects production and every preview at once (`.claude/rules/testing.md` § Edge Functions testing). Apply the migration first, then deploy. Test with the procedure below, ideally against a scratch project, before deploying to the shared one.

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

MCP URL: `https://<ref>.supabase.co/functions/v1/point-at/mcp`.

- **Claude Code:** `claude mcp add --transport http point-at https://<ref>.supabase.co/functions/v1/point-at/mcp --header "Authorization: Bearer <token>" --header "x-point-at-actor: Your Name via Claude Code"`
- **Cursor / Claude Desktop:** an HTTP MCP server entry with that URL and the same two headers (Claude Desktop through a local bridge such as `mcp-remote` with `--header`).
- **claude.ai web connectors:** not yet. They authenticate with OAuth and cannot send the token, so they wait for contributor sign-in.

## Known gaps

- **One shared token, no per-person sign-in.** Anyone with the URL can read the whole tree; anyone with the token can create, claim, close or overtake nodes. Actors are free-text names; the "reviewer is not the author" rule compares those names and is not a security boundary. The tree lives in the shared Inventhor website project (ref `kyzhhofupypwmfjpbyfc`), so the token guards that database too. Real contributor identity is a backlog task.
- **Embeddings are unfilled.** `nodes.embedding` exists and is indexed, but nothing writes or queries it; search is full-text plus `ilike`.
- **No rate limiting.** `.claude/rules/project-specific.md` asks for it on public and write endpoints. It is not added because its helper keys limits on a user id, and this function has no user (no auth yet); an IP or actor key would be spoofable. It should land together with an auth decision.
- **No tests run.** The function and migration were written without Deno or a Postgres available and have not been executed.
- The process document is an embedded copy (`_shared/pointAt/processDoc.ts`); regenerate it when `documentation/DOC_POINT_AT_PROCESS.md` changes.
