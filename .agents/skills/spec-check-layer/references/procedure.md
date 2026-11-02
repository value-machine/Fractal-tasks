# Layer-consistency check — procedure

Read by [`spec-check-layer`](../SKILL.md). Ported from `layer-consistency-check` (v0.42.0). The trigger and core reflex live in `.claude/rules/architecture.md` § Layer consistency (skill-loop D33, D56).


**Scope:** Catch requests or in-progress code that violate a deeper layer underneath what was literally asked for — physical/mathematical constraints, an existing abstraction or naming hierarchy, or system-architecture assumptions — **before** silently building a workaround on top.

**Feedback first** — surface the mismatch and structural alternative; do not write workaround code until the user chooses.

## Proactive obligation (agents)

Apply **without being asked** during any implementation task when request-side cues or implementation-side shapes appear (see [`references/workaround-shapes.md`](workaround-shapes.md)). Obligation is also stated in `.claude/rules/architecture.md` § Layer consistency (workaround guard).

**Do:** one-beat layer check → **shape #5 first** (read `.claude/rules/code-style.md` § Naming for any new or copied symbol; the one-off skip does not suppress that rule or the second-copy marker) → for every other shape, severity filter (skip a genuinely one-off exception with no recurring cost) → if that shape still clears the bar, post alert from [`references/alert-template.md`](alert-template.md) → **stop** until owner picks workaround vs structural path.

**Do not:** treat local compliance within the request's phrasing as sufficient without checking the layer beneath.

## Core reflex (all coding tasks)

Every request carries the user's **assumption about how the system works** — and the user can't see the actual implementation, so the assumption is often wrong. **Verify it before acting.**

Trigger: any request to change existing behavior ("add a color to the gradient", "make it splash", "just add a field/button/flag"), plus the request-side cues in the shapes rubric. Mid-implementation: stop whenever your own code starts to look like a workaround (implementation-side shapes).

## The core error this guards against

**Local compliance without layer-consistency checking**: when the request conflicts with a deeper layer, silently absorbing the conflict by adding a workaround. The workaround becomes new surface area that hides the original mismatch, and the cost compounds every time something else gets built on top.

The requester usually can't see this coming. Catch what they can't see — not tradeoffs they've already flagged explicitly.

## Where everything lives

Per [`documentation/DOC_AGENT_WORKFLOW_LAYERS.md`](../../../../documentation/DOC_AGENT_WORKFLOW_LAYERS.md).

| What | Path |
|------|------|
| **Procedure** (this file) | `.agents/skills/spec-check-layer/SKILL.md` |
| **Detection rubric** (cues + seven shapes + severity) | `.agents/skills/spec-check-layer/references/workaround-shapes.md` |
| **Alert template** | `.agents/skills/spec-check-layer/references/alert-template.md` |
| **Always-on reminder** | `.claude/rules/architecture.md` § Layer consistency (workaround guard) |

---

## Procedure

1. Read [`references/workaround-shapes.md`](workaround-shapes.md).
2. **Proactive:** on request-side cues, run the one-beat layer check before writing code.
3. **Reactive:** while implementing, stop when the diff matches a workaround shape.
4. **Naming first (shape #5).** Read `.claude/rules/code-style.md` § Naming and apply it before writing the name. The one-off skip does not apply. If the name or copy count still violates that rule, stop with WARNING.
5. **Other shapes.** Skip a genuinely one-off exception with no recurring cost.
6. If a non-naming shape still clears that filter → post **WARNING, WORKAROUND** from [`references/alert-template.md`](alert-template.md) → **stop** until the user chooses.
7. If the user picks the **structural alternative**: IF scope is XS/S THEN `loop-plan` (XS/S); IF multi-phase/migration/contracts THEN `loop-plan` (cite `router/references/tiebreaks.md` § `loop-build` vs `loop-plan` (XS/S)). If they pick the workaround → implement as asked.
8. **When invoked from `router`:** treat the IMPROVE finding text + target name as the proactive cue; run the one-beat check before any code.

---

## Examples (abbreviated)

Full domain variety is in the shapes rubric. Illustrative cases:

- **Fluid sim:** "can waves just splash over that wall?" on a shallow-water solver → disconnected particle burst vs different representation.
- **Game design:** double-jump in one level → level-specific ability flag vs reach invariant redesign.
- **TypeScript UI:** `BreadBuyButton` is an example of encoding the first product. Judge it with `.claude/rules/code-style.md` § Naming. Do not skip the check as a one-off.
- **Design systems:** one-off modal corners → inline override vs token change.
- **Backend/schema:** `discount_percent` for one promo → UI subtraction vs pricing-engine extension.

---

## What this is NOT

| Concern | Use instead |
|---------|-------------|
| External industry / product precedent | [`loop-plan → review-precedent`](../../loop-plan/references/review-precedent.md) |
| Package / pattern reuse vs custom code | [`spec-reuse-package`](../../spec-reuse-package/SKILL.md) |
| Heavy DB/UI operation cost | `.claude/rules/architecture.md` § Performance cost risk |
| Repo rule compliance on plan or diff | [`loop-check`](../../loop-check/SKILL.md) |
| Post-hoc wrong-layer repair in existing code | [`loop-plan → deepen-modules`](../../loop-plan/references/deepen-modules.md) § Semantic placement |
| Vague "make it better" request | [`router`](../../router/SKILL.md) → a backlog task through the loop |
| Simplify an overbuilt feature workflow | [`spec-simplify-flow`](../../spec-simplify-flow/SKILL.md) |
| Should we / how to align existing scope with industry standards | [`spec-simplify-flow`](../../spec-simplify-flow/SKILL.md) |
| Hotspot refactor / Rule of Three | [`spec-optimize-performance`](../../spec-optimize-performance/SKILL.md) |
| How to name new symbols, and when a copy must be extracted | `.claude/rules/code-style.md` § Naming — this skill only **stops** if that rule is violated |

**When both precedent review (`loop-plan`) and this skill apply:** run **this check first** (cheaper one-beat check). If the user picks a structural path that changes UX/API contracts, run precedent review (`loop-plan`) before implementing.

---

## Output (chat)

```markdown
Layer consistency: <passed — one-beat check | WARNING, WORKAROUND — see below>
```

If WARNING posted:

```markdown
Next: owner pick workaround vs structural alternative → then implement / plan / quick-piv
```

---

## Related

- [`loop-plan → review-precedent`](../../loop-plan/references/review-precedent.md) — industry precedent (complementary lens)
- [`spec-simplify-flow`](../../spec-simplify-flow/SKILL.md) — should/how industry align on existing scope
- [`loop-plan → deepen-modules`](../../loop-plan/references/deepen-modules.md) — semantic placement repair (post-hoc)
- [`router` tiebreaks](../../router/references/tiebreaks.md) § precedent review (`loop-plan`) vs `spec-check-layer`
- [`meta-learn-lessons`](../../meta-learn-lessons/SKILL.md) — persist lessons from resolved workaround debates
