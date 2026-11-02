---
name: meta-write-skill
description: >-
  The one path for adding or changing a project skill under .agents/skills/: captures intent,
  drafts SKILL.md from the recurring template (name prefix, Edges, Steps, Examples, Output,
  Not for), writes the port map when the skill replaces v0.42.0 skills, adds the catalog row,
  optionally tests on realistic prompts and tunes the description so it triggers. Use when the
  owner runs /create-skill or /write-skill, asks to create, edit, rename, merge or optimize a
  skill, or whenever an agent is about to edit a SKILL.md. Not for a whole-harness audit (use
  meta-audit-harness) or grading one rule file (use meta-grade-rule).
---

# meta-write-skill

When this skill is done, the skill follows [`references/skill-template.md`](references/skill-template.md), has a `built` row in [`router/references/catalog.md`](../router/references/catalog.md), and `pnpm validate:skills` passes. Every skill change goes through here so the admission check, the edges and the mirror stay true (skill-loop D37).

## Edges

| Field | Value |
|---|---|
| In | The owner's intent or the conversation's workflow, the existing skill (if any), [`references/skill-template.md`](references/skill-template.md), the catalog, `router/references/baseline-sections.md` |
| Out | `.agents/skills/<name>/` (`SKILL.md`, `references/`, `scripts/`, `evals/` for `loop-*`), the catalog row, the `.claude/skills` mirror (`node scripts/sync-agent-config.mjs`) |
| Calls | always → [`references/authoring.md`](references/authoring.md) · if the skill replaces v0.42.0 skills → [`references/port-map-format.md`](references/port-map-format.md) · after a change to the harness spine (rename, merge, new stage) → [`meta-audit-harness`](../meta-audit-harness/SKILL.md) · if forks must port the change (rename map) → [`meta-write-adoption-guide`](../meta-write-adoption-guide/SKILL.md) |
| Called by | [`meta-learn-lessons`](../meta-learn-lessons/SKILL.md) (lesson is a procedure), [`meta-intake-harness`](../meta-intake-harness/SKILL.md) (new skill after intake) · owner |
| Next | Back to the caller; harness changes land as a lap (`loop-ship`) |
| Owner stops | Protected writes to `.agents/skills/**` (`agent-behavior` rule § Protected Files) · the test prompts and description queries when the owner wants evals |

## Steps

1. **Capture intent:** what the skill enables, when it triggers, its output, and whether to test. Check [`router/references/catalog.md`](../router/references/catalog.md) first and refine an existing skill instead of adding a near-duplicate.
2. **Place it in a layer:** `router`, `loop-<verb>`, `spec-<verb>-<object>` (needs ≥ 2 loop callers, skill-loop D53) or `meta-<verb>-<object>`. Name by role per `code-style` rule § Naming.
3. **Draft from the template** ([`references/skill-template.md`](references/skill-template.md)): description as the trigger, Edges with relative links, imperative steps with the reason, examples, output format, Not for. Detail goes to `references/`.
4. **Port map** when sources are replaced ([`references/port-map-format.md`](references/port-map-format.md)): every baseline heading is kept, moved or dropped with a reason.
5. **Test and tune** when wanted: realistic prompts with and without the skill, then description queries (should-trigger vs near-miss). Procedure: [`references/authoring.md`](references/authoring.md) §§ 3–5.
6. **Integrate:** catalog row, reciprocal Calls ⇄ Called by, `loop-map.md` or `tiebreaks.md` when routing changes, a rule pointer for a guard (skill-loop D56). Run `node scripts/sync-agent-config.mjs`, `pnpm validate:skills`, `pnpm validate:docs`, `pnpm validate:structure`.

## Examples

**Example 1 — new specialist**
Input: "Make a skill for checking accessibility on UI changes."
Output: two loop callers found (`loop-plan`, `loop-check`) → `spec-check-accessibility` with Edges, catalog row `built`, both callers' Calls updated, checks green.

**Example 2 — single caller**
Input: "Add a skill for writing migration notes."
Output: only `loop-ship` would call it → a reference `loop-ship/references/migration-notes.md` instead of a skill (skill-loop D53), and the owner is told why.

## Output

```text
Skill: <name> (<layer>) · files <list> · catalog <row> · port map <n sections> · checks <validate:skills / docs / structure>
```

## Not for

| Case | Use |
|---|---|
| Whole-harness coherence or context cost | [`meta-audit-harness`](../meta-audit-harness/SKILL.md) |
| Grading or rewriting one rule file | [`meta-grade-rule`](../meta-grade-rule/SKILL.md) |
| External content dropped in the inbox | [`meta-intake-harness`](../meta-intake-harness/SKILL.md) |
| A lesson that may be a one-line rule | [`meta-learn-lessons`](../meta-learn-lessons/SKILL.md) |
