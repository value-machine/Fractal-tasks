---
name: loop-orchestrate
description: >-
  Runs several laps of the product-owner loop at once: owns the backlog, starts one session per
  independent task, settles or relays thread questions, and merges each thread's PR after the
  owner's Pass. The owner talks only to the orchestrator. Use when two or more ready tasks touch
  different feature areas and the owner accepts the parallel run offered at Stop 1, when sessions
  of an earlier run are still active, or when the owner says "orchestrate", "run these in
  parallel", "work the backlog". Not for a single task (router runs the plain loop) or one lap's
  stage work (each loop-* skill).
---

# loop-orchestrate

When this skill is done, every ready task has been built in its own session, and the owner has tested and decided each result from one conversation, answering only questions nobody else could. It is optional: with one ready task, the plain loop is cheaper. Decisions: `documentation/DOC_DECISION_LOG.md` § orchestrator-parallel-laps.

## Edges

| Field | Value |
|---|---|
| In | `src/config/app-tasks.json`, `documentation/DOC_APP_VISION.md`, owner messages, active sessions, open lap PRs |
| Out | Thread sessions; backlog edits landed on thread PRs; one status line per turn; merged PRs |
| Calls | to rank → [`loop-backlog`](../loop-backlog/SKILL.md) steps 2–4 · threads start at → [`loop-refine`](../loop-refine/SKILL.md) · handoff format → [`loop-verdict`](../loop-verdict/SKILL.md) · on Pass → [`loop-ship`](../loop-ship/SKILL.md) · a mistake repeated across threads → [`meta-learn-lessons`](../meta-learn-lessons/SKILL.md) · when done → [`router`](../router/SKILL.md) |
| Called by | [`router`](../router/SKILL.md), [`loop-backlog`](../loop-backlog/SKILL.md) |
| Next | [`router`](../router/SKILL.md) |
| Owner stops | Yes to the run · new tasks it proposes · Stop 2 per PR · stop-list items ([`agent-behavior` rule § When to ask](../../../.claude/rules/agent-behavior.md)) it can't settle |

## Steps

1. **Orient.** List active sessions. Thread sessions tagged with a run and a lap slug, with an orchestrator as parent, mean a run is in flight: rebuild status from them and from open lap PRs, then run the title sweep (step 3) once.
2. **Dispatch** every ready task whose feature areas, guessed from the task text, don't overlap a running one; overlapping tasks queue. There's no cap, so token spend grows with the backlog. Start each as a separate session the owner can watch, titled with the task's backlog title and tagged with the run and lap slug. Its brief: the task, the lap slug, run the lap from `loop-refine` to a green PR, report questions and results back (including when it needs another thread's result, and when its PR is merged or closed), leave `app-tasks.json` alone, and never rename its session.
3. **Run** on every event (thread report, owner message, merge):
   - **Titles** — the owner reads a thread's state from its title, and only the orchestrator renames:
     - *Set:* a working thread's title is its task's backlog title, with no status. When a thread must wait on another (it reports needing another thread's result, or you hold it after the overlap re-check), in one action tell it to pause, tag it `waits-on:<lap-slug>` per blocker, and rename it `⏸ <goal> · waits on <blocker goal>` (several blockers joined with ` + `). Waiting on the owner gets no prefix; the app already marks it.
     - *Clear:* once every `waits-on` blocker is done, in one action remove the tags, restore the plain title, and message the thread: after a merge, update from `main` and continue; after a Drop, re-check its brief: continue if it doesn't need the dropped change, otherwise re-scope it, and ask the owner only if neither works.
     - *Sweep:* runs on the actions that can finish a blocker (your own merge or Drop, a thread reporting its PR merged or closed, a failed-thread notice) and once in step 1. It clears waits whose blockers are done, archives threads whose PR is merged or closed, resets any title that differs from the expected one, and names a failed blocker in the status line. No timed check-ins and no PR watch; each thread watches its own PR.
   - **Questions:** answer what the vision, recorded decisions or another thread settle; ask the owner the rest, one at a time ([`asking.md`](../loop-refine/references/asking.md)). A waiting thread parks; the others go on.
   - **Briefs:** when a thread reports its edges, re-check overlap; hold or re-scope a thread that overlaps or drifts. Tell a thread when another one's change affects it.
   - **Backlog:** reorder without asking and report it; turn the owner's remarks into tasks; propose tasks for gaps between the vision and the app. Start what became ready.
4. **Stop 2.** For each green PR, commit its task's archive and any pending backlog edits onto its branch, so a merge on GitHub is still a complete Pass. A PR whose brief has no owner test merges on green without a question; list it in the status line with its `Watch for:` (`loop-verdict` step 0). Then post one handoff listing each remaining PR in the `loop-verdict` format, with a verdict per PR. On Pass, the thread runs the post-Pass [greenfield sweep](../loop-check/references/greenfield-sweep.md) on its PR (`loop-verdict` step 3); once CI is green, merge it and archive its session. Update another branch from `main` only when it is next to merge, its thread needs the merged change, or GitHub reports a conflict, and resolve conflicts yourself (the decision log and the backlog JSON conflict on every merge; that isn't overlap). Each push re-runs that PR's CI, and `main` doesn't require up-to-date branches (ci-cost D5). A Change goes back to its thread; a Drop closes the PR and archives the session.
5. **Finish** when nothing is ready or in flight: post the status line and hand back to the router.

Threads report back through whatever the surface supports: messages, or their branch, PR and transcript, which the orchestrator reads.

## Examples

**Example 1**
Input: "CSV export" (tasks), "Avatar in top bar" (layouts) and "Rename tasks column" (tasks); the owner says yes.
Output: two sessions start, and the rename task queues behind CSV export. The avatar thread asks which image size to use; the profile README records it, so the orchestrator answers. Later one handoff lists both previews.

## Output

One status line per turn:

```text
Running: <task> — <Building: … line until the owner saw it> · Waiting on you: <PR | question> · Held: <task> (waits on <task>) · Queued: <task> (<reason>)
```

## Not for

| Case | Use |
|---|---|
| A single task | [`router`](../router/SKILL.md) → plain loop |
| One lap's stage work | That stage's `loop-*` skill |
