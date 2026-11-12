# Supabase backend

Schema for the project lives in `migrations/` and nowhere else. Never change the schema in a dashboard: every environment is built from these files so they cannot drift (`.claude/rules/database.md` § Environments and migrations, `documentation/DOC_CLOUDFLARE_WORKERS.md` § Staging backend). The harness starts with one project shared by local dev, previews and production; `error_logs` and `app_feedback` carry an `environment` tag (`local`, `staging`, `production`) so their rows stay distinguishable.

## Signals: error logs, feedback, bugs

Migration `*_signals_tables.sql`. Read by the signal adapter (`.agents/skills/loop-backlog/references/signal-adapter.md`).

| Table          | Holds                                                            | Who may write                                                                                     | Who may read       |
| -------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------ |
| `error_logs`   | One row per error cluster (`hash` + `environment`), with a count | Nobody directly. Everyone, including visitors who are not signed in, through `upsert_error_log()` | Admins             |
| `app_feedback` | Feedback a signed-in user sends                                  | Signed-in users, their own rows only                                                              | The author; admins |
| `bugs`         | Human bug records the agent may link to                          | Admins                                                                                            | Admins             |

Admins can also update status fields on `error_logs` and `app_feedback`. Nobody deletes rows through the API.

### Admin

An admin is a user whose server-side `app_metadata` carries `role` set to `admin` or `super-admin`. Requirement: this value is set only by a trusted server-side path (the project owner or a service-role call). Never put it in `user_metadata`; users can edit that, and the policies ignore it on purpose. A user must sign in again before a changed claim reaches their token. Local development reads the tables with an admin session or the service role key (never shipped to the browser).

### `upsert_error_log()` is public on purpose

It is `SECURITY DEFINER` and callable by `anon` and `authenticated`, because errors happen before sign-in (login, OAuth callback). Supabase's security advisor lists it as a warning for that reason; the decision is recorded in `documentation/DOC_DECISION_LOG.md` (signals-backend D5). Limits that bound abuse: field length caps, an `environment` allow-list (`local`, `staging`, `production`), at most 5000 distinct clusters (existing clusters keep counting), and 90-day retention through `purge_old_error_logs()`. Per-visitor rate limiting is not possible in Postgres alone; add an Edge Function in front if abuse appears.

The browser side is `src/features/error-reporting/`: it calls `upsert_error_log()` for uncaught errors, unhandled rejections and route-boundary errors, with emails, tokens and URL queries removed first.

`purge_old_error_logs()` is not scheduled yet. Run it with the service role until a scheduled job exists.

## Point At tree

Migration `*_point_at_tree.sql`. Served by the `point-at` Edge Function (`functions/point-at/README.md`).

| Table               | Holds                                                                                         | Who may write                | Who may read                 |
| ------------------- | --------------------------------------------------------------------------------------------- | ---------------------------- | ---------------------------- |
| `nodes`             | The task tree: one row per node, `parent_id` is the split-from relation (set once, immutable) | Only the `point-at` function | Only the `point-at` function |
| `node_events`       | Per-node log: created, split, claimed, reports, reviews, bounce-backs                         | Only the `point-at` function | Only the `point-at` function |
| `node_links`        | "Also serves" links across branches                                                           | Only the `point-at` function | Only the `point-at` function |
| `node_dependencies` | "Needs first" links: a node waits until another is closed                                     | Only the `point-at` function | Only the `point-at` function |
| `node_splits`       | Every split and adoption of a node with its hypothesis (the node keeps only the latest)       | Only the `point-at` function | Only the `point-at` function |
| `contributors`      | One per signed-in person who made an agent token: their display name (references `auth.users`) | Only the `point-at` function | Only the `point-at` function |
| `agent_tokens`      | Personal agent tokens: SHA-256 hash, visible prefix, name, last used, revoked                 | Only the `point-at` function | Only the `point-at` function |

RLS is enabled with no policies and table privileges are revoked from `anon` and `authenticated`, so the publishable key cannot touch these tables. The function connects with the `SUPABASE_DB_URL` secret (role `postgres`, bypasses RLS) and exposes a read-only JSON API to the browser and an MCP endpoint to agents. That endpoint needs the agent to be logged in as a person: agent login (OAuth via Supabase Auth) or a personal agent token (function README § MCP tools). `nodes.embedding` (pgvector, in the `extensions` schema) is not filled yet.

## Applying migrations

Order for a change: with one project, test on a scratch Postgres and apply when the lap is ready; with isolated staging, staging while the PR is open and production after the PR merges, from the same file. A file name carries the version the target database recorded, so list the applied migrations of each project and compare them with the files here. Either the Supabase connector or the Supabase CLI can apply them; the project owner chooses.
