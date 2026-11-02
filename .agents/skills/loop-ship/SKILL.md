---
name: loop-ship
description: >-
  Ships the checked lap without asking: cleans up debug leftovers, commits with the repo's
  message and version rules, pushes the lap branch, opens the PR with its preview link per the
  git-workflow mode, and drives CI to green. Never merges or promotes on its own; on the owner's
  Pass it performs the merge (Model C) or promotion (Model A/B). Use when loop-check has passed, when the
  owner says "ship it", "commit and push", "open the PR", "/finish", "/push", or asks to land
  everything on one checkout (bundle mode). Not for testing or judging the result (use loop-verdict).
---

# loop-ship

When this skill is done, the lap is committed, pushed, open as a PR with a working preview, and CI is green. Nothing reaches production until the owner's Pass at Stop 2 (skill-loop D11, D47). Committing no longer waits for the owner (skill-loop D25).

## Edges

| Field | Value |
|---|---|
| In | Lap branch working tree, check summary, `src/config/git-workflow.json` mode, `git-workflow` rule § Mode behavior table |
| Out | Commits, pushed branch, PR (title + body with the check summary), preview link, green CI; merge or promote on Pass |
| Calls | always → [`references/commit-standards.md`](references/commit-standards.md), then [`references/push-safety.md`](references/push-safety.md) · if the tree shows another thread's work → [`references/concurrency.md`](references/concurrency.md) · if CI fails → [`spec-debug-runtime`](../spec-debug-runtime/SKILL.md) · when CI is green → [`loop-verdict`](../loop-verdict/SKILL.md) |
| Called by | [`router`](../router/SKILL.md), [`loop-check`](../loop-check/SKILL.md), [`loop-verdict`](../loop-verdict/SKILL.md) |
| Next | [`loop-verdict`](../loop-verdict/SKILL.md) |
| Owner stops | None, except concurrency smoke ([`references/concurrency.md`](references/concurrency.md)), protected-file fixes for a failing hook, and an unplanned MAJOR bump |

## Steps

1. **Clean up.** Remove temporary console logs, instrumentation and redundant code the lap left behind (debugging logs the owner asked to keep stay). If the lap fixed a bug through debugging and the insight is reusable at the level of a **bug class**, add it to `.agents/skills/spec-debug-runtime/references/patterns.md` (symptom class → likely causes → discriminator question → first diagnostic move; it must pass the pattern quality gate in [`spec-debug-runtime`](../spec-debug-runtime/SKILL.md)).
2. **Smoke check.** If `git status` or the diff shows files outside the lap, or changes between two fresh reads, follow [`references/concurrency.md`](references/concurrency.md).
3. **Commit** per [`references/commit-standards.md`](references/commit-standards.md): version and changelog only where the mode's **version source** says so (A/B); the conventional `type: Subject` title plus a required body; feature READMEs staged with feature code; the backlog JSON files always included when changed. **Archive in this commit** every task the lap completes (the lap's task and any Change feedback tasks): remove it from `src/config/app-tasks.json` and append `{ title, description, status: "done" }` to `src/config/app-tasks-archive.json`. The PR is then ready to merge as it stands, whoever merges it; if it never lands (Drop), the task stays open on the default branch (merge-is-pass D1). Append the lap's closed `DECISIONS.md` rows to [`documentation/DOC_DECISION_LOG.md`](../../../documentation/DOC_DECISION_LOG.md) under `## <lap-slug> — <branch>` (newest first) in the same commit, so the lap folder can go without losing the why. The folder itself stays while the PR is open (the router and a Change round read it); the next [`loop-backlog`](../loop-backlog/SKILL.md) catch-up removes it once the lap has landed. Fix hook failures, never `--no-verify`.
4. **Push** per [`references/push-safety.md`](references/push-safety.md): clean tree, up to date with the remote, full `pnpm lint`, then push the lap branch.
5. **Open the PR** per the mode table's **how work lands** row:
   - **Model C:** PR to `main` (`gh pr create`, base = default branch) with a conventional title (it becomes the squash commit and the release-please entry).
   - **Model A:** PR to `develop` (verify `baseRefName`; never a bare `pull/new/<branch>` URL). Squash-merge it once CI is green: `develop` is staging, and its preview is the Stop 2 surface.
   - **Model B:** no PR. Report the commit URL; the `develop` preview is the Stop 2 surface.

   **Open question?** If the lap's `DECISIONS.md` still has an Open row, ask it in chat now and keep the change unmergeable until the owner answers: under C open the PR as a draft and mark it ready after the answer; under A don't merge to `develop`; under B don't push. The owner decides only in chat or by merging, so a mergeable PR must hold nothing still waiting on them (merge-is-pass D4).

   The PR body is the record for agents (what changed, decisions, rule changes, the check summary, test steps); the owner doesn't read it. Take the preview URL from the Cloudflare bot comment (`documentation/DOC_CLOUDFLARE_WORKERS.md`).
6. **Drive CI to green.** Watch per the mode table's **CI watcher** row (Claude Code: the app's PR monitor; never `gh run watch`). A red check is this lap's to fix: debug, fix, re-check, push. Re-run once only for a pre-test failure (checkout, install, runner loss).
7. **Hand off.** With CI green and a preview link, run [`loop-verdict`](../loop-verdict/SKILL.md).
8. **On Pass (called back from `loop-verdict`):**
   - **Model C:** merge the PR (squash, PR title as commit). There is nothing to commit before or after: the task was archived in step 3. When the owner merges it themselves, that merge is the Pass (`loop-verdict` step 3). Nothing is committed to the merged branch afterwards. The next lap starts from `origin/main` and pushes with a plain push: that works once GitHub has deleted the merged branch (auto-delete, onboarding § Branch workflow gate). If the old branch still exists on the remote, never force-push and never delete it yourself: ask the owner to delete it on the merged PR's page (and to turn on auto-delete), or use a new branch name if the surface allows one (lap-close-order D2).
   - **Model A/B:** promote per [`references/push-safety.md`](references/push-safety.md) § Production landing.

   Agents never push to `main` directly.

## Examples

**Example 1 — Model C**
Input: lap `tasks-csv-export`, check clean.
Output: commit `feat: Export tasks as CSV` with a body; push `feat/tasks-csv-export`; PR to `main` with the check summary; Cloudflare preview link from the bot comment; CI green → loop-verdict.

**Example 2 — red CI**
Input: CI `test` fails on a timezone-dependent assertion.
Output: [`spec-debug-runtime`](../spec-debug-runtime/SKILL.md) finds that the test assumes local time. Fix the test setup (no skip, no quarantine), push, CI green → loop-verdict.

## Output

```text
Shipped: <PR link | commit link (Model B)> · preview: <url> · CI: green · Next: loop-verdict
```

## Not for

| Case | Use |
|---|---|
| Auditing the change | [`loop-check`](../loop-check/SKILL.md) |
| Owner test, Pass / Change / Drop | [`loop-verdict`](../loop-verdict/SKILL.md) |
| Fixing a red check whose cause is unknown | [`spec-debug-runtime`](../spec-debug-runtime/SKILL.md) |
