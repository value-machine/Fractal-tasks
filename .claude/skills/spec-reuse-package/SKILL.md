---
name: spec-reuse-package
description: >-
  Checks whether a well-maintained package or a proven public pattern should replace custom code
  for a generic subsystem (auth, webhooks, parsing, queues, rate limits, validation, protocol
  clients, caching, complex widgets): checks current dependencies first, searches broadly,
  shortlists 2-3 candidates, checks license fit, and recommends without installing. Use when the
  architecture rule's "Don't reinvent the wheel" trigger fires, before planning or writing a
  nontrivial generic subsystem, or when the owner asks "is there a library for this". Not for
  small bespoke business logic, or for industry design precedent (loop-plan review-precedent).
---

# spec-reuse-package

When this skill is done, the plan holds a compact reuse recommendation — use an existing dependency, add a named package, model a public pattern, or build custom with a reason — and the stop-list question for a new dependency is ready if one is recommended. It never installs anything.

## Edges

| Field | Value |
|---|---|
| In | The subsystem the plan or diff needs, `package.json`, existing `src/` coverage |
| Out | `Borrow / build:` line in `BRIEF.md` § Edges (and `DEVELOPMENT_PLAN.md` § Conflict & compliance at size M); a stop-list question when a new dependency is recommended |
| Calls | always → [`references/reuse-search.md`](references/reuse-search.md) |
| Called by | [`loop-refine`](../loop-refine/SKILL.md) (any `new` edge row), [`loop-plan`](../loop-plan/SKILL.md) / [`loop-build`](../loop-build/SKILL.md) (fallback if a new mechanism appears later) · owner (skill-loop D57) |
| Next | Back to the caller |
| Owner stops | A new dependency (stop list — `agent-behavior` § When to ask) |

## Steps

1. **What's already there:** current dependencies and shared code that already cover it. If they do, that's the answer.
2. **Worth a search?** Skip for small, bespoke logic; say so in one line.
3. **Search broadly** (registries, maintained projects, framework docs) without anchoring on the first hit.
4. **Shortlist 2–3 candidates** and skim them: maintenance, size, API fit, coupling, security history.
5. **License fit** against this project.
6. **Recommend, then stop:** one clear winner, or an honest trade-off. A new package becomes one owner question, per [`loop-refine/references/asking.md`](../loop-refine/references/asking.md). Details: [`references/reuse-search.md`](references/reuse-search.md).

## Examples

**Example 1**
Input: CSV export needs serialization.
Output: no existing dependency covers it. Candidates: `papaparse` (maintained, 45 kB) and a ~20-line in-repo serializer (the data is flat). Recommendation: the in-repo serializer (no new dependency) → no owner question needed.

## Output

```text
Reuse: <subsystem> · existing: <covers | none> · candidates: <a, b> · rec: <choice — why> · owner question: <yes (new dependency) | no>
```

## Not for

| Case | Use |
|---|---|
| Is this design how products usually do it? | [`loop-plan/references/review-precedent.md`](../loop-plan/references/review-precedent.md) |
| Researching a vendor API contract | [`loop-plan/references/research-api.md`](../loop-plan/references/research-api.md) |
