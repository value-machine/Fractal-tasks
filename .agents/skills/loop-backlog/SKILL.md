---
name: loop-backlog
description: >-
  Opens Stop 1 of the product-owner loop. Puts anything the owner points at on top of the
  backlog and starts it; otherwise catches up src/config/app-tasks.json against landed work,
  proposes a ranked order (blockers such as untested previews and onboarding tasks first, then
  value per size), and asks the owner to confirm the top item. Runs the seeded onboarding gates
  on a fresh fork. Use when a session starts, after a Pass or Drop verdict, when there is no
  clear objective, or when the owner says "what's next", "reprioritize", "do X now", "/tasks".
  Not for scoping the chosen task (use loop-refine).
---

# loop-backlog

First half of **Stop 1**. When this skill is done, `app-tasks.json` is accurate (landed work archived), ordered by priority, and its top task is `in-progress` and handed to `loop-refine`. File order is priority (skill-loop D14). The agent proposes the order; the owner confirms it.

## Edges

| Field | Value |
|---|---|
| In | `src/config/app-tasks.json` + `app-tasks-archive.json` (schema in `src/features/tasks/README.md`), git log and changelog since the oldest active task, open PRs and their previews, `documentation/DOC_APP_VISION.md`, owner request; signal tables when the adapter is on |
| Out | Reordered `app-tasks.json`; archived landed tasks; top task `in-progress` |
| Calls | if the app has user-signal tables → [`references/signal-adapter.md`](references/signal-adapter.md) · if the top task is a seeded onboarding task → [`references/onboarding.md`](references/onboarding.md) · when the top task is set → [`loop-refine`](../loop-refine/SKILL.md) |
| Called by | [`router`](../router/SKILL.md), [`loop-verdict`](../loop-verdict/SKILL.md) |
| Next | [`loop-refine`](../loop-refine/SKILL.md) |
| Owner stops | Confirm the top item when the proposed order changes it (skipped when the owner named the task) |

## Steps

1. **Direct request?** If the owner just pointed at something to do now (bug or not), insert it at the top as `in-progress` and go to step 6 (skill-loop D26). Only the owner's own words name a task: "next", "volgende stap", "continue" or "merged" name none, so rank instead (step 2). Never write a task the owner didn't name into a skill's arguments. **Hosting first:** before a product lap starts, run [`references/onboarding.md`](references/onboarding.md) § Still open on a fork. If hosting is open, say in one line that the change could not be previewed or tested at Stop 2, run the open gates first, and keep the request next in line; build without a preview only when the owner says so (record it in the lap's `DECISIONS.md`) (onboarding-first-lap D2). A Change verdict counts as one; it stays linked to its lap branch and PR. A question with no repo change isn't a task: answer it (skill-loop D54).
2. **Read** the active and archive JSON, git history and changelog since the oldest active task, open PRs with previews, and signals when the adapter is on.
3. **Catch up.** For each active task:
   - **Clearly landed** (code on the default branch, or the changelog / archive names it): archive it with a one-line reason.
   - **In doubt:** check the code path.
   - **Still in doubt:** update only the description to reflect the real state.

   A lap folder (`documentation/jobs/temp_job_*/`) on the default branch whose lap has landed (its task archived, its `## <slug>` section in `documentation/DOC_DECISION_LOG.md`) is a leftover: remove it with the catch-up commit (onboarding-first-lap D4).

   An open PR whose preview the owner hasn't tested is **waiting on the owner**, not landed.
4. **Rank** (order = priority, skill-loop D16):
   1. **Blockers and prerequisites**: untested previews (Stop 2 waiting, skill-loop D45), seeded onboarding tasks a fork still needs (skill-loop D41), and anything that blocks another task.
   2. Then **value per size**: vision fit and the owner's past feedback, divided by a rough size (XS / S / M). With the adapter on, add impact × frequency.
   3. Feedback tasks from Stop 2 (skill-loop D17) and follow-up laps (skill-loop D44) rank like any other task.
5. **Confirm.** Show the full proposed order with a one-line reason for each moved row, then ask once with the question tool (`agent-behavior` rule § How to ask): the proposed top first, one or two contenders, and "keep the current order". Nothing moves before that answer. If a task is already `in-progress`, the default option is to continue it.
6. **Start.** Write the JSON (keep `schemaVersion`; disk wins over a pending `/tasks` UI edit). Set the top task `in-progress` and run [`loop-refine`](../loop-refine/SKILL.md). For a seeded onboarding task, run its gate from [`references/onboarding.md`](references/onboarding.md) instead, and archive it when its check passes.

## Examples

**Example 1 — idle session**
Input: `/router` with no request. The backlog has 4 tasks, and one PR is open with an untested preview.
Output: catch-up archives one landed task. The proposed order puts "test preview: CSV export" first (blocker), then the rest by value per size. One confirm question. The waiting preview's lap then resumes at Stop 2 ([`router`](../router/SKILL.md) locates it).

**Example 2 — direct request**
Input: "the login button is broken on mobile, fix it now".
Output: new top task "Login button broken on mobile" set `in-progress`, no reorder question → loop-refine (a bug: reproduce first).

## Output

```text
Backlog: archived <n> · order <changed|unchanged> · top: <task title> (<reason>) · Next: loop-refine
```

## Not for

| Case | Use |
|---|---|
| Scoping the top task | [`loop-refine`](../loop-refine/SKILL.md) |
| Testing a waiting preview | [`loop-verdict`](../loop-verdict/SKILL.md) |
| Editing tasks by hand | The `/tasks` UI in local dev (disk wins) |
