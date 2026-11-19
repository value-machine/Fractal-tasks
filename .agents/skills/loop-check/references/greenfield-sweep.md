# Greenfield sweep

Run by [`loop-check`](../SKILL.md) before every Stop 2, and by [`loop-verdict`](../../loop-verdict/SKILL.md) on a Pass before the merge or promote (greenfield-cleanup D1). The finished change should read as if its final design had been the only design: nothing left over from earlier rounds, abandoned approaches or the debugging that got it there. This is the standard [`loop-plan/references/remove-feature.md`](../../loop-plan/references/remove-feature.md) principle 4 sets for removals, applied to every dev lap.

## Scope

The whole lap branch against its base (`git diff <base>...HEAD`), not only the latest fix round, plus the code those lines touch. Not a repo-wide dead-code sweep: residue elsewhere becomes a backlog task.

## What counts as residue

- **Abandoned approaches:** code, flags, params, branches or files from a design a Change round replaced.
- **Bridges:** a compatibility alias, wrapper, re-export or adapter that only kept an earlier version of this lap working.
- **One-caller switches:** a flag, option or branch that now has a single value or caller.
- **Stale names:** an identifier, file or test title that names an earlier design or the first consumer (`code-style` rule § Naming F3). Also any name the lap touched that no longer matches the vision, a feature README or the UI wording (debt signal I1, [`loop-plan/references/debt-signals.md`](../../loop-plan/references/debt-signals.md)); renames outside the lap become `Foundation:` tasks.
- **Orphans:** exports, helpers, constants, fixtures, mocks or tests that nothing reaches any more, including tests for behavior that no longer exists.
- **Leftovers:** commented-out code, `TODO` / "for now" notes the lap resolved, debug logs and instrumentation. Debugging logs the owner asked to keep stay before Stop 2; a Pass is the owner's confirmation, so the post-Pass sweep removes them (`debugging` rule § Logs).
- **Docs:** README, decision or comment lines that describe an earlier round instead of the final behavior.

## Rules

1. **Behavior stays the same.** The sweep only removes, renames and merges. Anything that would change what the owner tested becomes a backlog task, never part of the sweep.
2. **Prove before deleting.** A reference that may be reached through a string, config key, registry or dynamic import is checked the way `remove-feature.md` checks it, not assumed dead.
3. **Same gates.** After the edits the acceptance test, the lap's tooling gates and CI are green again. A sweep that can't get green is reverted and its items become a backlog task.
4. **Report it.** List what was removed or renamed in the check summary (before Stop 2) or the verdict's closing line (after a Pass). "Nothing found" is a valid result.
