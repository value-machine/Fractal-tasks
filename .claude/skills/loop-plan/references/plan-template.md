# `DEVELOPMENT_PLAN.md` template

Used by [`loop-plan`](../SKILL.md) at size **M**. XS / S plans live in `BRIEF.md` § Plan instead (same fields, shorter). Output path:

`documentation/jobs/temp_job_<name>/DEVELOPMENT_PLAN.md`

## Skeleton

```markdown
# Development plan: <Title>

## Summary

- **Goal:**
- **Why:**
- **Brief:** `BRIEF.md` (problem, success check, in / out, edges)
- **Size:** XS | S | M — <one-line reason> (larger work is cut into laps — skill-loop D44)
- **Acceptance test:** <path of the failing test written first — skill-loop D49>
- **Plan review:** Not required (XS/S) | Done <YYYY-MM-DD> (`plan-review.md`)
- **Scope / constraints:**

## Phase overview

| Phase | Goal | Gate | Status |
|-------|------|------|--------|
| 1 | … | … | Pending |

## Conflict & compliance

- Applicable rules:
- File placements:
- Reuse / packages: <`spec-reuse-package` rec, or skipped — reason>
- Foundation cleanup: <`deepen-modules.md` candidates in the plan, or none — reason>
- Risks / open questions:
- Standards diversions (repo / industry):

## Review contract

The bar this plan and its implementation are graded against. [`plan-review.md`](plan-review.md) and `loop-check` grade against this section. Anything outside it is advisory unless the user promotes it (see Amendments).

- **Rules pinned:** `rules@<short SHA>` (`git log -1 --format=%h -- .claude/rules`) — <rule paths from Conflict & compliance § Applicable rules>
- **Required lenses:** Pattern & precedent (material design), Reuse / packages, Feature decomposition, Foundation cleanup, Naming (`.claude/rules/code-style.md` § Naming) — mark any that are skipped with a reason
- **Tooling gate:** [`loop-check/references/rule-audit.md`](../../loop-check/references/rule-audit.md) § Tooling pass (contract gate list) — phase gates cite this list instead of restating commands
- **Locked decisions:** recorded decisions (feature READMEs, vision, rules) + sibling `DECISIONS.md` + **Decisions made** below + Amendments

### Amendments

Every change to the bar after the plan is written: an applied must-fix, a promoted advisory finding, or a waiver.

| # | Date | Source | Change | Applied to |
|---|------|--------|--------|------------|

## Pattern & precedent

Required when the plan introduces material UX / API / architecture design, at any size (`architecture` rule § Pattern risk, skill-loop D56). Use [`review-precedent.md`](review-precedent.md) ([`precedent-rubric.md`](precedent-rubric.md) — agent picks relevant aspects).

| Field | Value |
|-------|--------|
| **Capability** | What user-facing or contractual behavior this plan delivers (one line) |
| **Precedents** | 1–3 familiar products, apps, or patterns this resembles |
| **Aspects reviewed** | Bullets: dimensions the agent actually compared (from rubric pool; add others if needed) |
| **Findings** | Short per aspect: aligns / diverges / risk |
| **Verdict** | `Aligns with precedent` / `Acceptable product-specific` / `Non-standard — agent-picked <option>` |
| **If non-standard: options** | A / B / C one line each |

If pattern review was skipped (no new behavioral contract), one line: **Pattern review:** skipped — <reason>. A non-standard verdict is decided by the agent and logged unless it hits the stop list.

## Notes during development

(Leave empty in the initial plan.)

## Decisions made

Impl-time only (`loop-build` fills). Product/scope forks → sibling `DECISIONS.md` (`loop-refine` / `loop-plan`), folded into their homes before merge.

| # | Topic | Choice | Precedent? |
|---|-------|--------|------------|
```

See [`complexity-rubric.md`](complexity-rubric.md) for Complexity levels.

## Per phase

Phases are in logical order and split into workable chunks. **Each phase has a gate.**

| Subsection | Content |
|---|---|
| **Goal** | What this phase achieves |
| **Steps** | Concrete steps aligned with Conflict & compliance (paths, layers, patterns) |
| **Gate** | How the phase is verified — cite the tooling gate list plus the checks below |

Optional sections when relevant: Source / context, User stories (from `BRIEF.md`), Existing functionality reused, Scope / out-of-scope (from `BRIEF.md`).

## Gate examples

- **Frontend (Vite + React + Tailwind / shadcn-ui):** expected UI present; primary flows work; loading / error / empty states; responsive where relevant (browser MCP when available).
- **Edge Functions:** invoke locally or deployed and verify the response (`.claude/rules/cloud-functions.md`).
- **Database:** migration applied to a test or staging DB; schema verified; RLS tested with representative roles.
- **Repo quality:** lint, type-check and the tests the change touches pass at each phase boundary; the acceptance test passes at the last one.

## Example phase overview

```markdown
| Phase | Goal | Gate | Status |
|-------|------|------|--------|
| 1 | Extract shared filter hook | tests for useTaskFilters pass | Pending |
| 2 | Add CSV export | acceptance test passes | Pending |
```
