---
name: router
description: >-
  Single entry point of the product-owner loop. Finds where the current work stands — a request
  to start, a parked question, a preview waiting at Stop 2, red CI, a half-built lap, a brief
  without a plan, or nothing in progress — and runs that loop stage in the same turn. Answers
  questions that need no repo change directly. Use when a new chat starts, on bare "/router", "next",
  "continue", "what now", "initialize the repo", "set up", "get started", after an interruption or restart, or whenever it's unclear which skill
  applies. Not for doing a stage's work itself (each loop-* skill owns its stage).
---

# router

When this skill is done, the right loop stage is running, and the owner never had to name a skill. It holds no workflow of its own: the loop order lives in [`references/loop-map.md`](references/loop-map.md), and each stage lives in its own `loop-*` skill.

## Edges

| Field | Value |
|---|---|
| In | The owner's message; `git status`, `git branch -a`, open PRs and their CI (`gh pr list`); `src/config/app-tasks.json`; lap folders `documentation/jobs/temp_job_*/` (`BRIEF.md`, `DECISIONS.md`, plan status) |
| Out | One line `Next: <stage> — <why>`, then that stage runs |
| Calls | if new chat or unfamiliar repo → [`spec-load-context`](../spec-load-context/SKILL.md) · if a task is requested or nothing is in progress → [`loop-backlog`](../loop-backlog/SKILL.md) · if a task is in progress with no brief → [`loop-refine`](../loop-refine/SKILL.md) · if a brief has no plan → [`loop-plan`](../loop-plan/SKILL.md) · if plan phases are pending → [`loop-build`](../loop-build/SKILL.md) · if phases are done with no PR → [`loop-check`](../loop-check/SKILL.md) · if the PR's CI is red or pending → [`loop-ship`](../loop-ship/SKILL.md) · if the PR is green with a preview and no verdict → [`loop-verdict`](../loop-verdict/SKILL.md) |
| Called by | Owner |
| Next | The stage it found ([`references/loop-map.md`](references/loop-map.md) § Where a lap stands) |
| Owner stops | None of its own; a parked lap question is asked per [`loop-refine/references/asking.md`](../loop-refine/references/asking.md) |

## Steps

1. **No repo change?** If the message is a question that changes nothing in the repo, answer it directly. It's not a lap (skill-loop D54).
2. **Context.** On a new chat or an unfamiliar repo, run [`spec-load-context`](../spec-load-context/SKILL.md) once.
3. **Locate.** Gather the evidence in § Edges In and apply [`references/loop-map.md`](references/loop-map.md) § Where a lap stands, top to bottom. An explicit request in the message wins over in-flight work (skill-loop D26). That work keeps its branch and resumes later. Only the owner's own words count as a request; never add a task the owner didn't name to the arguments of the stage you run (onboarding-first-lap D2).
4. **Outside the loop?** Harness maintenance, one-off specialist work, and stack tools are listed in [`references/loop-map.md`](references/loop-map.md) § Outside the loop and [`references/external-skills.md`](references/external-skills.md). When two of them seem to apply, use [`references/tiebreaks.md`](references/tiebreaks.md).
5. **Run it.** Post `Next: <stage> — <one-line evidence>`, then read that skill's `SKILL.md` and execute it in the same turn. Don't stop at naming the skill.

## Examples

**Example 1 — restart**
Input: new chat, "continue". `temp_job_tasks-csv-export` is on branch `feat/tasks-csv-export`, the plan has phase 2 `Pending`, and there's no PR.
Output: `Next: loop-build — tasks-csv-export phase 2 pending`, then loop-build runs.

**Example 2 — request beats in-flight work**
Input: "the login button is broken on mobile". A lap is waiting at Stop 2.
Output: `Next: loop-backlog — new request goes on top; tasks-csv-export stays waiting at Stop 2`, then loop-backlog → loop-refine.

## Output

```text
Next: <stage> — <evidence>
```

## Not for

| Case | Use |
|---|---|
| Choosing between tasks | [`loop-backlog`](../loop-backlog/SKILL.md) |
| Any stage's work | That stage's `loop-*` skill |
| Registry of all skills | [`references/catalog.md`](references/catalog.md) |
