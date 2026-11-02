# Concurrency — other threads on the same checkout

Used by [`loop-ship`](../SKILL.md). One lap normally lives on its own branch (worktree under Model C), so smoke here means something is wrong. Ported from `finish` § Concurrent work and `bundle-ship` (v0.42.0).

## Concurrent work / other agent threads (same branch, same checkout)

**Smoke signals:** Before any mandatory version or changelog edit, `git commit`, or `git push` (including the push in [`push-safety.md`](push-safety.md)), treat the working tree as **unstable** if you observe **any** of:

- Unexpected modified or staged files, **or** a `git status` / diff that **shifts between two fresh reads** from disk without this thread having edited those paths.
- Hunks or files that **do not match** this thread’s assumed scope for the current lap.
- `package.json` or `CHANGELOG.md` behaving oddly (for example unexpected concurrent edits, conflicts or merge markers, or metadata that **no longer matches** the current full diff).
- Husky / pre-commit hooks or commit failing due to files **outside** this thread’s stated work.
- A **non-fast-forward** push requirement, or a sudden need to integrate remote updates **without** a clear single-writer explanation from this thread.
- Firm knowledge that **another agent session** is active on the **same branch and same checkout**.

**When any smoke appears:** Do **not** silently bump the version, write or edit changelog entries for release, commit, or push until the owner selects one option under **User choice** below.

### User choice (required when smoke is present)

Ask the owner once ([`loop-refine/references/asking.md`](../../loop-refine/references/asking.md)) with **exactly** these four options (you may shorten labels for the UI; keep the meanings intact):

1. **Pause shipping —** Stop before version/changelog/commit/push. Tell the user what you observed; wait while they resolve concurrency; do **no** further finish steps until they explicitly ask you to continue.
2. **Bundle —** Re-read `git status` and the **full** diff from disk. Treat the branch as **one** release increment (the v0.42.0 `bundle-ship` behavior). Widen changelog and commit scope (and the version bump per [Semantic Versioning](#semantic-versioning-ssot) here) so they accurately describe **everything** that will be included in the commit—**explicit joint ownership** of the snapshot. Then continue the normal finish flow from that baseline.
3. **Stash lane (other thread paused) —** **Only** if the user **explicitly confirms** the other thread or agent is paused: run `git stash push` with flags appropriate so nothing important is left out of the stash (for example include untracked or explicit paths when needed); use a **clear stash message**. Run the rest of the ship stage on the cleaned tree, then commit and push per this skill (push per [`push-safety.md`](push-safety.md)). Then `git stash pop`, or `git stash apply` followed by `git stash drop`. If stash apply produces conflicts, **stop and report**; do **not** silently discard work. After a successful apply, briefly tell the user when it is safe to resume the other agent (for example after they have pulled or confirmed the pushed tip).
4. **Re-check later —** Stop shipping now and tell the user what you observed. Ask them to re-run the ship stage once the other thread is idle (do **not** sleep or poll in the shell — Claude Code blocks foreground `sleep`, and timed waits do not prove the tree is clean). On the re-run, re-read status and full diff from disk: if smoke is **gone** and the tree **matches only this thread’s intended work**, continue shipping **without** widening scope; otherwise ask again with the **same four** options.

**Guardrails:** You cannot stop or suspend other agents. Options that depend on another thread being idle (**3**) or on a later re-run (**4**) rely on **user-stated truth** or on **a clean re-read on the re-run**, not on the assistant controlling other processes. For Option 4, claiming the tree is “only this thread’s work” **must** be justified by a **clean second read** of status and full diff from disk, **not** by assumption.

- remove temporary console logs
- remove instrumentation
- remove redundant/legacy code
- **If this was a debugging session that resulted in a fix:** update `.agents/skills/spec-debug-runtime/references/patterns.md` (the debug pattern library) **only** when the insight is reusable.
  - Capture the pattern at the level of a **bug class**, not a single incident.
  - Use format: **Symptom class -> Likely cause classes -> Discriminator question -> First diagnostic move**.
  - Prefer cross-feature language (e.g. race conditions, stale state, config drift, schema mismatch, effect dependency loops).
  - Avoid incident-only details (exact variable names, one endpoint, one literal, one file) unless they represent a broader class.
  - Add a pattern only if it would likely help in future unrelated debug sessions (rule of thumb: useful in >= 20% of similar bug reports).
  - Keep it concise: max 4 bullets; each bullet should be actionable.
  - **Pattern quality gate (must pass all):**
    - Can this be recognized from symptoms before reading this repo's specific code?
    - Does it suggest at least one falsifiable check?
    - Would a different team/project still benefit from this guidance?


## Bundle preconditions

1. **Same branch, same checkout** — not worktrees, not per-thread branches. (Under Model C parallel work normally lives in separate worktrees, so bundle-ship is rarely needed.)
2. **Other threads idle** — user has paused or finished other agent chats on this checkout. The agent cannot stop other agents.
3. The owner asked for bundle mode (explicit combined commit + push of the whole tree).

If `git status` or the full diff **changes between two fresh reads** without this thread editing those paths, **stop**. Tell the user the tree is still moving; wait until other threads are idle, then re-run.


**Bundle mode** (owner asked to ship everything on one checkout, v0.42.0 `/bundle-ship`, `/finish-all`): snapshot the **full** tree, state what will land, skip the four-option menu (the request is the choice), make **one** commit whose changelog / version cover everything, then push in the same turn. Stop only if the tree changes between two fresh reads, a protected file or secret must change, several `in-progress` tasks make the archive ambiguous, or the branch gate forbids the destination.
