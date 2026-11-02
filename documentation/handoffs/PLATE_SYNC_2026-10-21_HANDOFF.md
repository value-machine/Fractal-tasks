# Handoff: sync plate-harness updates into bronze-plate-harness (2026-10-21)

**For:** the agent working in bronze-plate-harness.
**Source:** `TMI-apps/plate-harness` `main` (PRs #56–#62; first release-please release v0.42.0).
**Relationship:** bronze descends from plate (`8083ee4`). On 2026-10-21 plate took over bronze's generic improvements (audit: plate `documentation/jobs/temp_job_plate-bronze-diff/`) and also gained work bronze does not have yet. This file lists only that second group.

Bronze runs `model-c`: land each block below as its own PR to `main` (conventional title, `## Preview` section). Read the plate commit with `git show <sha>` from a plate clone; port the **method**, not the text, where bronze's version differs (shadcn/Tailwind stack, theming).

## Already in bronze — do not port

Node 22 + `preinstall` check, `NODE_VERSION` docs, Supabase staging docs, `## Preview` rule, anchored dependency-cruiser excludes, `test-staged` Vitest 4 fix, `react-hooks` lint, `components/common` lint path, `ProfileMenu`/`Topbar` in `layouts/`, `.eslintrc.json` and unused ESLint deps removed, `lint:arch` removed. These came from bronze.

## Deliberate differences — do not port

- **Airtable:** optional module in plate (service, env types, vendor guide, `stack-port-airtable`). Stays **absent** in bronze.
- **MUI-specific content** (sx lint rules, MUI debug pattern, `stack-port-mui`, MUI grandfathered entries in the depcruise baseline).

## Port, in this order

### 1. Release-please: no jump to 1.0.0 on a breaking change (priority: high)

**Problem:** with `release-type: node` and no config, a `feat!:` before 1.0 makes release-please propose **1.0.0**. Plate hit this with #56. Bronze has the same setup (`release-please.yml` line `release-type: node`).

**Plate change:** PR #59 (`91eb3e1`).
- Add `release-please-config.json`: package `.`, `release-type: node`, `package-name: bronze-plate-harness`, `include-component-in-tag: false`, `bump-minor-pre-major: true`, `bump-patch-for-minor-pre-major: false`.
- Add `.release-please-manifest.json`: `{ ".": "0.41.0" }` (bronze's latest GitHub release is `v0.41.0`; the manifest must equal the last **released** version, not `package.json` if they differ).
- `release-please.yml`: replace `release-type: node` with `config-file: release-please-config.json` and `manifest-file: .release-please-manifest.json` (action v4 has no input for `bump-minor-pre-major`).
- `projectStructure.config.cjs` (**protected — ask the user**): whitelist both new root files next to `package.json`.
- `documentation/DOC_CHANGESETS.md` § Model C: one bullet on the config (see plate).

**Check:** `pnpm validate:structure`; after merge the Release Please run on `main` proposes 0.42.0 (bronze has `feat` commits after v0.41.0), not 1.0.0.

**Lesson from plate:** the manifest version needs a matching GitHub release (`v<version>`). Plate set 0.41.0 by hand without a release; release-please then walked old history and its 0.42.0 notes listed unrelated commits (cleaned up in plate #62). Bronze is fine: `v0.41.0` exists. Before merging, confirm `v0.41.0` is still the latest release.

### 2. Preview-URL rule wording (priority: low)

**Plate change:** PR #60 (rule part only; its workflow part was reverted in #62), `.cursor/rules/git-workflow/RULE.mdc` § Pull Requests → **Preview link** (**protected — `.cursor/**`**).
Take the URL from the `cloudflare-workers-and-pages[bot]` comment ("Preview URL: …", the branch-alias URL, not the per-commit one). Fallback when the comment is missing: `https://<alias>-<worker>.<subdomain>.workers.dev` (alias = branch name lowercased, non-alphanumerics → `-`), verified (HTTP 200, page loads `/assets/*.js`) before it goes in the PR. Bronze's Worker is `bronze-plate-harness`; fill in its own `workers.dev` subdomain.

### 3. Tighten always-loaded harness context (priority: medium, largest)

**Plate commits:** `fd821ac` (architecture, code-style, file-placement), `184d42b` (all always-on rules, −62% always-loaded bytes: 97,979 → 37,444 per `harness_scan`), `1d05337` (router and create-skill).

Do this with bronze's own `.agents/skills/meta-audit-harness/SKILL.md`, using the plate commits as a worked example. Do not copy plate's rule files: bronze's rules carry shadcn/Tailwind and theming content that must stay.

What plate did, per item:
- **Rules:** cut generic advice, reduce prose that tooling enforces to the command that checks it, move on-demand material out. The TanStack optimistic playbook moved from the architecture rule to `DOC_TANSTACK_QUERY.md` (rule keeps summary + trigger). The Supabase RLS performance section moved to the migration-scoped `database` rule. Bronze's `architecture/RULE.mdc` is ~36 KB; plate's is ~11 KB.
- **`AGENTS.md`:** stop `@`-importing `.cursor/rules/INDEX.md` (it duplicates the portable catalog in every Claude Code session); INDEX stays as the on-demand topic map. Delete `.cursor/rules/README.md` (third copy of the catalog).
- **Path aliases:** only `@/*` exists (`tsconfig.app.json`, same in bronze). Remove any doc that advertises `@/hooks`, `@/utils`, `@/services`, ….
- **Router:** move the pairwise "X vs Y" tiebreaks and pipelines verbatim to `router/references/tiebreaks.md`; the situation tables become the Skill index (plate: 6.3k → 3.7k words; bronze is at 6.3k). Update inbound anchors.
- **create-skill:** plate cut 5.3k → 0.9k words. It was a copy of an external skill-creator that drives scripts and viewers that don't exist here; keep the method and add this repo's integration steps (protected-file consent, router, validators). Bronze is at 5.3k.
- Fix dangling skill references found on the way (`pnpm validate:docs`).

**Protected:** all `.cursor/**` edits — get the user's consent for the batch first.
**Check:** `pnpm validate:docs`, `pnpm test:classify` (includes `harness_scan` tests), and the `harness_scan` byte count before and after.

### 4. Remove completed job plans and stale reference material (priority: low)

**Plate commit:** `1d9d437` (72 files, −11k lines). Criterion: a `documentation/jobs/temp_job_*` folder whose work has landed and that nothing links to is removed (git history keeps it); keep jobs that are still open or are cited as decision sources (for example the model-c job, which `release-please.yml` cites). Bronze has 30+ job folders; apply the same criterion and list the removals in the PR body.

### 5. Dead app code (priority: low)

**Plate commit:** `697359e` — found with `knip`, each hit confirmed with grep. Bronze's lean cleanup (`ed7cc97`) already removed most of what plate removed. Run `npx knip` once in bronze and remove only confirmed-unused exports, files and dependencies. Do not remove anything the theming subsystem loads at runtime or by token build.

## Done when

- Blocks 1–2 merged; Release Please on `main` shows a 0.x release PR, never 1.0.0.
- Block 3 merged with the `harness_scan` before/after numbers in the PR body.
- Blocks 4–5 merged or explicitly skipped by the user.
- Every PR green on `test` and `pr-title`, with a working `## Preview` link.
