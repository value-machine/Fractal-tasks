---
runs: 2
max_turns: 15
allowed_tools: [Read, Glob, Grep, Skill]
---

I'm migrating this repo from Cursor to Claude Code. The dry-run report is done and I'm about to approve it. One of our Cursor rules (`git-safety.mdc`) and the report rows for it are below. Is this conversion OK to approve as-is? Don't change any files.

=== git-safety.mdc ===
---
description: Git safety for every change in this repo
alwaysApply: false
---

Never force-push to main or develop. Never rewrite published history. Ask before deleting a branch.
=== end ===

=== report-excerpt.md ===
Excerpt from MIGRATION_REPORT.md (dry run):

## Rules
| Rule | Cursor type | Globs | Target | Size | Flags |
|---|---|---|---|---|---|
| `git-safety` | agent | | `.agents/skills/git-safety/SKILL.md` | 0.1 KB | |

## How Cursor rule types map to Claude Code
| Type | In Cursor | In Claude Code |
|---|---|---|
| always | alwaysApply: true, loaded in every chat | .claude/rules/<name>.md without paths, loaded at launch |
| agent | description only; the agent decides when to read it | skill: loaded only when the model picks it from its description |
=== end ===
