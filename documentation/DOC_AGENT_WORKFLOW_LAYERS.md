# Agent workflow layers (plate-harness)

How **skills**, **rules**, **documentation**, and **scripts/hooks** fit together. Use this when adding or changing agent guidance so the layers stay aligned.

## Layers

| Layer | Location | Purpose |
|-------|----------|---------|
| **Rule** | `.claude/rules/<category>.md` | Always-on coding fundamentals and corrections, plus the triggers for guards. Links to skills; never holds a process |
| **Loop skill** | `.agents/skills/router/` + `.agents/skills/loop-*/SKILL.md` | The product-owner loop: one stage each (SSOT for *how*) |
| **Specialist** | `.agents/skills/<name>/SKILL.md` (`spec-*` after batch 3 of the rework) | Called by two or more loop stages when a condition fires; the owner may also call one directly |
| **Meta skill** | `.agents/skills/<name>/SKILL.md` (`meta-*` after batch 4) | Harness maintenance, outside the loop; called directly |
| **Human doc** | `documentation/DOC_*.md` | Product and process narrative for people and agents |
| **Enforcement** | `.husky/*`, `scripts/*`, `.github/workflows/*` | Machine checks; shared helpers in `scripts/*.cjs` |

**Registry:** [`.agents/skills/router/references/catalog.md`](../.agents/skills/router/references/catalog.md) — the admission check (`pnpm validate:skills`) rejects a skill folder that isn't listed or doesn't follow [`meta-write-skill/references/skill-template.md`](../.agents/skills/meta-write-skill/references/skill-template.md). **Routing:** [`router`](../.agents/skills/router/SKILL.md) + [`router/references/loop-map.md`](../.agents/skills/router/references/loop-map.md).

**Claude Code discovery:** `.claude/skills/` is a generated mirror of `.agents/skills/` and `.cursor/rules/*.mdc` is a generated mirror of `.claude/rules/` (`scripts/sync-agent-config.mjs`, `agent-sync.config.json`). Pre-commit refreshes them and CI fails on drift; edit the source only.

## The product-owner loop

```text
STOP 1  loop-backlog → loop-refine          (owner: pick / confirm the top task; answer scope gaps)
        loop-plan → loop-build → loop-check → loop-ship   (autonomous)
STOP 2  loop-verdict on the preview          (owner: Pass / Change / Drop)
```

Between the stops the agent asks only per `.claude/rules/agent-behavior.md` § When to ask: a conflict with a recorded decision, a true tie, a new dependency, a patch on top instead of the fix, a data or irreversible change, or cost / an external service. Full map, sizes and how a lap is located: [`loop-map.md`](../.agents/skills/router/references/loop-map.md).

## Proactive guards (rule-triggered)

Always-on rules fire the guards; the loop stages call the procedure when a rule fires (skill-loop D56).

| Guard | Trigger (rule) | Procedure |
|---|---|---|
| Naming / copy counts | `code-style` § Naming | The rule itself (F1–F6) |
| Layer consistency / workaround | `architecture` § Layer consistency | [`spec-check-layer`](../.agents/skills/spec-check-layer/SKILL.md) |
| Industry precedent | `architecture` § Pattern risk | [`loop-plan/references/review-precedent.md`](../.agents/skills/loop-plan/references/review-precedent.md) |
| Package / pattern reuse | `architecture` § Don't reinvent the wheel | [`spec-reuse-package`](../.agents/skills/spec-reuse-package/SKILL.md) |
| Heavy DB / UI operations | `architecture` § Performance cost risk | [`spec-optimize-performance`](../.agents/skills/spec-optimize-performance/SKILL.md), [`spec-optimize-performance`](../.agents/skills/spec-optimize-performance/SKILL.md) |
| External API research | `api-integration` rule | [`loop-plan/references/research-api.md`](../.agents/skills/loop-plan/references/research-api.md) |
| Foundation cleanup (deep modules, duplication, placement) | `loop-plan` § Steps 2 | [`loop-plan/references/deepen-modules.md`](../.agents/skills/loop-plan/references/deepen-modules.md) |

On-demand, outside the loop: should-we-align with industry practice → [`spec-simplify-flow`](../.agents/skills/spec-simplify-flow/SKILL.md); simplify one flow → [`spec-simplify-flow`](../.agents/skills/spec-simplify-flow/SKILL.md).

## Where decisions live

- **Durable:** next to what they govern — the feature `README.md`, `documentation/DOC_APP_VISION.md`, or a rule (skill-loop D48). `loop-refine` reads them before asking anything; a changed decision line shows in the PR diff, and `loop-verdict` lists it for the owner.
- **Per lap:** `documentation/jobs/temp_job_<slug>/DECISIONS.md` on the lap's branch ([template](../.agents/skills/loop-refine/references/decisions-template.md)), folded into the durable homes by `loop-build` before merge.
- **Impl-time choices:** the plan's **Decisions made**.

## Cross-repo adoption guides

**Doc type:** adoption guide (`<SLUG>_ADOPTION_GUIDE.md`) — how to replicate a capability in other repos; not a session handoff.

| Item | Path |
|------|------|
| How to write a guide | `.agents/skills/meta-write-adoption-guide/SKILL.md` |
| Output folder (config in skill) | `documentation/handoffs/` |
| Template + voice rules | `.agents/skills/meta-write-adoption-guide/references/adoption-guide-template.md`, `references/voice-and-naming.md` |

Copy `meta-write-adoption-guide/` to other projects and adjust the skill **Configuration** block (output folder, repo display name).

## Local git: commit → push (`loop-ship`)

| Step | Skill | Hook / script |
|------|-------|----------------|
| Commit | [`loop-ship`](../.agents/skills/loop-ship/SKILL.md) | `.husky/pre-commit` (skill admission check, `.claude/skills` mirror, light path + staged tests — see below) |
| Push + PR | [`loop-ship`](../.agents/skills/loop-ship/SKILL.md) | `.husky/pre-push` (no local tests; CI `test` job is the merge gate) |

**Pre-commit light path** (SSOT: [`scripts/change-classify.cjs`](../scripts/change-classify.cjs)):

| Staged paths | Kind | Runs | Skips |
|--------------|------|------|-------|
| Always | — | `lint-staged`, `validate:feature-docs:staged` | — |
| Docs-only (`.md`, `documentation/`, `.cursor/**`, `.agents/**`, changesets) | `docs` | `validate:docs` | tests, `type-check`, `validate:structure:staged`, `arch:check:staged` |
| SQL migrations / seed only | `migrations` | — | Same skips as docs (no `validate:docs`) |
| Tooling only (no app surface, no test-infra) | `no-src` | — | Same skips |
| App / test-infra surface | full | Staged tests, `type-check`, structure, feature-size, arch | — |

**Pre-commit test modes** (SSOT: [`scripts/test-staged.cjs`](../scripts/test-staged.cjs), classifier: `change-classify.cjs`):

| Mode | When | Runner |
|------|------|--------|
| skip (light) | docs / migrations / no app surface | none |
| related | 1–25 `src/**` source files, no triggers | `vitest run related <paths>` |
| full | triggers, `src/shared/**`, test-infra, edge functions, >25 files, `PRECOMMIT_TEST_FULL=1` | `pnpm test:classify && pnpm test:run` |
| node-scripts-only | `scripts/**` only | `pnpm test:classify` |
| dry-run | `pnpm test:staged` | log only |
| live (no commit) | `pnpm test:staged:live` | same as hook |

**Merge safety:** Related or full pre-commit green is **not** merge-safe. Only the CI `test` job where work lands is authoritative (`.claude/rules/git-workflow.md` § Mode behavior table → **how work lands**: Model C the PR to `main`, also gated by `pr-title`; Model A the PR to `develop`; Model B the `develop` push run).

**Worktree sessions (Model C):** the Claude Code SessionStart hook (`scripts/ensure-deps-installed.cjs`) installs dependencies in a new worktree so these hooks run there too. Archive a finished session in the desktop app (or turn on auto-archive after PR merge) to remove its worktree.

**Agent commands:** `pnpm test:staged` (preview after `git add`); `PRECOMMIT_TEST_FULL=1 pnpm test:staged` (force full preview); `pnpm test:classify && pnpm test:run` (CI parity).

**Rollback:** Revert hook commit and restore pre-push `test:run` if related spawn fails in the wild.

PR / push CI runs full `pnpm test:classify`, `pnpm test:run`, and cold `pnpm type-check` in [`.github/workflows/ci.yml`](../.github/workflows/ci.yml).

See `.claude/rules/git-workflow.md` § Mode-aware branch gate (`src/config/git-workflow.json`) and `.claude/rules/agent-behavior.md` for protected files.

## Release and versioning

- Mode-aware changesets: `documentation/DOC_CHANGESETS.md` + conventional commits ([`loop-ship/references/commit-standards.md`](../.agents/skills/loop-ship/references/commit-standards.md)).
- Version source per table → **version source**: Model A/B bump with each landing on `develop` in `loop-ship`, and production is **Promote to production** after the owner's Pass; Model C has no per-PR bump — release-please opens a release PR on `main`, and the owner's Pass merges the lap's PR.

## When you change something

| You change… | Also update… |
|-------------|----------------|
| `src/config/git-workflow.json` / mode docs | `.claude/rules/git-workflow.md`, `loop-ship`, `loop-verdict`, `loop-backlog/references/onboarding.md`, `DOC_CONTRIBUTING`, `DOC_CLOUDFLARE_WORKERS` |
| `.husky/pre-commit` | `.claude/rules/git-workflow.md`, `.claude/rules/agent-behavior.md`, `loop-ship`, this doc if hook scope changes |
| `.husky/pre-push` | `.claude/rules/git-workflow.md`, `loop-ship/references/push-safety.md`, this doc if hook scope changes |
| A loop stage (add, rename, reorder) | `router/references/loop-map.md`, `router/references/catalog.md`, the neighbor stages' Edges (Calls ⇄ Called by — `pnpm validate:skills`) |
| Any skill | `meta-write-skill/references/skill-template.md` structure + catalog row; `pnpm validate:skills` |
| The stop list / when to ask | `.claude/rules/agent-behavior.md` § When to ask; `loop-refine/references/asking.md` for *how* |
| Rules registry for skills | `.agents/skills/loop-plan/references/rules-registry.md`; callers link only |
| A guard's trigger | the rule section in § Proactive guards above + the loop skills' `Calls` lines |
| New cross-repo adoption guide | `meta-write-adoption-guide` skill; file under `documentation/handoffs/*_ADOPTION_GUIDE.md` |

## Related

- Loop map: `.agents/skills/router/references/loop-map.md`
- Skill registry: `.agents/skills/router/references/catalog.md`
- Skill template: `.agents/skills/meta-write-skill/references/skill-template.md`
- Write adoption guides: `.agents/skills/meta-write-adoption-guide/SKILL.md`
- Fork porting note for the skill loop (rename map): `documentation/handoffs/SKILL_LOOP_ADOPTION_GUIDE.md`
- Doc hub: `documentation/DOC_INDEX.md`
- Changesets: `documentation/DOC_CHANGESETS.md`
- App vision: `documentation/DOC_APP_VISION.md`
