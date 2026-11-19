# Git Workflow

Branch strategy, pull requests, and production. Everything that differs by mode lives in **§ Mode behavior table** — other sections, skills, and docs point at its rows instead of restating them.

**Mode config SSOT:** `src/config/git-workflow.json` (`mode`: `model-a` | `model-b` | `model-c`). Read it with `node scripts/validate-git-workflow.cjs --print-mode` or by opening the file. **Forbidden:** guessing the mode from the current branch name.

## Version Control Standards

Where the version and changelog come from: § Mode behavior table → **version source**. For A/B, `.agents/skills/loop-ship/SKILL.md` is the SSOT for semver, changelog gate, commit format, and `package.json` / `CHANGELOG.md` sync.

**Note:** Configuration lives in `.env` only. Onboarding checklist: `src/config/app-tasks.json` (see `src/features/tasks/README.md`).

## Mode behavior table

| Behavior | `model-a` | `model-b` | `model-c` (default for new forks) |
|----------|-----------|-----------|-----------------------------------|
| **daily branch** | `feature/*` / `fix/*` off `develop` | `develop` | any non-`main` branch (incl. Claude Code worktree branches) |
| **branch gate** | stop on `main` and `develop` (create a feature branch); proceed on `feature/*` / `fix/*` | stop on `main`; proceed on `develop`; stop on `feature/*` (switch to `develop`) | stop on `main` (branch first); proceed anywhere else |
| **how work lands** | squash PR → `develop` | direct push → `develop` | squash PR → `main`, opened the Claude Code default way (`gh pr create`, base = default branch) |
| **commit timing** | `loop-ship` commits on its own once `loop-check` passes (skill-loop D25) | same as A | same as A |
| **version source** | `loop-ship` bumps `package.json` + `CHANGELOG.md` per landing | same as A | release-please release PR built from conventional PR titles; no per-PR bump |
| **CI watcher** | babysit the PR checks | report the commit URL and stop (no `gh run watch`) | Claude Code desktop PR monitor / Auto-fix (no `gh run watch`) |
| **staging** | `develop` stable preview (+ per-PR previews) | `develop` preview (may deploy before `test` is green) | per-PR preview URL; Supabase is one shared project until the app has real users, then an isolated staging (see `documentation/DOC_CLOUDFLARE_WORKERS.md` § Staging backend) |
| **Stop 2 surface** (owner test before production, skill-loop D47) | the `develop` preview after the PR lands on `develop` | the `develop` preview | the PR preview, before merge |
| **production** | the owner's Pass at Stop 2 → `loop-ship` runs Promote to production (ff `main` ← `develop`) | same as A | the owner's Pass at Stop 2 → `loop-ship` merges the PR (or the owner merges / uses the per-PR auto-merge toggle) |
| **"land on main / promote / release" means** | run § Promote to production | same as A | merge the PR — **never** dispatch promote |
| **`main` ruleset** | `deletion` + `non_fast_forward` only | same as A | `pull_request` (squash only) + required `test` and `pr-title` (source: GitHub Actions) + `non_fast_forward` + `deletion`; no bypass actors; no required approvals; branches need not be up to date |
| **`develop` ruleset** | `pull_request` + required `test` + `non_fast_forward` + `deletion` | no `pull_request`; required `test` + `non_fast_forward` + `deletion` (not a pre-land gate: a bad push can exist and deploy staging before CI finishes) | none (`develop` does not exist) |
| **fork setup** | create `develop` from `main`; rulesets; `loop-ship/references/push-safety.md` § First promotion bootstrap | same as A | rulesets; squash-only + PR title as commit message; allow auto-merge; Cloudflare production branch `main` with previews on all branches; baseline release is automatic (`release-please.yml` `bootstrap` job) |

**Invariants in every mode:** agents never commit or push to `main` (a Claude Code hook enforces it); no force-push to protected branches; **under C, never relax the `main` ruleset**.

## Mode-aware branch gate

Agents run this before editing app code (`src/**`, configs, migrations, etc.):

1. Read the mode (see top of this rule).
2. Check the current branch.
3. Apply the **branch gate** row of § Mode behavior table. If it says stop, switch branches (or wait for the user) before editing.
4. Branches the row does not name (A/B only): ask the user before proceeding.

Plans (`documentation/jobs/**/DEVELOPMENT_PLAN.md`) and rules (`.claude/rules/**`) remain editable on any branch per § Exceptions.

## Branch invariants

- **A/B:** `main` is always an ancestor of `develop`. Integration commits land on `develop` only; never land the same change twice on parallel paths (e.g. squash PR on `main` while an equivalent commit is pushed to `develop`) — sibling SHAs break promote. **Forbidden:** squash PRs `develop` → `main`, routine `main` → `develop` back-merge as release hygiene (old broken model), app-code pushes to `main` other than the promote workflow. Per-model branch detail: `.agents/skills/loop-ship/references/push-safety.md` § Branch detail (A/B).
- **C:** follows Claude Code's documented defaults (worktree sessions, PR monitor, opt-in squash auto-merge: https://code.claude.com/docs/en/desktop). Parallel worktree sessions are expected — each works on its own branch. The `main` ruleset and CI are the guard; release-please owns versions.
- **Rulesets, not classic branch protection:** classic `gh api .../branches/main/protection` may return `404` — that is **not** evidence `main` is unprotected. Use `gh api repos/OWNER/REPO/rules/branches/main` (and `.../develop` for A/B). Expectations: § Mode behavior table → **`main` ruleset**, **`develop` ruleset**.

### Exceptions

#### Safe to Edit on Any Branch

These files may be edited on any branch after user confirmation:
- Documentation files (`documentation/**/*.md`), including plan files (`documentation/jobs/**/DEVELOPMENT_PLAN.md`)
- Cursor rules (`.claude/rules/**`)
- README files

Mechanism-rename reference updates do not need that confirmation. See `.claude/rules/agent-behavior.md` § Protected Files.

App code still follows § Mode-aware branch gate.

#### Emergency Main Branch Changes (Rare Exception)

Only when ALL of the following are true:
1. User explicitly states "emergency fix on main"
2. User confirms with "yes, proceed on main"
3. User acknowledges the risk

Then the agent prepares the change on a branch and hands the user the exact commands; **the user** commits and pushes on `main` themselves. Agents never write to `main` — the main write guard hook blocks it.

## Pull requests

Where PRs go: § Mode behavior table → **how work lands** (A: `develop`, always with an explicit base; B: no daily PR; C: `main`, the Claude Code default way). Procedure — `gh` steps, PR body template, preview-URL lookup, "merge blocked" diagnosis: `.agents/skills/loop-ship/references/push-safety.md` § Pull request.

- **Title:** conventional `type: Subject` (all modes — under C, release-please reads it and CI enforces it via `pr-title`).
- **Preview link (every PR):** the PR body carries a `## Preview` section with the live preview URL of the PR's branch, and the chat handoff gives it next to the PR link.
- **Who reads what:** the PR body is the record for agents and reviewers. The owner reads only the short chat handoff (`.agents/skills/loop-verdict/SKILL.md` § Output) and tests the preview; never require them to read the PR body to decide.
- **No `- [ ]` task lists in a PR body:** GitHub renders them as clickable boxes that read as a to-do for the owner, and nobody has to tick anything (merge-is-pass D6).

## Promote to production

**A/B only.** Under C, production = the user merging the PR (§ Mode behavior table → **production**); never dispatch promote.

Under A/B, when the user says "promote to production", colloquial **"land on main"**, **"PR develop to main"**, **"merge develop to main"**, or **"release to production"**, **do not** open a `develop` → `main` PR. Run `.agents/skills/loop-ship/references/push-safety.md` § Promote to production (A/B procedure): pre-promote check, `gh workflow run promote-to-production.yml`, ancestor-failure reconcile, first-promotion bootstrap, and the ruleset design it depends on (no PAT, no GitHub Actions bypass actor).

## Commit and Push Workflow

**Skill:** `.agents/skills/loop-ship/SKILL.md` (commit, push, PR, CI) — the owner's verdict is `.agents/skills/loop-verdict/SKILL.md`. Timing, landing, and CI follow-up per § Mode behavior table → **commit timing**, **how work lands**, **CI watcher**, **Stop 2 surface**.

1. One lap = one branch (worktree under Model C). Every commit on it belongs to the lap.
2. **Commit:** once `loop-check` passes — cleanup, version/changelog per **version source**, a conventional `type: Subject` title with a detailed body (`loop-ship/references/commit-standards.md`).
3. **Push + land:** clean tree, existing commits only; push per **how work lands**; drive CI to green per **CI watcher**.
4. **Production** only after the owner's Pass at Stop 2 (**production** row). Agents never write to `main` directly.
