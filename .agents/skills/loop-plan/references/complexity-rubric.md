# Size rubric (reference)

Used by [`loop-refine`](../../loop-refine/SKILL.md) (size estimate, skill-loop D12) and [`loop-plan`](../SKILL.md) (plan depth). Size counts the edges touched **plus** the refactor a clean implementation needs, so cleanup is part of the size (skill-loop D12, D21).

| Size | Typical signals | Plan depth |
|------|-----------------|------------|
| **XS** | One file or doc-only; no schema or auth change; one feature area | Short plan in `BRIEF.md` |
| **S** | A few files; one feature area plus its direct neighbors; no migration | Short plan in `BRIEF.md` |
| **M** | Multiple phases; a migration or cross-cutting rules; several feature areas | `DEVELOPMENT_PLAN.md` + [`plan-review.md`](plan-review.md) |
| *(larger)* | Breaking API; large UX / navigation coupling; many integration points | **Not a lap.** Cut into laps of ≤ M, each with its own preview (skill-loop D44) |

When in doubt between two sizes, pick the larger one. **Overrun** (skill-loop D51): during build, a diff touching a feature area that isn't in the brief's edges table stops the lap.
