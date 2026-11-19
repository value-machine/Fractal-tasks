# Push safety, PR and production landing

Used by [`loop-ship`](../SKILL.md). Ported from `push` (v0.42.0). Mode behavior: `git-workflow` rule § Mode behavior table.

## Preconditions (Mandatory)

1. The commit step ([`commit-standards.md`](commit-standards.md)) ran for these changes.
2. Working tree must be clean before push:
   - no unstaged changes
   - no staged but uncommitted changes
   - no untracked files that belong to the intended change set
3. There must be at least one local commit to push.

## Hard Restrictions

- **Never run `git add` in this command.**
- **Never run `git commit` in this command.**
- **Never create, amend, or modify commits in this command.**
- If there are uncommitted changes, go back to the commit step.

## Push Safety Flow

1. Branch/push targets: `.claude/rules/git-workflow.md` § Commit and Push Workflow.
2. Verify clean working tree.
3. Verify commits exist to push.
4. Verify remote freshness before push:
   - Run `git fetch origin`
   - Check whether local branch is behind its remote counterpart
   - If behind, STOP and sync first (rebase or merge) before pushing
5. **App-specific changes**: ensure remote points to app repo, not the plate-harness template repo
6. **Full lint (mandatory):** run `pnpm lint`, the exact CI command. The edit hook and `lint-staged` only lint files the agent edited or staged (`documentation/DOC_AGENT_WORKFLOW_LAYERS.md` § Local git). If it fails, fix (protected files still need approval per `.claude/rules/agent-behavior.md`) or stop — do not report the push as done until it passes.
7. Push (`git push -u origin <lap branch>`) — no confirmation question inside the loop (skill-loop D25).

## Merge gate (tests)

- **Pre-push does not run Vitest or type-check** — see `documentation/DOC_AGENT_WORKFLOW_LAYERS.md` § Local git.
- **Authoritative merge gate:** green CI `test` job where work lands — `.claude/rules/git-workflow.md` § Mode behavior table → **how work lands** (full `pnpm test:classify`, `pnpm test:run`, `pnpm type-check`).
- Local pre-commit may run **related** tests only — related green is **not** sufficient to skip waiting for CI.

## Commit vs push

The push step never stages, commits or amends. If it finds anything uncommitted it goes back to the commit step.

## Production landing (promote)

**Model A/B only.** Under Model C, "land on main / release" means the owner's Pass merges the PR (table → **"land on main / promote / release" means**) — never dispatch promote.

Run by `loop-verdict` on a **Pass** (Model A/B), or when the owner asks to land, promote or release:

1. **Do not** `git push origin main`, open a `develop` → `main` PR, or squash-merge.
2. Run **pre-promote check** and, if needed, **ancestor failure reconcile** — § Promote to production (A/B procedure) below.
3. `gh workflow run promote-to-production.yml`; report the run URL; do not `gh run watch`.

If promote already failed with `main is not an ancestor of develop`, reconcile on `develop` per that section before re-running the workflow.

## Pull request

Policy (title, preview link, who reads the PR body, no task lists): `git-workflow` rule § Pull requests. This section is the procedure.

**Preview link:** take it from the `cloudflare-workers-and-pages[bot]` comment on the PR ("Preview URL: …", the branch alias URL, not the per-commit one). If that comment is missing, the URL is `https://<alias>-<worker name>.<workers.dev subdomain>.workers.dev` (alias = branch name lowercased, `/` and other non-alphanumerics → `-`; this repo: `https://<alias>-bronze-plate-harness.tom-fab.workers.dev`); verify it before writing it (HTTP 200, page loads `/assets/*.js`). Until then, write `Preview: pending (Workers Builds)` and edit the PR body to the real link when it appears.

**PR body template (all modes):**

```markdown
## Summary
- <1–3 bullets: why / what landed>

## Preview
- <Workers Builds preview URL for this branch>

## Verified
- <checks run and what passed, e.g. CI `test` green, base is `develop`>

## Not verified
- <what no check covered>
```

**Model A** (C opens the PR the Claude Code default way; B lands by direct push):

- Keep PRs focused and reasonably sized; include a clear description.
- **Always target `develop`.** Prefer `gh pr create --base develop --head <feature-branch>`. **Never** paste GitHub's bare `…/pull/new/<branch>` URL without an explicit `base=develop` — that UI defaults to `main` and risks a production-bound PR.
- **Create with `gh` (required pattern):**
  1. Confirm branch is pushed: `git push -u origin HEAD` if needed.
  2. Create: `gh pr create --base develop --head <feature-branch> --title "<type>: <short title>" --body "<markdown>"`.
  3. Verify base: `gh pr view --json baseRefName,url` — **`baseRefName` must be `develop`**.
  4. On PowerShell, do **not** use bash `<<'EOF'` heredocs. Pass `--body` via a PowerShell here-string or a temp file. In Git Bash (Claude Code), a heredoc is fine.
  5. **Chat handoff (required):** in the same assistant message that reports the PR, include a **markdown link** whose label is the PR number (e.g. `#50`) and whose target is the PR `html_url` from `gh pr create` or `gh pr view --json number,url`. Example: `[#50](https://github.com/TMI-apps/plate-harness/pull/50)`.
- Wait for required `test` check before merge; keep branch up to date with `develop`.
- Squash merge for `feature/*` → `develop`; auto-delete head branches.
- If a `feature/*` PR shows `CONFLICTING`, merge latest `develop` into the feature branch, resolve, push.

**Diagnosing "merge blocked" / "rule violation":**

- `gh pr view <N> --json mergeable,mergeStateStatus,statusCheckRollup`
- `mergeable: MERGEABLE` + `mergeStateStatus: BLOCKED` almost always means a **required status check is still `IN_PROGRESS` or missing** — wait, then re-check (under C the desktop PR monitor shows this).
- Only investigate deeper once `statusCheckRollup` is fully green but state is still `BLOCKED`.

## Branch detail (A/B)

Invariants and forbidden moves: `git-workflow` rule § Branch invariants.

- **Model A:** short-lived `feature/*` / `fix/*` from latest `develop`, squash PR back to `develop` after `test` is green. Hotfixes: `feature/*` or `fix/*` off `develop` → merge → promote.
- **Model B:** `loop-ship` commits and pushes on `develop`; no daily PR. Prefer one active agent per checkout on `develop`; serialize concurrent sessions ([`concurrency.md`](concurrency.md)). Hotfix: fix on `develop`, then promote; a rare manual `fix/*` is a human exception.
- **Divergence prevention:** the old broken model used squash `develop` → `main` plus a mandatory `main` → `develop` back-merge. Production promotion is **fast-forward only** via `promote-to-production.yml`.

## Promote to production (A/B procedure)

**Workflow:** `.github/workflows/promote-to-production.yml` (`workflow_dispatch` only).

**Preconditions:**
- `main` is a strict ancestor of `develop`
- `develop` is ahead of `main`
- Latest commit on `develop` has green combined status (`test` CI)

**Pre-promote check (agent, before `workflow_dispatch`):**

1. `git fetch origin main develop`
2. `git merge-base --is-ancestor origin/main origin/develop` — must exit **0**. On PowerShell, verify `$LASTEXITCODE` after this command alone (`documentation/DOC_WINDOWS_SHELL.md` § Exit code handling); in Git Bash, check `$?`; do not trust a chained `echo` on the same line.
3. `origin/develop` must be **ahead** of `origin/main` (not equal).
4. Latest `develop` tip has green CI `test` (same bar as the workflow).

If step 2 fails, run § Ancestor failure before triggering promote. Then `gh workflow run promote-to-production.yml`, report the run URL, and stop. Do not `gh run watch`.

**Why no PAT or bypass actor is needed:** `main`'s ruleset only enforces `deletion` + `non_fast_forward`, so the workflow's built-in `GITHUB_TOKEN` can fast-forward. Daily integration + CI happen on `develop`.

**Ruleset design (do not regress):**
- Never add **GitHub Actions** to a ruleset bypass list for this pattern
- Never require `PROMOTE_GH_TOKEN` for fork onboarding
- `main` = `deletion` + `non_fast_forward` only; `develop` per the `git-workflow` rule § Mode behavior table

**Failure modes:**
- `403` / PR required on `main` — first confirm the mode is A/B (under C the PR requirement is intended — stop and merge the PR instead). Under A/B, reduce `main` ruleset to `deletion` + `non_fast_forward`.
- `main is not an ancestor of develop` — § Ancestor failure (recurring when Model B work hits `main` via squash PR while `develop` has a parallel commit)
- Already same commit — nothing to promote

### Ancestor failure

Reconcile, then re-promote. Typical cause: the same logical change landed on **`main`** (squash PR with wrong base or accidental merge to `main`) and on **`develop`** (direct push or different SHA) after a shared parent — histories fork; promote cannot fast-forward.

1. Confirm: `git log --oneline --graph origin/main origin/develop -10` shows sibling commits after one parent.
2. On **`develop`**: `git checkout develop && git pull origin develop && git merge origin/main` (healing merge — **not** the forbidden routine back-merge loop).
3. Push `develop`; wait until CI `test` is green on the new tip.
4. Re-run the pre-promote check; then `gh workflow run promote-to-production.yml`.

**Prevention:** Model B — no app PRs to `main`; no duplicate landing on `main` + `develop`. Model A — squash PRs target **`develop` only**; promote is the only path to `main`.

### First promotion bootstrap

One-time fork setup: `git-workflow` rule § Mode behavior table → **fork setup** (walked by `loop-backlog/references/onboarding.md` § Branch workflow gate).

- GitHub registers `workflow_dispatch` only after the workflow file exists on the default branch (`main`).
- After the first landing on `develop` that includes the workflow file, `main` must be fast-forwarded once. **The user runs this** (agents are blocked by the main write guard):

```bash
git fetch origin && git checkout main && git merge --ff-only origin/develop && git push origin main
```

- Use Promote thereafter.
