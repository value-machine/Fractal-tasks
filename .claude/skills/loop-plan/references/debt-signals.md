# Debt signals — triggers for refactoring toward deeper insight

The owner doesn't read the code, so nobody else will notice when it stops fitting the product. These are the signals an agent meets while reading code for an ordinary lap. Each one triggers work on its own, with no owner decision (debt-triggers D1). Read by [`loop-refine`](../../loop-refine/SKILL.md) step 2, [`loop-plan`](../SKILL.md) step 2, [`loop-build`](../../loop-build/SKILL.md) step 2 and the [greenfield sweep](../../loop-check/references/greenfield-sweep.md).

## Insight signals — the code's model no longer fits the product

| id | You notice | Usually means |
|---|---|---|
| I1 | **Word mismatch:** the task, vision, a feature README or the UI names a concept differently than the code does, or one code name now covers two product meanings | Rename the code to the product's word (`code-style` rule § Naming F3–F4) |
| I2 | **Bending:** the new behavior only fits by adding a type switch, a boolean parameter, an `isX` flag or a special case to an existing module | A concept is missing, or one module holds two concepts: split or add it |
| I3 | **Wrong grouping:** the request treats as one thing what the code spreads over several modules, or as two things what one module holds | Merge or split to match the product |
| I4 | **Stale explanation:** a README line, comment or test title you had to discount because it describes older behavior | Rewrite it to the current behavior |
| I5 | **Surprise:** the layer check corrected the request's assumption, or your own first reading of the code was wrong | The code doesn't say what it does: rename or restructure until it does |

## Friction signals — debt that taxes every change

| id | You notice | Usually means |
|---|---|---|
| F1 | **Shotgun change:** one concept change touches more than 5 files or 3 features | Missing module that owns the concept ([`deepen-modules.md`](deepen-modules.md)) |
| F2 | **Copying is the easy path:** the quickest implementation copies an existing module | Extract per `code-style` § Naming F2 |
| F3 | **Hotspot:** a touched file changed in most recent laps (`git log --since="60 days ago" --name-only --format=`), or exceeds the ESLint complexity limits | Split it by reason to change |
| F4 | **Hard to test:** testing the new behavior needs many mocks or reaching into internals | Seam in the wrong place ([`deepen-modules.md`](deepen-modules.md) § 5) |
| F5 | **Residue on the path:** unused exports, a flag with one value, a deprecated alias past its removal note, a resolved `TODO` or "for now", a baselined lint or architecture violation in the focus set | Remove it |
| F6 | **Repeat bug:** [`spec-debug-runtime`](../../spec-debug-runtime/SKILL.md) lands in a module an earlier fix touched | The module's design invites the bug |
| F7 | **Workaround shape** in your own plan or diff ([`spec-check-layer`](../../spec-check-layer/SKILL.md)) | Take the structural fix (debt-triggers D4) |

## What happens next — no owner decision

1. **Record** each signal where you are: `BRIEF.md` § Foundation signals (refine), the plan's **Foundation** lens (plan), or **Notes during development** (build). One line: id, where, what.
2. **In the focus set and the lap stays ≤ M:** it becomes plan steps (an insight rename or split, or [`deepen-modules.md`](deepen-modules.md) § 5). Behavior stays the same and the lap's gates cover it.
3. **Otherwise:** [`loop-ship`](../../loop-ship/SKILL.md) step 3 writes a backlog task in the same commit: title `Foundation: <area> — <one-line fix>`, description with the signal id, the files, the suggested fix and `found in <lap-slug>`. These tasks have owner test `none`, so they merge on green CI without a Stop 2 question.
4. **Product words decide, code follows.** For I1 the vision, feature README and UI wording are the source. Only when those disagree with each other is it the owner's choice (a conflict with a recorded decision).
5. **Never a behavior change.** A signal that needs different behavior to fix becomes an ordinary task, ranked like any other.

## Picking up foundation tasks

- **Refine:** an open `Foundation:` task whose area is in the brief's edges joins the lap while the size stays ≤ M (listed under In scope). The agent is already reading that code.
- **Backlog:** a `Foundation:` task that has waited through 3 or more landed laps ranks above value-per-size tasks, after blockers ([`loop-backlog`](../../loop-backlog/SKILL.md) step 4).
