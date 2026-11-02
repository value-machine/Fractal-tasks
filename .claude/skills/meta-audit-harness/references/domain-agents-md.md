# Domain — `AGENTS.md`

Audited by **Lens 6 (catalog drift)** and **Lens 8 (loadability)**.

## Scope

- Catalog rows (path + description + `paths:` scope)
- `@` imports (Cursor double-load risk)
- Defaults section cross-links

## SSOT rules

| Concept | Owner |
|---------|-------|
| Rule bodies | `.claude/rules/**/*.md` |
| Short "what for" | `AGENTS.md` catalog row (rules carry no `description` frontmatter) |
| Portable catalog copy | `AGENTS.md` tables |
| Deep topic map | `documentation/DOC_RULES_INDEX.md` |

## Common findings

- Catalog row path does not match a file in `.claude/rules/` (or a skill for on-demand rows)
- `@` import of a `.claude/rules/` file (Claude Code already loads it: double-load)
- Catalog section (always on / path-scoped) disagrees with the rule's `paths:` frontmatter

## Resolution patterns

- Edit the rule file and its catalog row in the same change
- Drop `@` imports for rules Cursor loads via `.mdc`; keep catalog for Claude/Codex
- Link to rule body; never inline prose from rules
