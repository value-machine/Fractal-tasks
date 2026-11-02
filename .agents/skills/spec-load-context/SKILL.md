---
name: spec-load-context
description: >-
  Loads repo context for a new or unfamiliar session: structure and placement whitelist,
  governing rules, enforced boundaries (layers, ports, budgets), git mode, and open laps
  (branches, PRs, lap folders, backlog). Use when a new chat starts, when the repo or branch is
  unfamiliar, before a larger refactor, or when the owner asks to "prime", "load context" or
  "get oriented". Not for scoping a task (use loop-refine) or human first-time setup
  (loop-backlog onboarding gates).
---

# spec-load-context

When this skill is done, the agent knows how the repo is laid out, which rules and enforcement apply, which git mode is active, and which laps are in flight, so the calling stage can act without guessing. It reads and reports; it changes nothing.

## Edges

| Field | Value |
|---|---|
| In | `AGENTS.md`, `ARCHITECTURE.md`, `documentation/DOC_RULES_INDEX.md`, `projectStructure.config.cjs`, `.dependency-cruiser.cjs`, `featureBudgets.config.cjs`, `src/config/git-workflow.json`, `documentation/DOC_APP_VISION.md`, `src/config/app-tasks.json`, `git status` / `git branch -a` / `gh pr list`, `documentation/jobs/temp_job_*/` |
| Out | A short context report (§ Output) in chat |
| Calls | always → [`references/context-checklist.md`](references/context-checklist.md) |
| Called by | [`router`](../router/SKILL.md) (new chat), [`loop-refine`](../loop-refine/SKILL.md) (context missing) · owner (skill-loop D57) |
| Next | Back to the caller |
| Owner stops | None |

## Steps

1. Map the structure: top-level folders, `src/` layout, the features present, and the placement whitelist.
2. Read the governance: `AGENTS.md` catalog, `documentation/DOC_RULES_INDEX.md`, the always-on rules, and the enforcement scripts (`pnpm validate:*`, `arch:check`).
3. Note the boundaries: layer direction, stack ports (`stack-port-*`), feature budgets, the protected files.
4. Read the active state: git mode, current branch, open laps (lap folders, lap branches, open PRs and CI), backlog top, and vision status (`DRAFT` / `ACTIVE`).
5. Report per [`references/context-checklist.md`](references/context-checklist.md) § Output report, keeping only what the caller needs.

## Examples

**Example 1**
Input: new chat; the owner says "continue".
Output: report — Model C, branch `feat/tasks-csv-export`, lap `tasks-csv-export` with phase 2 pending, vision `ACTIVE`, backlog top "CSV export" `in-progress` → the router resumes `loop-build`.

## Output

```text
Context: mode <a|b|c> · branch <name> · laps <slug: stage, …> · vision <DRAFT|ACTIVE> · backlog top <title> · notes <boundaries or risks that matter now>
```

## Not for

| Case | Use |
|---|---|
| Scoping a task | [`loop-refine`](../loop-refine/SKILL.md) |
| First-time setup of a fork | [`loop-backlog/references/onboarding.md`](../loop-backlog/references/onboarding.md) |
| Auditing a diff | [`loop-check`](../loop-check/SKILL.md) |
