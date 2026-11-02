# Commit standards — version, changelog, message, hooks

Used by [`loop-ship`](../SKILL.md). Ported from `finish` (v0.42.0) § Version and changelog gate, § Semantic Versioning, § Commit Message Standards, § Faster commit. Which rows apply depends on `git-workflow` rule § Mode behavior table → **version source**.

## Version and changelog gate

**Applies when** `.claude/rules/git-workflow.md` § Mode behavior table → **version source** says the ship step bumps (Model A/B). **Model C:** skip this whole section — no `package.json` / `CHANGELOG.md` edits and no `[VERSION]` prefix; release-please builds the release from the PR title.

Before editing `package.json` or `CHANGELOG.md`, classify staged changes per **`scripts/change-classify.cjs`** (matrix SSOT: `documentation/DOC_AGENT_WORKFLOW_LAYERS.md` § Local git).

| Class | Version + changelog |
|-------|---------------------|
| `feat`, `fix`, `perf`, breaking, user-facing | **Required** — bump per [Semantic Versioning](#semantic-versioning-ssot) |
| `docs`, `style`, `refactor`, `test`, `chore`, internal-only | **Skip** — do not edit `package.json` or `CHANGELOG.md` |

When skipping version/changelog: commit message uses `type: Subject` **without** `[VERSION]` prefix (still include required body).

**Changesets (optional):** Add `.changeset/*.md` when the change should appear in release narrative across PRs — see **`documentation/DOC_CHANGESETS.md`**. `loop-ship` still owns `package.json` + `CHANGELOG.md` on the lap branch (A/B).

- **MANDATORY (when bump required):** Update version number in `package.json` to match changelog version
- **MANDATORY (when bump required):** Update changelog (fetch date if unsure of date) — Keep a Changelog format; section list SSOT § Semantic Versioning below
- **MANDATORY:** If staged changes include `src/features/*` code, stage matching feature README updates (`src/features/*/README.md`)
- **MANDATORY:** Run feature-doc validation for staged files (`pnpm validate:feature-docs:staged`)
- **MANDATORY: Staging check before commit.** List staged (`git diff --name-only --cached`) and unstaged (`git diff --name-only`) files. Everything on the lap branch inside the brief's edges is the lap's and is committed. Changes **outside** the lap (another thread's work, unexplained files) are never auto-staged: treat them as a concurrency smoke signal ([`concurrency.md`](concurrency.md)).
- Commit with the message format below — no "ready to commit?" question inside the loop (skill-loop D25).
- fix any issues found by pre-commit hook
- **CRITICAL:** If fixing a hook failure requires modifying protected files, that's an owner stop (`agent-behavior` § Protected Files). Never `--no-verify`.
- check if `ARCHITECTURE.md` needs update
- No new deep docs at ship time unless the owner asked for them.
- After a successful commit, continue with [`push-safety.md`](push-safety.md) in the same turn (skill-loop D25).

## Semantic Versioning (SSOT)

All projects must follow semantic versioning (MAJOR.MINOR.PATCH):
- **MAJOR (X.0.0):** Breaking changes
  - A MAJOR bump means a breaking change: it must already be a closed decision in the brief (owner-visible, irreversible for consumers); otherwise it's a stop-list item
- **MINOR (0.X.0):** New features (backwards compatible)
- **PATCH (0.0.X):** Bug fixes (backwards compatible)

**Conventional Commit Types to Version Mapping:**
- `feat:` - New feature (bumps MINOR version)
- `fix:` - Bug fix (bumps PATCH version)
- `docs:` - Documentation only changes (no version bump)
- `style:` - Code style changes (no version bump)
- `refactor:` - Code refactoring (no version bump)
- `perf:` - Performance improvements (bumps PATCH version)
- `test:` - Adding or updating tests (no version bump)
- `chore:` - Maintenance tasks, dependency updates (no version bump)

## Commit Message Standards (SSOT)

**Format:** `[VERSION] type: Feature/Change Title` (Model A/B). **Model C:** `type: Feature/Change Title` + body — the squash PR title carries the type for release-please.

**Requirements:**
- Version number must be first (e.g., `[3.19.0]`)
- Use conventional commit types (see above)
- Commit message subject must match changelog feature title (with type prefix)
- **Commit body is REQUIRED** - must include details about what changed
- Reference issue/ticket numbers when applicable

**Example:**
```
[3.19.0] feat: User Profile Settings

- Implement user profile update functionality
- Add validation for profile fields
- Update user service to handle profile changes
- Add tests for profile update flow

Closes #123
```

**Note:** The commit message matches the changelog entry (A/B). The Husky pre-commit hook runs automatically (`.husky/pre-commit` is the SSOT).

## Faster commit (pre-commit light path + staged tests)

After `git add`, expect hook behavior per **`documentation/DOC_AGENT_WORKFLOW_LAYERS.md`** § Local git (classifier SSOT: `scripts/change-classify.cjs`). Do not duplicate the matrix here.

- **Preview hook test selection:** `pnpm test:staged` (dry-run — does not run tests). **Run hook tests without committing:** `pnpm test:staged:live`. Classifier reads staged files only — `git add` before preview.
- **CI / merge parity:** `pnpm test:classify && pnpm test:run`. Local related or full pre-commit green is **not** merge-safe — wait for CI `test` where work lands (per `.claude/rules/git-workflow.md` § Mode behavior table → **how work lands** / **CI watcher**).
- **Model B concurrency:** Prefer one active agent per checkout on `develop` (`src/config/git-workflow.json`). Shared-branch contention is higher than feature branches — treat smoke signals ([`concurrency.md`](concurrency.md)) seriously.
- **Force full locally:** `PRECOMMIT_TEST_FULL=1 pnpm test:staged` (PowerShell: `$env:PRECOMMIT_TEST_FULL=1; pnpm test:staged`).
- Do **not** use `--no-verify` to avoid slow hooks on app-code commits; fix tests or split commits (docs/migrations separate from `src/`).
- `git commit --amend` with an empty index may run the full hook; re-stage or accept.

