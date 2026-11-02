---
name: spec-simplify-flow
description: >-
  Simplifies one concrete user flow or feature — fewer steps, clicks, states and code — and
  checks it against common product practice: maps the current flow and code surface, audits
  both, decides whether aligning with industry standards is worth it, and proposes progressive
  options from trim to reframe. Use when a request or plan grows a flow, when a flow feels
  overbuilt or unlike other apps, or when the owner asks "simplify this", "is this overbuilt",
  "should we align with how others do it". Not for cross-feature code duplication (loop-plan
  deepen-modules) or performance (use spec-optimize-performance).
---

# spec-simplify-flow

When this skill is done, the flow has a smaller, clearer shape, or a recorded reason why the current one is right. It names which option (trim, streamline, reframe) the lap should build. Inside the loop the agent decides by the fork checklist; called directly by the owner, it presents the options.

## Edges

| Field | Value |
|---|---|
| In | The flow or feature, its code surface, `documentation/DOC_APP_VISION.md`, the precedent rubric |
| Out | Map of the current flow, findings, and options; the chosen option written into the brief or plan |
| Calls | to simplify → [`references/challenge.md`](references/challenge.md) · to judge alignment with common practice → [`references/standards-align.md`](references/standards-align.md) (uses [`loop-plan/references/precedent-rubric.md`](../loop-plan/references/precedent-rubric.md)) |
| Called by | [`loop-refine`](../loop-refine/SKILL.md) (flow in question), [`loop-plan`](../loop-plan/SKILL.md) (flow grows) · owner (skill-loop D57) |
| Next | Back to the caller (owner-direct: the chosen option becomes a backlog task) |
| Owner stops | Inside the loop: stop list only. Owner-direct: the option pick |

## Steps

1. **Bound the target:** one flow or feature, named in user terms.
2. **Map it:** every step, state and click, plus the code surface behind each ([`references/challenge.md`](references/challenge.md) § Phase 1).
3. **Audit both:** challenge lenses on the flow, code-audit lenses on the implementation (§ Phase 2–3).
4. **Should it align?** When the question is "like other apps", score the gap against precedent ([`references/standards-align.md`](references/standards-align.md) § Phase 3–5). A small gap means keep, and the reason is recorded.
5. **Options, lightest first:** trim (drop extras) → streamline (match mainstream composition) → reframe (new model). Each states what the user loses or gains.
6. **Decide:** inside the loop, pick by the fork checklist ([`loop-plan/references/fork-checklist.md`](../loop-plan/references/fork-checklist.md)) and log it. Owner-direct, ask once ([`loop-refine/references/asking.md`](../loop-refine/references/asking.md)) and turn the pick into a backlog task.

## Examples

**Example 1 — inside the loop**
Input: `loop-plan`: the export flow grew to four dialogs.
Output: map → findings (two dialogs only confirm) → trim to one dialog with a format picker. Picked as a clear winner, logged, plan updated.

## Output

```text
Simplify: <flow> · steps <before → after> · align gap <none|small|large> · options <trim | streamline | reframe> · pick <option — why> (logged D<n> | owner)
```

## Not for

| Case | Use |
|---|---|
| Duplication across features | [`loop-plan/references/deepen-modules.md`](../loop-plan/references/deepen-modules.md) |
| Slow code | [`spec-optimize-performance`](../spec-optimize-performance/SKILL.md) |
| Industry check on a new plan | [`loop-plan/references/review-precedent.md`](../loop-plan/references/review-precedent.md) |
