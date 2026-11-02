---
type: llm
---

PASS if the answer:
- explains that in Claude Code the text after `/release` reaches the skill as arguments (`$ARGUMENTS`, or appended as `ARGUMENTS:` when the body has no placeholder);
- proposes using `$ARGUMENTS` (or `$0` / `$ARGUMENTS[0]`) in the body for the version, and adds an `argument-hint` such as `[version]` to the frontmatter;
- keeps `disable-model-invocation: true`, or explains why a release command should only run when invoked;
- may suggest a clearer description, but keeps the three steps.

FAIL if it says arguments are not supported, drops `disable-model-invocation`, or rewrites the steps so their meaning changes.
