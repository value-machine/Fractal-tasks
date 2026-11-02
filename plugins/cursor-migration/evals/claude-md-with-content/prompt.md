---
runs: 2
max_turns: 15
allowed_tools: [Read, Glob, Grep, Skill]
---

I'm moving my repo from Cursor to Claude Code and ran the migration. It left one pending item about CLAUDE.md. The repo's AGENTS.md, CLAUDE.md and the pending item are below. Copilot and Codex also work in this repo, so they need to see the shared instructions. Tell me exactly what CLAUDE.md and AGENTS.md should contain after I resolve this. Don't change any files.

=== AGENTS.md ===
# Acme API — agent instructions

- Run `pnpm test` before every commit.
- Never edit files under `generated/`.
=== end ===

=== CLAUDE.md ===
# Notes for Claude

- Use TypeScript strict mode in all new files.
- Prefer small pull requests (under 300 changed lines).
- When you run shell commands in Claude Code, use the Bash tool, not PowerShell.
=== end ===

=== applied-pending.md ===
Excerpt from .git/cursor-migration/applied.json after apply:

pending:
- path: CLAUDE.md
  reason: has its own content: merge into AGENTS.md or keep it below an @AGENTS.md import
=== end ===
