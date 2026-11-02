# Skill template (recurring structure)

The one structure every new skill follows. [`scripts/validate-skills.cjs`](../../../../scripts/validate-skills.cjs) checks it, and admission requires a row in [`router/references/catalog.md`](../../router/references/catalog.md). Sources: skill-loop D30, D31, D55, D58, D59 in [`DOC_DECISION_LOG.md`](../../../../documentation/DOC_DECISION_LOG.md) § skill-loop. The structure was checked against MILA `write-a-skill` and Anthropic `skill-creator`.

## Folder

```text
.agents/skills/<name>/
├── SKILL.md               # this template; body ≤ ~250 lines
├── references/
│   ├── PORT_MAP.md        # required while the catalog row lists v0.42.0 sources (port-map-format.md)
│   └── <topic>.md         # loaded on demand; one level deep (references never link to references)
├── scripts/               # deterministic, repeated work: validation, formatting, parsing
└── evals/                 # required for loop-* skills
    └── <case-name>/       # lowercase-with-hyphens, says what is tested
        ├── prompt.md      # settings block, then the prompt exactly as a user types it
        ├── case.yaml      # schema_version: "1.1", name, expected_outcome
        └── graders/01-<few-words>.md
```

`evals/` follows the `claude plugin eval` layout, so the same cases run from the CLI. During the port, the baseline for each case is the v0.42.0 skill(s) the new skill replaces (skill-loop D59).

## `SKILL.md`

The `<link: …>` placeholders below stand for relative markdown links. A real skill writes them out so the link validator and the reciprocity check can read them.

```markdown
---
name: <router | loop-<verb> | spec-<verb>-<object> | meta-<verb>-<object>>
description: >-
  <What it does, one sentence.> Use when <conditions and the phrases people
  actually type — a little pushy, since agents under-trigger skills>.
  Not for <neighbor case> (use <skill>).
---

# <name>

<Purpose: 2–3 sentences on what is true when this skill is done, and why that matters.>

## Edges

| Field | Value |
|---|---|
| In | <files and state it reads> |
| Out | <files and state it writes> |
| Calls | if <condition> → <link: ../<skill>/SKILL.md> · if <condition> → <link: references/<topic>.md> |
| Called by | <link: ../<skill>/SKILL.md>, … · owner (spec, meta) |
| Next | <link: ../<skill>/SKILL.md> |
| Owner stops | none · stop list (<link: agent-behavior rule § When to ask>) · <stage-specific stop> |

## Steps

1. <Imperative step. Add the reason in one clause when it isn't obvious.>
2. …

## Examples

**Example 1**
Input: <realistic request or state>
Output: <what the skill produces>

## Output

<Exact format of what it writes or posts: a template, or a filled example.>

## Not for

| Case | Use |
|---|---|
| <neighbor case> | <link: ../<skill>/SKILL.md> |
```

## Rules

- **The description is the trigger.** Agents see only `name` and `description` when choosing a skill, so every "when to use" belongs there, never in the body. Keep it to 1024 characters or less, in third person, in this order: what it does, "Use when …", "Not for … (use …)".
- **Only `name` and `description` in the frontmatter.** The name prefix carries the category.
- **Link, don't name.** Every skill or rule mentioned is a relative link, so checks can follow it (skill-loop D31). `Calls` and `Called by` must agree in both directions between built skills.
- **Point at the rule that owns a topic; don't restate it.** Guards are fired by the always-on rules (skill-loop D56). A `Calls` line for a guard names the rule section that fires it.
- **Explain why instead of ALL-CAPS MUSTs.** A model that knows the reason handles cases the steps don't list.
- **Keep terms consistent** across the skill and its references.
- **Keep it lean.** Body ≤ ~250 lines. Move detail to `references/`, say in the step when to read each file, and give references over 300 lines a table of contents.
- **Bundle repeated work.** If every run writes the same helper, put it in `scripts/`.
- **No relative time words** ("today", "current") for harness state. Cite the harness version or a commit (skill-loop D28).
- **Specialists** (`spec-*`) need at least two loop callers. A single-caller helper is a reference inside its caller (skill-loop D53).
