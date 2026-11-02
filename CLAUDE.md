# CLAUDE.md

Claude Code entry point. `AGENTS.md` is the vendor-neutral SSOT for project memory (Cursor, Claude Code, Codex); this file only imports it and adds Claude-specific notes. Do not duplicate `AGENTS.md` content here.

@AGENTS.md

## Claude Code notes

- **Skills:** the source is `.agents/skills/<name>/SKILL.md` (vendor-neutral). `.claude/skills/` is a generated mirror (`scripts/sync-agent-config.mjs`, refreshed by pre-commit, drift-checked in CI) so the Skill tool lists them — edit the source, never the mirror. For any repo change or workflow request (`/router`, "next", "plan this", "ship it", ...): start from `.agents/skills/router/SKILL.md`, which finds the loop stage (`.agents/skills/router/references/loop-map.md`). Prefer the repo copy over any same-named user-level skill. New skills: `.agents/skills/meta-write-skill/references/skill-template.md` and a row in `.agents/skills/router/references/catalog.md` (`pnpm validate:skills`).
- **Rules:** `.claude/rules/*.md` load automatically — always-on ones at launch, `paths:` ones when you touch a matching file. Where to edit: `AGENTS.md` § Where to edit agent config.
- **Tool mapping:** skills written with Cursor wording map as — "Task subagent" → `Agent` tool; "AskQuestion" → `AskUserQuestion`; `~/.cursor/skills-cursor/*` → not available here, skip.
- **Shell:** read the platform from your environment info; don't assume it. On Windows the Bash tool is Git Bash (`.claude/rules/platform.md` § Git Bash). On Linux or macOS, including cloud sessions, it is plain bash, and the rule's Windows sections don't apply.
