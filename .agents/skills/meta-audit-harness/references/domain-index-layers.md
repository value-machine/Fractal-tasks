# Domain — INDEX and layers docs

Audited by **Lens 2** and **Lens 6**.

## Scope

- `documentation/DOC_RULES_INDEX.md` — deep topic map (not short-description SSOT)
- `documentation/DOC_AGENT_WORKFLOW_LAYERS.md` — layer model + coupling table
- `ARCHITECTURE.md` — user-facing architecture overview

## SSOT rules

| Concept | Owner |
|---------|-------|
| Short rule descriptions | `AGENTS.md` catalog |
| Topic bullets / relationships | `INDEX.md` |
| Skills vs rules vs scripts layers | `DOC_AGENT_WORKFLOW_LAYERS.md` |
| Enforced structure | `.claude/rules/architecture.md` + `ARCHITECTURE.md` overview |

## Common findings

- INDEX points at deleted paths
- Layers doc missing row for new harness skill
- ARCHITECTURE.md duplicates rule body instead of linking

## Resolution patterns

- INDEX links only; no duplicate rule prose
- Add "When you change something" row when introducing harness paths
