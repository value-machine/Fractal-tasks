# Signal adapter (optional)

Turn this on in an app that has user-signal tables, for example `error_logs` and `app_feedback` as in TMI-apps/MILA. Read by [`loop-backlog`](../SKILL.md) § Steps 2 when the adapter is on. Ported from MILA `backlog-management` (v0.42.0 of this harness has no such tables, so the adapter is off by default, skill-loop D15). Adapt table and column names to the app. With the adapter on, ranking adds **impact × frequency** (skill-loop D16).

## Signals and statuses

| Signal | Open | Agent writes | Admin terminal |
|--------|------|--------------|----------------|
| `error_logs` (cluster by `hash`) | `open` (`muted` = parked) | catch-up `resolved`; loop-ship `review` | `resolved` |
| `app_feedback` | `open` | catch-up `handled`; loop-ship `review` | `handled` |
| `bugs` (optional human record) | `open` / `in_progress` | loop-ship `fixed` + `fix_notes` | `fixed` |

- `review` = agent shipped a fix, admin checks. Admin moves it to the terminal status. Never write `completed` (submitter-only).
- A `review` or `resolved` cluster that fires again reopens to `open` automatically (`upsert_error_log`).
- Never create `bugs` rows. Link an existing bug only.

## Task links

`links?: TaskLink[]` on any task:

- `{"kind": "error", "hash": "<cluster hash>"}` — one link covers every duplicate in both environments.
- `{"kind": "feedback", "env": "staging" | "production", "id": "<uuid>"}`
- `{"kind": "bug", "env": "staging" | "production", "id": "<uuid>"}`

A task may hold many links of each kind. Before adding a task for a signal, check that no active or recent archived task already links it.

## Flow

### 1) Read

- Tasks: active + archive JSON.
- Signals, **staging** and **production** separately (correct MCP namespace each; project columns, never `SELECT *`):
  - `error_logs` where `status IN ('open', 'review')`: `hash, message, type, environment, status, count, last_seen_at`. Group by `hash` (sum `count`, max `last_seen_at`).
  - `app_feedback` where `app_id = '<app>' AND status IN ('open', 'review')`: `id, created_at, user_email, body, bug_id, environment, message_id`.
  - `bugs` where `status IN ('open', 'in_progress')` (usually empty).
- Evidence: `git log --oneline` on the default branch since the oldest open signal, `CHANGELOG.md`, pending `.changeset/*.md`, `changelog-public/pending/*.md`, the task archive.


## Connect signals to tasks

For each signal still open after catch-up:

- Matches an existing task → add the link to that task.
- Orphan → draft one suggested task per root cause (title, description, links). Several hashes with one cause share one task.

Suggested tasks join the ranking in `loop-backlog` § Steps 3 and are written when the owner confirms the order.


## Write signal statuses (one data migration per run)

Production MCP is read-only, so status writes ship as a migration. Skip when nothing is queued.

1. Create `supabase/migrations/<ts>_backlog_sync_<ts>.sql` (`<ts>` = UTC `YYYYMMDDHHMMSS`, same value twice).
2. Statements (replay-safe, at most 200 values per `IN` list; split longer lists):

```sql
-- Backlog catch-up <date>: <one line per group, why>
UPDATE public.error_logs
SET status = 'resolved', resolved = true
WHERE hash IN ('<hash>', '<hash>')
  AND status IN ('open', 'muted');

UPDATE public.app_feedback
SET status = 'handled'
WHERE id IN ('<uuid>', '<uuid>')
  AND status = 'open';
```

3. One file serves both environments: hashes are shared on purpose; feedback UUIDs from the other environment no-op.
4. `pnpm run db:push-staging`. Production gets it with the next release. Do not apply to production by hand.
5. The file lands with the lap's commit through `loop-ship`.

