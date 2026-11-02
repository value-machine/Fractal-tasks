# Review against industry precedent

Read in [`loop-plan`](../SKILL.md) whenever a plan or proposal introduces material UX, API or architecture design, at any size. The trigger is the `architecture` rule § Pattern risk (skill-loop D56). Ported from `pattern-review` (v0.42.0). This compares against **external** precedent, not "how this repo already does it". Repo-rule compliance is `loop-check`'s job; internal workaround shapes belong to [`spec-check-layer`](../../spec-check-layer/SKILL.md), which runs first when both apply.

## Procedure

1. Read [`precedent-rubric.md`](precedent-rubric.md).
2. Gather context: plan path, proposal, or changed scope.
3. **Classify** the capability; **pick precedents**; **select dimensions** that matter for this change (agent judgment — not a fixed checklist).
4. If review is **not needed** (trivial / no new behavioral contract) → one short paragraph and stop.
5. If **aligned** or **acceptable product-specific** with documented tradeoffs → short summary; proceed under normal gates.
6. If **non-standard** → write the alert ([`precedent-alert.md`](precedent-alert.md)) into the plan, **pick** the option per [`fork-checklist.md`](fork-checklist.md) § Tie resolution, and log it. Not an owner stop by itself (skill-loop D2); it becomes one only when the pick hits the stop list (data / irreversible, cost, new dependency, a conflict with a recorded decision).
7. For `plan-section`, record it in the plan § **Pattern & precedent** ([`plan-template.md`](plan-template.md)).

---

## Modes

- **scan** (default): full lens — precedents → chosen aspects → verdict → alert when non-standard.
- **plan-section**: write § Pattern & precedent in the plan.
- **lite** (mid-build, no plan section): [`precedent-rubric.md`](precedent-rubric.md) § Lite pass; escalate to scan on material divergence.

## Output (in the plan, and one chat line)

```text
Pattern review: <skipped — reason | aligned | product-specific | non-standard — picked <option>, logged D<n>>
```
