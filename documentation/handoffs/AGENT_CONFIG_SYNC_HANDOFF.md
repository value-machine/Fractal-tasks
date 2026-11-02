# Handoff: Claude ↔ Cursor skill sync + skill harness to learn from

**For:** an agent working in another repository (the *target repo*) on the same machine.
**Source repo (read-only for you):** `/home/user/bronze-plate-harness` (GitHub `value-machine/bronze-plate-harness`).
**Goal:** (1) give the target repo the same one-source sync between Claude Code and Cursor for skills and rules; (2) learn from this repo's skills and port what fits.

Do not edit anything under `/home/user/bronze-plate-harness`. Read it, run its scripts against your repo, copy from it.

---

## 1. How the sync works here (the model to copy)

One source per kind of config; generated mirrors for the other tool; a pre-commit hook rebuilds them; CI fails on drift.

| Edit (source) | Generated mirror (never edit) | Read by |
|---|---|---|
| `AGENTS.md` | `CLAUDE.md` holds only `@AGENTS.md` + Claude-only notes | Cursor/Codex/Copilot read `AGENTS.md`; Claude Code reads `CLAUDE.md` |
| `.agents/skills/<name>/SKILL.md` (+ `references/`, `scripts/`, `evals/`) | `.claude/skills/<name>/…` — byte-identical copy | Claude Code Skill tool reads `.claude/skills`; Cursor/Codex read `.agents/skills` |
| `.claude/rules/<name>.md` (`paths:` frontmatter = path-scoped; none = always on) | `.cursor/rules/<name>.mdc` (`paths:` → `globs: [...]` + `alwaysApply: false`; else `alwaysApply: true`) | Claude Code reads `.claude/rules`; Cursor reads `.cursor/rules` |

Files that implement it (read these, in this order):

1. `/home/user/bronze-plate-harness/agent-sync.config.json` — the mirror list (`skills` and `cursor-rules` kinds).
2. `/home/user/bronze-plate-harness/scripts/sync-agent-config.mjs` — zero-dependency Node ≥ 20 script. Modes: default (write mirrors from working tree), `--staged` (pre-commit: read from git index, write + stage mirrors, fails open), `--check` (exit 1 on drift, for CI). It only overwrites or deletes files listed in `<target>/.generated.json`, so hand-written files in a mirror folder are kept and reported.
3. `/home/user/bronze-plate-harness/.husky/pre-commit` lines 1–7 — the hook step.
4. `/home/user/bronze-plate-harness/.github/workflows/ci.yml` lines 81–88 — CI drift check (`node scripts/sync-agent-config.mjs --check`) and skill admission check.
5. `/home/user/bronze-plate-harness/CLAUDE.md` and `/home/user/bronze-plate-harness/AGENTS.md` § "Where to edit agent config" — how the split is explained to agents.
6. Tests: `/home/user/bronze-plate-harness/scripts/sync-agent-config.test.mjs` (+ `sync-agent-config-fixture.mjs`).

The canonical copy of the script is the plugin template `/home/user/bronze-plate-harness/plugins/cursor-migration/templates/sync-agent-config.mjs`; the repo copy is vendored from it (header stamp `v0.1.0`). Copy from the template.

## 2. Set it up in the target repo — recommended path: run the migration plugin's scripts

`/home/user/bronze-plate-harness/plugins/cursor-migration/` does the whole setup: moves `.cursor/rules`, `.cursor/commands`, `.cursor/skills`, `.cursor/mcp.json` and `.cursorrules` into the layout above, rewrites `.cursor/` links in docs, vendors the sync script, writes `agent-sync.config.json`, adds the pre-commit step, and can undo byte for byte. All its state goes to `<target>/.git/cursor-migration/`.

Read first: `/home/user/bronze-plate-harness/plugins/cursor-migration/README.md` and the procedure `/home/user/bronze-plate-harness/plugins/cursor-migration/skills/migrate/SKILL.md` (follow its steps; replace `${CLAUDE_PLUGIN_ROOT}` with `/home/user/bronze-plate-harness/plugins/cursor-migration`).

Run from the target repo root (scripts use the current directory; `--root <path>` also works):

```bash
node --version
```

```bash
git status --short
```

```bash
node /home/user/bronze-plate-harness/plugins/cursor-migration/scripts/inventory.mjs --keep-cursor=yes
```

Read `.git/cursor-migration/MIGRATION_REPORT.md` in full, show the owner the counts and every "Needs your judgment" item, get **one approval**, then:

```bash
node /home/user/bronze-plate-harness/plugins/cursor-migration/scripts/apply.mjs
```

```bash
node scripts/sync-agent-config.mjs --check
```

Undo if needed: `node /home/user/bronze-plate-harness/plugins/cursor-migration/scripts/apply.mjs --undo`. The scripts never commit.

Alternative inside an interactive Claude Code session (not cloud): `claude --plugin-dir /home/user/bronze-plate-harness/plugins/cursor-migration`, then `/cursor-migration:migrate`.

### Manual path (repo already uses `.agents/skills`, or has no Cursor config)

1. Copy `/home/user/bronze-plate-harness/plugins/cursor-migration/templates/sync-agent-config.mjs` → `<target>/scripts/sync-agent-config.mjs`.
2. Copy `/home/user/bronze-plate-harness/agent-sync.config.json` → `<target>/agent-sync.config.json`. Drop the `cursor-rules` entry if the target keeps rules elsewhere.
3. Add the pre-commit step (copy lines 1–7 of `/home/user/bronze-plate-harness/.husky/pre-commit`; plain git hook works too).
4. Add the CI step `node scripts/sync-agent-config.mjs --check`.
5. Run `node scripts/sync-agent-config.mjs` once and commit sources, mirrors and both `.generated.json` manifests together.
6. Make `CLAUDE.md` import `AGENTS.md` and state "edit the source, never the mirror" (model: `/home/user/bronze-plate-harness/CLAUDE.md`).

### Gotchas

- Commit the mirrors. Claude Code only sees committed `.claude/skills` in fresh clones and cloud sessions.
- A same-named skill in `~/.claude/skills` hides the repo copy in Claude Code. Check the owner's home folder.
- Line endings: this repo forces LF (`/home/user/bronze-plate-harness/.gitattributes`); without it, Windows checkouts produce CRLF drift in `--check`.
- Your repo's own protected-file or hook policy applies: ask the owner before touching hooks, CI or ignore files.

## 3. Learn from the skills

### Where to start

| What | Path |
|---|---|
| Registry of all 21 skills, with what each replaced | `/home/user/bronze-plate-harness/.agents/skills/router/references/catalog.md` |
| The loop (stages, two owner stops, how to tell where work stands) | `/home/user/bronze-plate-harness/.agents/skills/router/references/loop-map.md` |
| Skill template (frontmatter, Edges table, Steps, Examples, Output, Not for; evals layout) | `/home/user/bronze-plate-harness/.agents/skills/meta-write-skill/references/skill-template.md` |
| Admission check enforcing the template and catalog | `/home/user/bronze-plate-harness/scripts/validate-skills.cjs` |
| Full porting guide with rename map from the older skill set | `/home/user/bronze-plate-harness/documentation/handoffs/SKILL_LOOP_ADOPTION_GUIDE.md` |
| Rule vs skill split: always-on corrections in rules, procedures in skills | `/home/user/bronze-plate-harness/.claude/rules/agent-behavior.md` (example rule) and `/home/user/bronze-plate-harness/documentation/DOC_AGENT_WORKFLOW_LAYERS.md` |
| Design decisions behind the loop | `/home/user/bronze-plate-harness/documentation/DOC_DECISION_LOG.md` § skill-loop |

### The four layers (by name prefix)

- `router` — single entry point; finds the stage and runs it.
- `loop-*` — one skill per stage: `loop-backlog` → `loop-refine` → `loop-plan` → `loop-build` → `loop-check` → `loop-ship` → `loop-verdict`. Owner is asked only at Stop 1 (backlog/refine) and Stop 2 (verdict), plus a short stop list.
- `spec-*` — specialists called by ≥ 2 stages: `spec-check-layer`, `spec-debug-runtime`, `spec-load-context`, `spec-optimize-performance`, `spec-reuse-package`, `spec-simplify-flow`.
- `meta-*` — harness upkeep: `meta-write-skill`, `meta-audit-harness`, `meta-intake-harness`, `meta-learn-lessons`, `meta-grade-rule`, `meta-write-adoption-guide`, `meta-compress-output`.

All sources: `/home/user/bronze-plate-harness/.agents/skills/<name>/SKILL.md`.

### Worth reading for any repo (most portable first)

1. `meta-write-skill` + `skill-template.md` — the structure and description-as-trigger rules.
2. `router` + `loop-map.md` — routing by evidence (branch, PR, plan state) instead of guessing.
3. `meta-learn-lessons` — turning failures into guidance, removal-first.
4. `meta-audit-harness` — coherence and context-cost audit of rules and skills.
5. `spec-check-layer`, `spec-debug-runtime` — workaround guard and hypothesis-driven debugging.

### Porting advice

- Port the method, not the text. These skills reference this repo's stack (Vite/React/Supabase/Cloudflare), its git-workflow modes (`src/config/git-workflow.json`) and its rules by relative link. Rewrite those parts for your repo.
- The `PORT_MAP.md` files and the "Replaces (v0.42.0)" catalog column are history for this repo only; don't copy them.
- Keep skills you already have; give each a layer prefix and a catalog row, or keep them external.
- If your repo has an intake skill, copy the chosen files into its inbox instead of editing in place. Here that is `.agents/harness-inbox/` + `meta-intake-harness`.

## 4. Done when

- `node scripts/sync-agent-config.mjs --check` prints `mirrors are in sync` in the target repo, and CI runs it.
- Editing a file in `<target>/.agents/skills/` and committing updates `<target>/.claude/skills/` in the same commit.
- Claude Code lists the repo skills; Cursor sees the same skills and the generated `.mdc` rules.
- Any ported skill follows the template and is listed in the target's registry.
