---
name: loop-build
description: >-
  Builds the lap's plan phase by phase until the acceptance test passes: runs each phase's
  gate, updates plan progress and notes, folds the lap's decisions into the feature READMEs,
  vision or rules they govern, and executes planned cleanups and removals. Stops for the owner
  only on the stop list (new dependency, patch-on-top instead of the structural fix, data or
  irreversible change, cost) or when the diff touches a feature area outside the brief's edges.
  Use when loop-plan has finished, when a Change verdict needs a fix round, or whenever a written plan
  should be executed — "build it", "implement the plan", "continue the job".
  Not for planning (use loop-plan) or the final audit (use loop-check).
---

# loop-build

When this skill is done, every planned phase is executed and gated, the acceptance test passes, and the decisions the lap made live where later laps will find them. Its job is to follow the plan faithfully and notice when reality leaves it.

## Edges

| Field | Value |
|---|---|
| In | Plan (`BRIEF.md` § Plan or `DEVELOPMENT_PLAN.md`), acceptance test, lap `DECISIONS.md`, rules ([`loop-plan/references/rules-registry.md`](../loop-plan/references/rules-registry.md)) |
| Out | Code and tests; plan phase status, **Notes during development**, **Decisions made**; updated feature READMEs / vision / rules carrying the lap's decisions |
| Calls | if a test or runtime fails unexpectedly → [`spec-debug-runtime`](../spec-debug-runtime/SKILL.md) · if a new package seems needed → [`spec-reuse-package`](../spec-reuse-package/SKILL.md), then owner stop (new dependency) · if the diff starts to look like a workaround (`architecture` rule § Layer consistency) → [`spec-check-layer`](../spec-check-layer/SKILL.md) · if a phase removes a feature → [`loop-plan/references/remove-feature.md`](../loop-plan/references/remove-feature.md) § Phase 4 · when all phases pass → [`loop-check`](../loop-check/SKILL.md) |
| Called by | [`router`](../router/SKILL.md), [`loop-plan`](../loop-plan/SKILL.md), [`loop-check`](../loop-check/SKILL.md) |
| Next | [`loop-check`](../loop-check/SKILL.md) |
| Owner stops | Stop list ([`agent-behavior` rule § When to ask](../../../.claude/rules/agent-behavior.md)); edge overrun (skill-loop D51); protected-file edits ([`agent-behavior` § Protected Files](../../../.claude/rules/agent-behavior.md)) |

## Steps

1. **Load.** Read the plan and the lap ledger. Open rows: resolve per the stop list, or note them if they can't block. Confirm the branch is the lap branch (`git-workflow` rule § Mode-aware branch gate). Protected files in the plan (`.claude/rules/**`, `.agents/skills/**`, `.husky/**`, configs) need owner consent unless it's a naming-rename update (§ Protected Files exception) or listed rule changes the owner will see at Stop 2 (skill-loop D50).
2. **Per phase, in order:**
   1. Execute the steps in the layer and folder the plan names (`architecture` rule). New or copied identifiers follow `.claude/rules/code-style.md` § Naming.
   2. Run the phase gate: the tooling gate list items the gate cites ([`loop-check/references/rule-audit.md`](../loop-check/references/rule-audit.md) § Tooling pass), plus the browser check for UI phases (browser MCP when available), migrations or RLS checks, or Edge Function invocations, as the plan says. Fix until green.
   3. Update the plan: phase status `Done`, **Notes during development** (debt, obstacles, gaps, and **mistake signals** — user corrections, reverts, repeat failures), **Decisions made** (impl-time choices).
3. **Stay inside the brief.** Before touching a file outside the brief's edges, stop: that's an overrun (skill-loop D51). Either it's absorbed (add the edge and say so in the Stop 2 summary, if it's small and within the size) or it's cut into a backlog task. Only a size change goes to the owner.
4. **Unplanned obstacles.** Note them. If the way around one is a patch on top instead of the structural fix, that's a stop-list item. Otherwise decide, record it in **Decisions made**, and continue.
5. **Staged-test infrastructure.** When adding or renaming `scripts/*staged*`, `scripts/*validator*`, `scripts/change-classify.cjs` or `scripts/test-staged.cjs`, update `TEST_INFRA_EXACT` / `TEST_INFRA_PREFIXES` in the same lap and run `pnpm test:classify`.
6. **Fold decisions into their homes (skill-loop D48).** For each Closed lap decision that governs future work, write one line into the feature `README.md` it concerns, or into the vision or a rule. Cite the decision, not the lap: `- <decision> (owner, v<version>)`. Update `ARCHITECTURE.md` after structural changes.
7. **Finish.** The acceptance test passes and every phase is `Done`. Hand to [`loop-check`](../loop-check/SKILL.md).

## Examples

**Example 1 — overrun**
Input: phase 2 of "CSV export" needs a change in `src/features/auth/` (to read the user's locale); `auth` isn't in the brief's edges.
Output: stop. It's a one-line read through auth's public API, inside size M, so the edge is added, logged in Decisions made, and flagged for the Stop 2 summary. A deeper auth change would become a backlog task instead.

**Example 2 — dependency**
Input: phase 2 wants `papaparse` for CSV.
Output: [`spec-reuse-package`](../spec-reuse-package/SKILL.md) compares `papaparse` against a 20-line serializer. A new dependency is a stop-list item, so one question goes to the owner; with the away switch on, the lap parks while the next task starts.

## Output

Code and tests on the lap branch, the plan updated, and one chat line:

```text
Build: phases <n>/<n> done · acceptance test passing · decisions folded: <files> · Next: loop-check
```

## Not for

| Case | Use |
|---|---|
| Writing or rewriting the plan | [`loop-plan`](../loop-plan/SKILL.md) |
| Full rule audit before shipping | [`loop-check`](../loop-check/SKILL.md) |
| Unknown-root-cause bug | [`spec-debug-runtime`](../spec-debug-runtime/SKILL.md) |
| Commit, PR, CI | [`loop-ship`](../loop-ship/SKILL.md) |
