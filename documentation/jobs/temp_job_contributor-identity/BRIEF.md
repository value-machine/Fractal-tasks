# Brief — Contributor identity for MCP writes

Task: Contributor identity for MCP writes · Lap: temp_job_contributor-identity · Harness: v0.44.0

## Problem
Every agent writes with one shared secret and a typed-in actor name, so anyone holding the secret can act as anyone and nothing ties a write to a person.

## Success check
A signed-in person creates an agent token on the site, an MCP call with that token writes a node whose `created_by` is that person's account name regardless of the `actor` the agent sends, and the same call fails with 401 once the token is revoked.

## In scope
- Sign in on the site with an email link (no password) or GitHub; the existing Google button stays (already configured for the shared project).
- `contributors` (one per auth user, display name) and `agent_tokens` (hashed, named, revocable, last-used) tables; only the point-at function reads and writes them.
- Function API for the signed-in user: list, create (token shown once), revoke agent tokens; authenticated with the user's Supabase session.
- MCP auth: a personal token resolves the actor to `<display name>` plus the agent label (`actor` arg or `x-point-at-actor`) as "via"; the shared `POINT_AT_MCP_TOKEN` keeps working during the switch.
- Web page "Your agents" (signed in): create, copy-ready MCP config, list, revoke; reachable from the profile menu.
- Rule tests for tokens and actor resolution (PGlite).

## Out of scope
- Will NOT do: MCP OAuth login (Supabase OAuth 2.1) — deferred (owner: tokens now).
- Will NOT do: removing the shared token — follow-up once the owner's agents use personal tokens.
- Will NOT do: own SMTP for email links (built-in mailer: 2 emails/hour) — backlog task.
- Will NOT do: rate limiting — existing backlog task, now unblocked (stable key per contributor).
- Will NOT touch: inventhor.com sign-in; Site URL stays https://inventhor.com.

## Edges
| Feature area | Loop today | Hook point | Ride / new |
|---|---|---|---|
| auth (`src/features/auth`) | email+password, Google → session | SignInPanel, authService | ride — swap password form for email link, add GitHub |
| point-at function (`supabase/functions/point-at`, `_shared/pointAt`) | shared bearer → MCP; actor from arg/header | `mcpAuthError`, `who()` in mcpServer, new `/api/me/tokens` | ride |
| database (`supabase/migrations`) | tree tables, RLS on, function-only | new migration | new tables |
| agent tokens UI | Not found | new feature `agent-tokens` + page + profile menu link | new — one bounded concept |

## Size
M — four edges, a migration, a new feature folder.
Cut into laps: follow-ups "Remove the shared MCP token", "Own SMTP for sign-in emails".

## Decisions
DECISIONS.md D1–D4.
