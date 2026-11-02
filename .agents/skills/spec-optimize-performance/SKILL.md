---
name: spec-optimize-performance
description: >-
  Finds and fixes performance and complexity hotspots at the right level — design (should this
  exist), approach (rewrite), efficiency (queries, renders, bundles) or complexity (refactor) —
  with stack-native React / Vite / TanStack Query patterns. Use when the architecture rule's
  performance-cost trigger fires (N+1 queries, unbounded selects, big lists, heavy renders,
  oversized bundles), when a plan or diff touches a hot path, or when the owner says "this is
  slow", "optimize", "reduce complexity". Not for runtime bugs (use spec-debug-runtime) or
  cross-feature duplication (loop-plan deepen-modules).
---

# spec-optimize-performance

When this skill is done, the hot path has a fix at the cheapest level that solves it — often deleting or replacing rather than polishing. The trade-off is recorded, and nothing is extracted speculatively. The owner is asked only when the fix hits the stop list (paid usage, a data change, a new dependency).

## Edges

| Field | Value |
|---|---|
| In | The hot path (plan step or diff), measurements when available (CWV, query plans, render counts), `architecture` rule § Performance cost risk |
| Out | The level and option chosen, plan steps or code changes, the trade-off recorded in the plan or PR |
| Calls | always → [`references/optimization-levels.md`](references/optimization-levels.md) · if the fix is a React / Vite / TanStack pattern → [`references/react-perf-vite.md`](references/react-perf-vite.md) + [`rules/`](rules/) · if CWV / Lighthouse symptoms → the `web-perf` plugin skill ([`router/references/external-skills.md`](../router/references/external-skills.md)) |
| Called by | [`loop-plan`](../loop-plan/SKILL.md) (heavy operation in the plan), [`loop-check`](../loop-check/SKILL.md) (heavy operation in the diff) · owner (skill-loop D57) |
| Next | Back to the caller (owner-direct: the fix becomes a backlog task) |
| Owner stops | Stop list only |

## Steps

1. **Measure or estimate** the cost (rows, round-trips, render work, bundle size). Browser-measured symptoms go to `web-perf` first.
2. **Analyze all four levels**, highest first ([`references/optimization-levels.md`](references/optimization-levels.md) § Phase 1): does it need to exist → a different approach → efficiency → complexity.
3. **Pick the cheapest level that solves it**, preferring the reductive option (`debugging` rule § Reductive Strategy). Extracts follow `code-style` § Naming only, with no speculative ones.
4. **Apply stack-native fixes** from [`references/react-perf-vite.md`](references/react-perf-vite.md) (lazy routes, TanStack dedup, re-render rules), citing the rule file.
5. **Verify:** tests per action type (§ Testing Requirements), architecture compliance (§ Phase 5), and the measurement again.

## Examples

**Example 1**
Input: `loop-check`: a list renders 5,000 rows and each row runs a query.
Output: level 3 (efficiency): batch the query plus virtualize the list. The trade-off is recorded, there's no owner question, and the fix goes back through `loop-build`.

## Output

```text
Optimize: <hot path> · cost <estimate> · level <design|approach|efficiency|complexity> · fix <option> · verified <tests, measurement>
```

## Not for

| Case | Use |
|---|---|
| A defect, not slowness | [`spec-debug-runtime`](../spec-debug-runtime/SKILL.md) |
| Duplication across features | [`loop-plan/references/deepen-modules.md`](../loop-plan/references/deepen-modules.md) |
