# cursor-migration

A Claude Code plugin that moves a repo's Cursor setup to Claude Code, while Cursor, Copilot and Codex keep working in the same repo.

It migrates `.cursor/rules`, `.cursor/commands`, `.cursor/skills`, `.cursor/mcp.json` and `.cursorrules`, rewrites `.cursor/` links in the repo's docs, and adds a pre-commit sync that keeps the generated copies current. It shows a read-only report first, applies after one approval, and can undo byte for byte.

## Requirements

- Claude Code with plugin support, to run the skill.
- Node 20 or newer in the repo being migrated. The scripts and the pre-commit sync are zero-dependency Node files.
- A git repository with a clean working tree.

## Install

The plugin is published from the public repo [`value-machine/bronze-plate-harness`](https://github.com/value-machine/bronze-plate-harness) (marketplace name `plate-harness`). Fetch only the plugin folders, not the whole repo:

```bash
claude plugin marketplace add value-machine/bronze-plate-harness --sparse .claude-plugin plugins
```

```bash
claude plugin install cursor-migration@plate-harness
```

In a Claude Code session the same two steps are `/plugin marketplace add value-machine/bronze-plate-harness` and `/plugin install cursor-migration@plate-harness`.

To share it with a team, commit this to the target repo's `.claude/settings.json`; Claude Code offers the install when the folder is trusted:

```json
{
  "extraKnownMarketplaces": {
    "plate-harness": {"source": {"source": "github", "repo": "value-machine/bronze-plate-harness"}}
  },
  "enabledPlugins": {"cursor-migration@plate-harness": true}
}
```

To try a local checkout without installing, start Claude Code with `claude --plugin-dir <path-to>/plugins/cursor-migration`.

Cloud sessions (Claude Code on the web) do not load plugins. There, run the scripts straight from a checkout of this folder: `node <path-to>/plugins/cursor-migration/scripts/inventory.mjs --keep-cursor=yes`, then `apply.mjs`; the skill's steps in `skills/migrate/SKILL.md` still apply.

## Use

Open Claude Code in the repo you want to migrate and run:

```
/cursor-migration:migrate
```

The skill:

1. Checks Node and a clean tree, and asks whether the repo keeps using Cursor.
2. Runs a read-only dry run and walks you through `MIGRATION_REPORT.md`: counts, items that need your judgment, optional rule scoping, MCP secrets.
3. Applies after your one approval.
4. Resolves the items the scripts leave for judgment (merging `CLAUDE.md`, diverged skill copies, code that reads old paths), with you.
5. Verifies the mirrors and re-runs the dry run (with the excludes the apply used), then hands you the guided steps for things outside the repo.

It never commits. You review `git status` and commit with your normal workflow.

All state lives under `.git/cursor-migration/` (inventory, report, applied changes, byte backups). Nothing outside the repo is read or changed: app settings and files in your home folder are guided steps in the report.

## What changes in the repo

| What | Edit here after migration | Generated from it |
|------|---------------------------|-------------------|
| Instructions | `AGENTS.md` | `CLAUDE.md` imports it with `@AGENTS.md` |
| Always-on and path-scoped rules | `.claude/rules/<name>.md` | `.cursor/rules/<name>.mdc`, if Cursor is kept |
| Agent-requested rules, manual rules, commands, skills | `.agents/skills/<name>/SKILL.md` | `.claude/skills/<name>/` (committed mirror) |
| MCP servers | `.mcp.json`, secrets as `${VAR}` | `.cursor/mcp.json` stays only if Cursor is kept |

Also added: `scripts/sync-agent-config.mjs` (vendored sync), `agent-sync.config.json`, a pre-commit hook step (husky or a plain git hook; lefthook and the pre-commit framework get the exact snippet to add), and `.gitignore` lines for personal Claude Code files.

Moved rules, commands and skills keep their relative Markdown links. `.cursor/` paths in prose are rewritten to the new homes; paths in code (by extension, git hook folders or a shebang) are listed for you to fix by hand.

The pre-commit step rebuilds `.claude/skills` from the staged `.agents/skills` files and stages it. Run `node scripts/sync-agent-config.mjs --check` in CI to fail on drift.

## Undo

```bash
node <plugin>/scripts/apply.mjs --undo
```

The skill prints the exact command. It restores every path the last apply changed, including untracked files. Edits you or the skill made by hand afterwards are not covered; use git for those.

## Known limits

- **Copilot:** reads `AGENTS.md` and `.agents/skills`. Whether it shows a skill once when it also finds `.claude/skills` is not verified.
- **Codex:** reads `AGENTS.md` and `.agents/skills`; no Codex-specific files are generated.
- **Nested configs** (a `.cursor/` or `AGENTS.md` below the repo root) are reported, not converted.
- **lefthook and the pre-commit framework:** the hook step is added by hand from the snippet in the report.
- **Personal skills:** a skill in `~/.claude/skills` with the same name as a repo skill hides the repo version in Claude Code. The plugin never reads your home folder, so the report gives the check as a guided step; deciding is up to you.

## Development

From the root of the repo that publishes the plugin (`value-machine/bronze-plate-harness`):

```bash
pnpm test:plugin
```

```bash
claude plugin validate ./plugins/cursor-migration --strict
```

```bash
claude plugin validate . --strict
```

Evals (judgment cases in `evals/`; results stay local and are git-ignored):

```bash
claude plugin eval ./plugins/cursor-migration --no-publish
```

An eval that lets the skill run the scripts needs Bash, which eval runs only allow inside Claude Code's OS sandbox. Native Windows has none; use WSL2 or Linux.

## Versions

Two versions, each bumped in the same change that needs it:

- **Plugin:** `version` in `.claude-plugin/plugin.json`. Bump it on every user-visible change (skill text, script behavior, report). Installed copies only update when it changes. The inventory reads it from there.
- **Vendored sync script:** the `v` stamp in the header of `templates/sync-agent-config.mjs` and its `VERSION` constant. Bump both whenever the template changes. The dry run compares a repo's copy with the template: an older stamp is upgraded on apply, and a copy with the current stamp but different bytes is flagged as locally edited.

A migrated repo carries a vendored copy at `scripts/sync-agent-config.mjs`. The dry run reports it as `outdated` (older stamp, upgraded on apply) or `edited` (same stamp, different bytes). These versions are separate from the publishing repo's own release version.

## License

MIT — see [`LICENSE`](LICENSE).
