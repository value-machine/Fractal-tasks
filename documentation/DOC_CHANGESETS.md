# Changesets (release flow)

How version bumps on `develop` relate to feature work, production promotion, and **`loop-ship`**.

Mode: `src/config/git-workflow.json`. Behavior: `.claude/rules/git-workflow.md`.

## Model A — feature branches

- Add a changeset under `.changeset/*.md` when the change should appear in the next release (user-facing or semver-relevant).
- **`loop-ship`** owns conventional commits, `package.json` version sync, and `CHANGELOG.md` on the lap branch (see `.agents/skills/loop-ship/references/commit-standards.md`).
- Version + changelog land with each lap's PR via **`loop-ship`** (squash-merged to `develop`).

## Model B — direct `develop`

- **`loop-ship`** commits on `develop` (no lap branch). Version + changelog land with each push to `develop`.
- Prefer **one active agent per checkout** on `develop` — shared-branch contention is higher than Model A.
- Pushing to `develop` updates staging — it does **not** ship production.

## Model C — Claude Code defaults (default for new forks)

- No per-PR bump: `loop-ship` does **not** edit `package.json` or `CHANGELOG.md`, and commits carry no `[VERSION]` prefix.
- The squash PR title (`type: subject`, enforced by the `pr-title` CI check) becomes the commit on `main`.
- `.github/workflows/release-please.yml` keeps a release PR open that bumps `package.json` and writes `CHANGELOG.md` from those titles; the user merges it to tag the release. It dispatches `ci.yml` on the release branch so the required `test` check runs there.
- Config: `release-please-config.json` + `.release-please-manifest.json` (manifest holds the last released version and needs a matching GitHub release `v<version>`; tags are `v<version>`). Before 1.0, `bump-minor-pre-major` makes a breaking change (`feat!:`) bump the minor version instead of jumping to 1.0.0; remove it when the project is ready for 1.0.
- No `.changeset/` files.

## On `develop` (Model A/B)

- Merging or pushing to `develop` updates staging — it does **not** ship production.

## Production (`main`, Model A/B)

- Run **Promote to production** (`promote-to-production.yml`) to fast-forward `main` to `develop` after staging verification.
- Do not squash-merge `develop` into `main` or back-merge `main` into `develop`.

## Related

- Layer model: `documentation/DOC_AGENT_WORKFLOW_LAYERS.md` § Release and versioning
- Commit/changelog SSOT: `.agents/skills/loop-ship/SKILL.md`
- Branch strategy SSOT: `.claude/rules/git-workflow.md`
