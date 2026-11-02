# Domain — `.claude/rules/**`

Audited by **Lens 2 (SSOT)**, **Lens 6 (catalog drift)**, **Lens 8 (loadability)**.

## Scope

- `.claude/rules/*.md` bodies and `paths:` frontmatter (generated `.cursor/rules/*.mdc` are out of scope)
- Cross-rule references and INDEX deep links
- Always-on context budget (advisory)

## SSOT rules

| Concept | Owner |
|---------|-------|
| Rule prose | `.claude/rules/<category>.md` |
| Short description | `AGENTS.md` catalog row |
| Topic index | `documentation/DOC_RULES_INDEX.md` |

## Common findings

- Stale `.cursor/rules/<name>/RULE.mdc` paths (rules live in `.claude/rules/`)
- Duplicate guidance across rules (supersede, don't parallel-copy)
- Always-on (no `paths:`) payload over advisory byte budget

## Resolution patterns

- Supersession note in body when absorbing another rule's section
- Mechanical drift → `harness_scan` facts + catalog lens
- Large budget fixes → follow-up plan (not blocking in cap apply)
