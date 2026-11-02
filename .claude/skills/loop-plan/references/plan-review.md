# Plan review (size M only)

One merged review before building (skill-loop D23): the critique lenses from `review-dev-plan` and the rule-compliance fan-out from `validate` plan-review, run **in parallel in one turn**. The agent applies the must-fixes itself; there is no owner sign-off (skill-loop D2). XS / S plans skip this file.

## Fan-out (one turn, all read-only subagents)

Each prompt is self-contained (subagents don't see the chat). It includes the plan path, `BRIEF.md`, the plan's **Review contract**, and the lap `DECISIONS.md`. Each subagent orients on `ARCHITECTURE.md`, `documentation/DOC_APP_VISION.md` and the rules the plan touches.

| # | Lens | Brief |
|---|---|---|
| 1 | **Naming generality (fixed)** | Read `.claude/rules/code-style.md` § Naming and scan the plan for violations: a forbidden name, a second copy without its marker, a third or later copy, a placement line naming one file as the home, or a glob keyed to an instance name. Don't flag test titles, examples explicitly marked as wrong, or paths labeled as one shipped instance. |
| 2 | **Rebel (fixed)** | Say plainly when a clean-slate or different approach beats the plan, with a high-level alternative. No incremental polish. |
| 3 | **Scale / modularity (fixed)** | Load, cost, data growth, failure modes, ceilings; coupling, layers, ports, swappable dependencies, lock-in. |
| 4 | **Industry precedent (fixed)** | Use [`precedent-rubric.md`](precedent-rubric.md): pick the relevant aspects, name the precedents, flag material divergence and a missing § Pattern & precedent. |
| 5–6 | **Agent picks two** | Distinct lenses for this plan (delivery sequencing, tests, security / ops, UX / API). |
| 7+ | **Rule compliance** | One subagent per rule plausibly relevant to the plan, always including `code-style`. Contract and output schema: [`loop-check/references/rule-audit.md`](../../loop-check/references/rule-audit.md) § Subagent contract (mode `plan-review`). |

## Grade against the contract

| Basis | Meaning | Must-fix? |
|---|---|---|
| `contract` | Cites a contract line (pinned rule, required lens, tooling gate) the plan fails | Yes |
| `drift` | Holds only under rule text changed after the pin | No |
| `advisory` | Outside the contract: rebel alternative, scale concern, extra lens, unpinned rule | No |

Already decided is not a finding: a Closed row in `DECISIONS.md`, a recorded decision (README, vision, rule), a confirmed standards diversion, or a Pattern & precedent waiver. The naming lens is `contract` when `code-style` is pinned.

## Apply (no owner wait)

1. Synthesize: agreements, `contract` must-fixes, `advisory` items, and anything flagged by two or more lenses. Every naming finding is listed, even when only that lens raised it.
2. Apply every `contract` must-fix to the affected plan section, with one **Amendments** row each (`source: plan-review`).
3. Don't promote `advisory` or `drift` items. List them under **Notes during development** so they stay visible.
4. A must-fix that would change the brief's scope or hit the stop list (new dependency, data / irreversible, cost) goes to the owner per `agent-behavior` § When to ask. It's not applied silently.
5. Set Summary **Plan review** to `Done <date>`.

## Output (chat, one block)

```text
Plan review: <n> lenses · contract must-fixes <n> applied (Amendments A1–An) · advisory <n> (in Notes) · owner questions <0|n>
```
