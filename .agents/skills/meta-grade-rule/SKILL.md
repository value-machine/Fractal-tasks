---
name: meta-grade-rule
description: >-
  Grades or rewrites one rule, command or skill file without executing it. Grade mode scores it
  1–5 on a weighted rubric (clarity, ambiguity handling, structure, completeness, actionability,
  guardrails) with an A–F letter; improve mode rewrites it for brevity, one home per fact,
  separation of concerns, conditional structure, imperative voice and positive framing. Use when
  the owner wants a rule scored, critiqued, graded or tightened, runs /rule-quality or
  /grade-rule, or the harness audit flags one file's wording. Not for the whole harness (use
  meta-audit-harness) or authoring a skill (use meta-write-skill).
---

# meta-grade-rule

When this skill is done, the owner has a justified score per criterion, or a rewritten file that keeps every behavior of the original in fewer, clearer words.

## Edges

| Field | Value |
|---|---|
| In | One attached file (`.claude/rules/**/*.md`, a `SKILL.md`, or command text) — treated as the subject, never executed |
| Out | A grade report, or the rewritten file |
| Calls | always → [`references/rubric-and-standards.md`](references/rubric-and-standards.md) |
| Called by | [`meta-audit-harness`](../meta-audit-harness/SKILL.md) (one file's wording), [`meta-learn-lessons`](../meta-learn-lessons/SKILL.md) (tightening a rule) · owner |
| Next | Back to the caller |
| Owner stops | Writing a rewrite of a protected file (`agent-behavior` rule § Protected Files) |

## Steps

1. **Pick the mode** by intent: grade, improve, or both (grade first, then offer to fix the weakest criteria).
2. **Grade:** score each criterion with evidence from the file, weight it, and give the letter ([`references/rubric-and-standards.md`](references/rubric-and-standards.md) § Mode A).
3. **Improve:** rewrite to the quality standards (§ Mode B); keep every behavior, and list anything dropped and why.
4. **Keep the two copies in step:** a rule description changes in the YAML first, then the `AGENTS.md` catalog.

## Examples

**Example 1 — grade**
Input: "Grade `.claude/rules/platform.md`."
Output: table of six criteria (e.g. clarity 4, ambiguity 3 …), weighted 3.7 → B, the top two fixes.

**Example 2 — improve**
Input: "Tighten the testing rule."
Output: rewritten rule 30 % shorter; a list of merged duplicates; no behavior dropped.

## Output

```text
Grade: <file> · <criterion scores> · weighted <x.x> → <letter> · top fixes <1–3> | Improve: <file> · Δ lines · dropped <none | items>
```

## Not for

| Case | Use |
|---|---|
| Conflicts or cost across the harness | [`meta-audit-harness`](../meta-audit-harness/SKILL.md) |
| Writing or restructuring a skill | [`meta-write-skill`](../meta-write-skill/SKILL.md) |
