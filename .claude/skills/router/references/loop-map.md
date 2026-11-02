# Loop map

The product-owner loop (skill-loop D10). It replaces `dev-cycle-matrix.md` and `skill-relationship-flow.md` (v0.42.0). [`../SKILL.md`](../SKILL.md) uses this map to find where a lap stands. Decisions: [`DOC_DECISION_LOG.md`](../../../../documentation/DOC_DECISION_LOG.md) § skill-loop.

```text
STOP 1 ── loop-backlog ──► loop-refine ── "Building: X. Not: Y. Size: S." (no wait)
                               │
AUTONOMOUS                     ▼
   loop-plan ──► loop-build ──► loop-check ──► loop-ship ──► PR + preview
                    ▲               │ blockers                   │
                    └───────────────┘                            ▼
STOP 2 ──────────────────────────────────────────────── loop-verdict
     Pass   → loop-ship merges (C) / promotes (A/B) → task archived → loop-backlog
     Change → lessons on the same PR → feedback = top task → loop-backlog → loop-refine
     Drop   → PR closed → lessons as a backlog task → loop-backlog
```

- **Owner stops:** Stop 1 (confirm the top task; answer refine questions), Stop 2 (Pass / Change / Drop), and anything on the stop list (`agent-behavior` rule § When to ask) at any stage.
- **Waiting on owner** is one state (skill-loop D45, D46): a lap at Stop 2, or parked on a stop-list question (an Open row in its `DECISIONS.md`). Waiting laps don't block the next task; only one lap is in the build stages at a time.
- **Sizes:** XS / S / M. Larger work is cut into laps of ≤ M (skill-loop D44).
- **One lap = one branch** (worktree under Model C): the brief, ledger, plan and code of a lap all live on it (skill-loop D45).

## Where a lap stands (resolution order — first match wins)

| Evidence | Stage |
|---|---|
| The owner's message names something to do now | `loop-backlog` step 1 (top of the backlog, skill-loop D26; on a fork without hosting, its gates run first) |
| A fork whose onboarding is still open ([`onboarding.md`](../../loop-backlog/references/onboarding.md) § Still open on a fork), including a bare "initialize", "set up" or "next" | `loop-backlog` → onboarding from the first gate that hasn't passed (onboarding-first-lap D1) |
| A lap has an Open row in `DECISIONS.md` (parked question) | Ask that question ([`loop-refine/references/asking.md`](../../loop-refine/references/asking.md)), then resume the lap's stage |
| A lap's PR was merged with no verdict in chat (the owner merged it, or auto-merge did) | Pass: `loop-verdict` step 3.1, then `loop-backlog` (merge-is-pass D2) |
| A lap's PR is open, CI green, preview present, no verdict yet | `loop-verdict` |
| A lap's PR is open with CI red or pending | `loop-ship` step 6 |
| Lap branch: every plan phase is `Done`, but there is no PR and no check summary | `loop-check` |
| Lap branch: the plan exists, with phases `Pending` | `loop-build` (first pending phase) |
| Lap branch: `BRIEF.md` exists, no plan | `loop-plan` |
| A task is `in-progress` with no lap folder | `loop-refine` |
| Nothing in progress | `loop-backlog` |

Find laps by listing `documentation/jobs/temp_job_*/BRIEF.md` on local and remote branches (`git branch -a`, `gh pr list`). The branch name carries the slug.

## Outside the loop

| Request | Where |
|---|---|
| Question with no repo change | Answer directly (skill-loop D54) |
| Harness maintenance (skills, rules, audits, intake, adoption guides) | `meta-*` skills, called directly (skill-loop D36): [`meta-write-skill`](../../meta-write-skill/SKILL.md), [`meta-audit-harness`](../../meta-audit-harness/SKILL.md), [`meta-intake-harness`](../../meta-intake-harness/SKILL.md), [`meta-write-adoption-guide`](../../meta-write-adoption-guide/SKILL.md), [`meta-learn-lessons`](../../meta-learn-lessons/SKILL.md), [`meta-grade-rule`](../../meta-grade-rule/SKILL.md) |
| One-off specialist work, called directly (skill-loop D57); a resulting repo change becomes a backlog task | [`spec-load-context`](../../spec-load-context/SKILL.md), [`spec-debug-runtime`](../../spec-debug-runtime/SKILL.md), [`spec-reuse-package`](../../spec-reuse-package/SKILL.md), [`spec-simplify-flow`](../../spec-simplify-flow/SKILL.md), [`spec-optimize-performance`](../../spec-optimize-performance/SKILL.md), [`spec-check-layer`](../../spec-check-layer/SKILL.md) |
| Ultra-brief output | [`meta-compress-output`](../../meta-compress-output/SKILL.md) (overlay) |
