---
name: migrate
description: Migrate this repo's Cursor setup to Claude Code while Cursor, Copilot and Codex keep working. Moves .cursor rules, commands and skills, .cursor/mcp.json and .cursorrules to .claude/rules, .agents/skills (mirrored to .claude/skills), .mcp.json, AGENTS.md and CLAUDE.md, rewrites .cursor/ links, and wires a pre-commit sync. Read-only dry run first, one approval, exact undo. Use when the user wants to move from Cursor to Claude Code or set a repo up for both.
argument-hint: "[--keep-cursor=yes|no]"
---

# Migrate Cursor → Claude Code

Two scripts do the mechanical work; you do the judgment. Never edit anything before the user approves the report.

- Inventory (read-only): `node ${CLAUDE_PLUGIN_ROOT}/scripts/inventory.mjs`
- Apply / undo: `node ${CLAUDE_PLUGIN_ROOT}/scripts/apply.mjs`

Both write state only under `.git/cursor-migration/` (`inventory.json`, `MIGRATION_REPORT.md`, `applied.json`, byte backups). Neither reads nor edits anything outside the repo (`~/.claude`, `~/.cursor`, app settings); those become guided steps for the user.

## 1. Preconditions

1. Run `node --version`. Node 20 or newer is required: the vendored pre-commit sync runs on Node in every clone. If Node is missing, stop and explain.
2. Run `git status --short`. Apply needs a clean tree. Ask the user to commit or stash; offer `--allow-dirty` only if they insist (undo still restores exact bytes).
3. Ask, unless `$ARGUMENTS` already answers it: **"Will this repo keep using Cursor?"** Yes keeps `.cursor/rules` as generated `.mdc` files and `.cursor/mcp.json`; no removes migrated `.cursor/` sources.
4. Look for history folders that mention `.cursor/` paths on purpose (job logs, handoffs, archived plans, changelogs). Propose them as `--exclude=<glob>` and let the user confirm. Default excludes already cover changelogs, `.changeset` and `.cursor/plans`.

## 2. Dry run and report

Run:

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/inventory.mjs --keep-cursor=yes|no [--exclude=<glob> ...]
```

Read `.git/cursor-migration/MIGRATION_REPORT.md` in full. Present to the user, short:

- Counts from **Summary**, and the always-loaded rule size (that text loads into every Claude Code session).
- Every **Needs your judgment** item, each with your recommendation.
- **Optional: scope always-on rules.** Opt-in only. Explain that an approved rule gets `paths:` and stops loading at launch. Do not recommend scoping a rule that holds safety constraints for all work (git workflow, security) unless the user knows it.
- MCP: servers, and any **rotate** warning (secrets already in git history must be rotated; moving them does not undo the leak).

Then ask for **one approval** for the whole apply, including which rules to scope. Changing the plan means re-running the inventory.

## 3. Apply

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/apply.mjs [--scope-rules=a,b]
```

Apply refuses a stale inventory (sources changed since the dry run): re-run step 2 then. It prints created / modified / deleted counts and the path to `applied.json`.

## 4. Resolve pending and judgment items

Read `pending` and `judgment` in `.git/cursor-migration/applied.json`. Apply never touches these; you do. Ask before deleting anything that holds content not found elsewhere.

| Kind | What to do |
|------|-----------|
| `CLAUDE.md` has its own content | Keep `@AGENTS.md` as the first line; move tool-neutral instructions into `AGENTS.md`, keep Claude-only notes below the import. |
| `.cursorrules` (legacy) | Merge its content into `AGENTS.md`, then delete it. |
| Rule kept: code still references it | Fix the code (scripts, configs, comments) to read the new path, then delete the old rule source. |
| Rule flags (precedence, critical demotion, duplicate names, existing target) | Read both versions and decide with the user. Keep meaning, not wording. |
| Skill folder differs from `.agents/skills` | Diff each file; keep the newer or richer version in `.agents/skills`, then delete the Cursor copy. |
| Command already migrated | Keep one skill; delete the command and any duplicate skill. |
| Index files (rule or skill INDEX / README) | Move them next to their content, then recompute every relative link in the moved file. |
| Manual `.cursor/` references | Code and unknown targets: edit by hand. Leave correct mentions of the generated `.cursor/rules` mirror and history files alone. |
| Sentences about old copies ("stubs", "legacy", "X, not Y") | Rewritten only by you: make sure the sentence still says what it meant. |
| `.mcp.json` exists | Merge servers; never overwrite. |
| lefthook / pre-commit framework | Add the hook step shown in the pending row. |
| Nested agent configs | Not converted in v1: tell the user and leave them. |
| Vendored sync script edited or outdated | Compare with the plugin's `templates/sync-agent-config.mjs` and upgrade with the user. |

Leave no TODO markers. Extensionless files under hook folders (for example `.husky/pre-commit`) are code: check that apply did not rewrite their comments into nonsense.

## 5. Verify

1. `node scripts/sync-agent-config.mjs`, then `node scripts/sync-agent-config.mjs --check`: mirrors in sync.
2. Re-run the inventory with the same flags: expect 0 rules, 0 commands, no skill folders left to move. Remaining judgment items must be deliberate (history files, mentions of the generated mirror).
3. Run the repo's own checks (lint, structure validators, tests) if it has them.
4. Show `git status --short` and a short summary of what changed.

Do not commit. The user commits with their normal workflow; the pre-commit hook keeps `.claude/skills` in sync from then on.

## 6. Guided steps

Give the user the **Guided steps outside the repo** section of the report, as-is or shortened. It only lists steps that apply here: approving MCP servers, checking `/context` and `/skills`, a manual check for personal skills in `~/.claude/skills` that hide repo skills with the same name, Cursor User Rules, and the Cursor third-party configs toggle.

## Undo

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/apply.mjs --undo
```

Restores every path apply changed, byte for byte, including untracked files. Your manual edits from step 4 are not covered; use git for those.

## Layout after migration

| What | Edit here | Generated |
|------|-----------|-----------|
| Instructions | `AGENTS.md` | `CLAUDE.md` imports it (`@AGENTS.md`) |
| Always-on and path-scoped rules | `.claude/rules/<name>.md` | `.cursor/rules/<name>.mdc` if Cursor is kept |
| Agent-requested rules, manual rules, commands, skills | `.agents/skills/<name>/SKILL.md` | `.claude/skills/<name>/` mirror (committed) |
| MCP | `.mcp.json` with `${VAR}` secrets | `.cursor/mcp.json` kept if Cursor is kept |
