# Harness update report — 2026-10-23

## Summary

- **Inbox cleared:** n/a (copied straight from a clone, not via `.agents/harness-inbox/`)
- **Items:** 1
- **Applied:** 1 | **Rejected:** 0 | **Deferred:** 0

## Disposition table

| # | origin | source | license | summary | overlap | disposition | target | decision | applied |
|---|--------|--------|---------|---------|---------|-------------|--------|----------|---------|
| 1 | `TMI-apps/MILA` @ `2b72f4d` (`develop`) | `plugins/cursor-migration/` (53 files, byte-identical copy) | private, same owner (TMI-apps) | Claude Code plugin: migrate Cursor rules/commands/skills/MCP to Claude Code while Cursor keeps working; read-only dry run, one approval, exact undo | none; kept as a plugin rather than a skill because most of it is Node scripts + tests | ingest-attributed (plugin, not skill) | `plugins/cursor-migration/` + `.claude-plugin/marketplace.json` | user: "ingest the full plugin into this repo" | yes |

## Notes

- Secret scan: pass (no credentials in the copied files)
- Protected writes (user-approved ingest): `projectStructure.config.cjs` (`.claude-plugin/`, `plugins/*`), `eslint.ignores.js` (`plugins/`), `.agents/skills/router/SKILL.md` (index row)
- Also changed: `vitest.config.ts` (exclude `plugins/**`), `package.json` (`test:plugin`), `.claude/settings.json` (marketplace `plate-harness` → this repo, plugin enabled)
- Upstream sync: re-copy from MILA and bump nothing locally; `plugins/cursor-migration/README.md` § Versions owns the version stamps
