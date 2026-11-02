---
type: llm
---

PASS if the answer:
- notices that the rule is a safety constraint meant for every change, while the planned conversion makes it a skill that loads only when the model decides it is relevant, so it can silently stop applying;
- recommends making it always-on in Claude Code (a `.claude/rules/git-safety.md` without `paths:`, or the instruction in AGENTS.md / CLAUDE.md), or at least says not to approve that row as-is;
- does not claim the conversion keeps behavior identical.

FAIL if it approves the conversion as-is, or does not mention that the rule would stop loading in every session.
