---
name: meta-learn-lessons
description: >-
  Turns what just went wrong — a non-Pass verdict, repeated failed attempts, a critical CI fix,
  owner corrections — into durable guidance: traces the cause back to existing rules and skills
  (removal-first), applies a blank-model test so nothing a capable model already knows is
  persisted, picks one home per lesson and commits it to the same PR. Use when loop-verdict gets
  Change or Drop, when the owner runs /learn or asks for a retrospective or to sharpen rules, or
  after a multi-turn struggle is resolved. A manual /learn runs in the same turn, before any
  commit, even beside red CI. Not for active debugging (use spec-debug-runtime) or a
  harness-wide audit (use meta-audit-harness).
---

# meta-learn-lessons

When this skill is done, the mistake cannot silently repeat: the guidance that caused it is narrowed or removed, any new lesson lives in exactly one home, and textbook knowledge was left out on purpose. Lessons ride the lap's PR, each one only after the owner's yes in chat; a Pass or a merge never approves them (merge-is-pass D3).

## Edges

| Field | Value |
|---|---|
| In | Plan § Notes mistake signals, the diff and `git log`, CI output, owner corrections, `documentation/DOC_RULES_INDEX.md`, the rules and skills in the lesson's domain |
| Out | Edits to one rule, skill or `spec-debug-runtime/references/patterns.md` on the lap's branch; the lesson report |
| Calls | always → [`references/lesson-procedure.md`](references/lesson-procedure.md) · if the lesson is a reusable procedure (a skill) → [`meta-write-skill`](../meta-write-skill/SKILL.md) · if it is a harness-wide structural conflict → [`meta-audit-harness`](../meta-audit-harness/SKILL.md) · if a rule's wording needs tightening → [`meta-grade-rule`](../meta-grade-rule/SKILL.md) |
| Called by | [`loop-verdict`](../loop-verdict/SKILL.md) (Change or Drop) · owner |
| Next | Back to `loop-verdict` (Change → feedback on top of the backlog); owner-direct → report and stop |
| Owner stops | Deleting or substantially rewriting existing rule text (show the line and the proposal first); large rewrites |

## Steps

1. **Run now when invoked by hand:** a manual `/learn` finishes in this turn and persists before any commit; proactive runs wait until the struggle is resolved.
2. **Inspect** what happened (diff, log, CI, corrections) as 3–7 bullets: symptom → root cause → fix.
3. **Reverse audit:** search rules and skills for lines that steered toward the mistake; classify misleading, overly broad, outdated, base knowledge or innocent.
4. **Form the lesson** (trigger, constraint, scope) and apply the **blank-model test**: would a capable model with no repo rules already do this? Yes → don't persist; list it under Omissions.
5. **Choose one home** from the table in [`references/lesson-procedure.md`](references/lesson-procedure.md) § 3; mechanical lessons become validators, not prose.
6. **Apply** a minimal edit matching the file's style; removals and narrowing are shown to the owner first.
7. **Report:** TL;DR, location, removals with the owner's decision, omissions.

## Examples

**Example 1 — Change verdict**
Input: `loop-verdict`: "the export ignored the filter"; plan notes show the agent assumed the list query held the filters.
Output: reverse audit finds nothing misleading; the lesson is the repo's filter contract → one bullet in `src/features/tasks/README.md`; committed on the same PR.

**Example 2 — textbook lesson**
Input: `/learn` after a missing `await` caused a race.
Output: blank-model test passes (any model knows this) → nothing persisted; omission listed; if a lint rule could catch it, that goes under "could be enforced" instead of prose.

## Output

```text
Lesson: <1–2 sentences> · saved <file § section | nothing> · removals <proposed / applied> · omissions <items + why>
```

## Not for

| Case | Use |
|---|---|
| An incident still being debugged | [`spec-debug-runtime`](../spec-debug-runtime/SKILL.md) |
| Conflicts across the whole harness | [`meta-audit-harness`](../meta-audit-harness/SKILL.md) |
| Scoring one rule file | [`meta-grade-rule`](../meta-grade-rule/SKILL.md) |
