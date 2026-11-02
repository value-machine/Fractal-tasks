---
name: loop-plan
description: >-
  Writes the build plan for the lap at a depth set by the brief's size: first the failing
  acceptance test from the success check, then a short plan in BRIEF.md (XS/S) or a full
  DEVELOPMENT_PLAN.md with one merged parallel review (M). Researches reuse, external APIs,
  industry precedent and foundation cleanup (deep modules, duplication, placement, feature
  removal) so every step complies with the repo rules. No owner sign-off. Use when loop-refine has
  finished, or whenever a scoped brief needs a build plan — "plan this", "how do we build it", "/plan".
  Not for scoping or asking what to build (use loop-refine), nor for writing the code (use loop-build).
---

# loop-plan

First autonomous stage. When this skill is done, a failing test encodes the brief's success check, and a plan says exactly which files change, in which layers, in what order, with a gate per phase. The plan includes the cleanup a clean implementation needs. A good plan is what lets `loop-build` run without stops.

## Edges

| Field | Value |
|---|---|
| In | `BRIEF.md`, lap `DECISIONS.md`, rules ([`references/rules-registry.md`](references/rules-registry.md)), code, `ARCHITECTURE.md`, `documentation/DOC_TANSTACK_QUERY.md` for server state |
| Out | Failing acceptance test; plan in `BRIEF.md` § Plan (XS/S) or `documentation/jobs/temp_job_<slug>/DEVELOPMENT_PLAN.md` ([`references/plan-template.md`](references/plan-template.md)) (M); `DECISIONS.md` rows |
| Calls | if the plan introduces a `new` mechanism not already covered by `BRIEF.md` § Edges `Borrow / build` (`architecture` rule § Don't reinvent the wheel) → [`spec-reuse-package`](../spec-reuse-package/SKILL.md) · if an external API or vendor is involved → [`references/research-api.md`](references/research-api.md) · if material UX / API / architecture design (`architecture` rule § Pattern risk) → [`references/review-precedent.md`](references/review-precedent.md) · if touched modules are shallow, duplicated, badly named, misplaced or hard to replace → [`references/deepen-modules.md`](references/deepen-modules.md) · if the work removes a feature or module → [`references/remove-feature.md`](references/remove-feature.md) · if the user flow grows → [`spec-simplify-flow`](../spec-simplify-flow/SKILL.md) · if a heavy operation is involved (`architecture` rule § Performance cost risk) → [`spec-optimize-performance`](../spec-optimize-performance/SKILL.md) · if size is M → [`references/plan-review.md`](references/plan-review.md) · when done → [`loop-build`](../loop-build/SKILL.md) |
| Called by | [`router`](../router/SKILL.md), [`loop-refine`](../loop-refine/SKILL.md) |
| Next | [`loop-build`](../loop-build/SKILL.md) |
| Owner stops | Stop list only ([`agent-behavior` rule § When to ask](../../../.claude/rules/agent-behavior.md)), per [`loop-refine/references/asking.md`](../loop-refine/references/asking.md). Product forks: [`references/fork-checklist.md`](references/fork-checklist.md) |

## Steps

1. **Load the lap.** Read `BRIEF.md` and `DECISIONS.md`. The brief's size sets the depth: XS / S → short plan in `BRIEF.md`; M → full plan + review ([`references/complexity-rubric.md`](references/complexity-rubric.md)).
2. **Investigate** what exists before designing:
   - Reuse: existing features, `src/shared/`, `src/components/common/`, `src/lib/`.
   - Feature decomposition: list the domain concepts; more than one, or over the `featureBudgets.config.cjs` budgets → split features in the plan (`architecture` rule § Feature granularity).
   - Foundation: apply [`references/deepen-modules.md`](references/deepen-modules.md) to the modules on the change's path. Accepted cleanup becomes plan steps and counts toward the size.
   - Then follow every `Calls` condition that applies (reuse, API research, precedent, removal, flow, performance).
3. **Forks.** Before writing any product, scope or architecture-boundary choice into the plan, run [`references/fork-checklist.md`](references/fork-checklist.md). Clear winners are logged; true ties and stop-list items are asked; with the away switch on, ties are agent-picked and stop-list items park the lap.
4. **Foundation validation.** When the approach rests on an unproven assumption (new API, untested algorithm, novel integration), make the first phase a minimal POC that proves or kills it before anything else is built.
5. **Acceptance test first.** Turn the brief's success check into a failing test at the right level (unit, integration, or an e2e/manual script when the check is visual), following `.claude/rules/testing.md`. Record its path in the plan.
6. **Write the plan.** Conflict & compliance first (applicable rules, validated file placements against `projectStructure.config.cjs`, layers and imports, database / security / testing impact, feature README updates). Then phases in order, each with a goal, concrete steps and a gate citing the tooling gate list. At size M, fill the Review contract (pin rules with `git log -1 --format=%h -- .claude/rules`) and Pattern & precedent when material design is involved.
7. **Size check.** If the plan now touches feature areas missing from the brief's edges, or grows past M, update the brief: add the edges, or cut the extra into follow-up backlog tasks. Never widen the lap silently (skill-loop D51).
8. **Review (M only)** per [`references/plan-review.md`](references/plan-review.md): parallel lenses plus rule audits, contract must-fixes applied as Amendments, no owner wait.
9. **Hand off.** Post the footer and run [`loop-build`](../loop-build/SKILL.md).

## Examples

**Example 1 — XS**
Input: brief "app version in the profile menu", size XS, one edge (`layouts`).
Output: failing test `ProfileMenu.test.tsx › shows the app version`; `BRIEF.md` § Plan with three steps and one gate; no review. Footer `Plan: BRIEF.md § Plan · Size XS · Next: loop-build`.

**Example 2 — M with foundation cleanup**
Input: brief "export tasks as CSV", size M (`BRIEF.md` § Edges carries `Borrow / build: in-repo ~20-line serializer over papaparse — flat rows, no new dep`). The task list duplicates filter logic in three hooks.
Output: `DEVELOPMENT_PLAN.md` copies the brief's reuse line into Conflict & compliance. Phase 1 extracts the filter logic into one shared hook per `code-style` § Naming F2 (a third copy). Phase 2 adds the export. The failing acceptance test downloads a CSV. Plan review applies two contract must-fixes (A1–A2).

## Output

The plan (in `BRIEF.md` or `DEVELOPMENT_PLAN.md`), the failing acceptance test, and one chat footer:

```text
Plan: <path> · Size <XS|S|M> · Acceptance test: <path> · Review: <n/a | done, A1–An> · Next: loop-build
```

## Not for

| Case | Use |
|---|---|
| What to build, scope, non-goals | [`loop-refine`](../loop-refine/SKILL.md) |
| Executing the plan | [`loop-build`](../loop-build/SKILL.md) |
| Auditing a finished diff | [`loop-check`](../loop-check/SKILL.md) |
| Unknown-root-cause bug | [`spec-debug-runtime`](../spec-debug-runtime/SKILL.md) |
