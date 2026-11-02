# Context checklist

Read by [`spec-load-context`](../SKILL.md). Ported from `prime` (v0.42.0).


Load project context at the start of a new session. Build an understanding of this harness’s structure, governance, and active state before tackling tasks.

**When to use:** New chat, ambiguous task, or before larger refactors.  
**Related:** For architecture/quality gate, use `.agents/skills/loop-check/SKILL.md` (auto-selects gate depth). For planning features, use `.agents/skills/loop-plan/SKILL.md`. For onboarding a human, use `.agents/skills/loop-backlog/SKILL.md`.

## Objective

Align with project rules and architecture so work does not violate enforced boundaries (ESLint boundaries, dependency-cruiser, structure whitelist).

---

## Process

### 1. Codebase mapping and structure

- **Tracked files:** Run `git ls-files` (large repos: in PowerShell use `git ls-files | Select-Object -First 150` instead of `head`).
- **Architecture overview:** Read `ARCHITECTURE.md` (folder layout, TanStack Query, layers, path aliases).
- **Doc index:** Read `documentation/DOC_INDEX.md` (SSOT map, quick links).
- **Testing guide:** Skim `documentation/DOC_TESTING.md` when the task adds or changes tests (runners, colocation, `tests/test-utils`).
- **App vision (product SSOT):** Read `documentation/DOC_APP_VISION.md`. If the vision status line is still **`DRAFT`**, state in **Actionable insights** that feature/plan ambiguity should be resolved by filling that file (or running `.agents/skills/loop-backlog/SKILL.md` § App vision) before major product decisions.
- **Features (discover, do not assume):** List `src/features/` — this harness ships with **`auth`** and **`setup`** only; forks may add more. Do not use a fixed feature list from another repo.
- **Entry points:** Read `index.html`, `src/main.tsx`, `src/App.tsx` (provider order: `QueryProvider` → `AuthProvider` → `BrowserRouter`).

### 2. Governance and rules

- **Rule index:** Read `documentation/DOC_RULES_INDEX.md`.
- **Architecture SSOT:** Read `.claude/rules/architecture.md` (layers, path aliases `@/*`, import direction, structure whitelist).
- **File placement:** Read `.claude/rules/file-placement.md` — validation uses **`projectStructure.config.cjs`** (not `.js`).

### 3. Dependencies and boundaries

- **Tech stack and scripts:** Read `package.json`.
- **Module boundaries:** Read `.dependency-cruiser.cjs` (forbidden upward imports, hooks/services/utils rules, warnings on direct service use from components).

### 4. Active project state

- **Recent activity:** `git log -n 10` (full commit messages: subject and body; do not use `--oneline`)
- **Working tree:** `git status -sb`. Read `src/config/git-workflow.json`, then apply `.claude/rules/git-workflow.md` § Mode-aware branch gate (read config **before** treating the current branch as allowed/forbidden).
- **Optional plans:** Scan `documentation/jobs/` for active work (e.g. `documentation/jobs/temp_job_*/`) when relevant.

---

## Output report

Deliver a concise, scannable summary:

### Project overview

- Application type (Vite + React + Tailwind/shadcn-ui + Supabase starter).
- Primary libraries (from `package.json`).
- Current version (`package.json` → `version`).

### Architecture

- **Features:** Names under `src/features/` only (verified, not assumed).
- **Layering:** Pages → components → hooks → services → shared; see `ARCHITECTURE.md` and architecture rule.
- **Import boundaries:** Short list of the most relevant `forbidden` rules from `.dependency-cruiser.cjs`.

### Current state

- Branch and cleanliness of working tree.
- Recent commit themes.
- Active plans (`documentation/jobs/` if relevant).

### Actionable insights

- Mismatches vs rules, missing optional docs, or tech debt called out in repo docs.
- Active plans with unresolved app-usage ambiguity or undocumented standards/best-practice diversions, when visible from `documentation/jobs/`.

---

## Boilerplate-specific notes

- **Downstream forks:** After cloning for a real product, update the “features” section of this report whenever `src/features/` changes; keep `spec-load-context` generic.
- **Validation:** References in this file are checked by `pnpm validate:docs` (cursor doc references). Prefer paths that exist in this repository.

---

## Boundaries

| Not `spec-load-context` | Use instead |
|-------------|-------------|
| Human first-time setup | onboarding (`loop-backlog`) |
| Product vision Q&A | `loop-refine` |
| Product forks during planning | `loop-plan` fork checklist |
| Write `DEVELOPMENT_PLAN.md` | `loop-plan` |
| Commit / push / PR | `loop-ship` |

**Next:** back to the stage that called it — [`router`](../../router/SKILL.md) or [`loop-refine`](../../loop-refine/SKILL.md).
