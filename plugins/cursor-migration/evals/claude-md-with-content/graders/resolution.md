---
type: llm
---

PASS if the answer does all of these:
- CLAUDE.md keeps or gets `@AGENTS.md` as an import (normally its first line), so Claude Code reads AGENTS.md.
- The tool-neutral instructions ("TypeScript strict mode", "small pull requests") move to AGENTS.md, because Copilot and Codex read AGENTS.md and not CLAUDE.md.
- The Claude-specific note (use the Bash tool, not PowerShell) stays in CLAUDE.md below the import, or the answer explains why it could go either way.
- Nothing from the original CLAUDE.md is lost.

FAIL if it deletes CLAUDE.md content without moving it, leaves the shared instructions only in CLAUDE.md, drops the `@AGENTS.md` import, or tells the user to duplicate the same instructions in both files.
