# Skill catalog (registry)

Registry for `scripts/validate-skills.cjs` (admission check, skill-loop D37). Every skill folder in `.agents/skills/` must be either a v0.42.0 skill listed in [`baseline-sections.md`](baseline-sections.md) or a row below. A `built` row is fully checked; `planned` rows are the target of the skill-loop rework.

Decisions: [`DOC_DECISION_LOG.md`](../../../../documentation/DOC_DECISION_LOG.md) § skill-loop. Structure: [`meta-write-skill/references/skill-template.md`](../../meta-write-skill/references/skill-template.md).

## Skills

| Skill | Status | Replaces (v0.42.0) |
|---|---|---|
| `router` | built | `router` |
| `loop-backlog` | built | `router`, `start` |
| `loop-refine` | built | `grill-me`, `feature` |
| `loop-plan` | built | `plan`, `feature`, `plan-grill`, `plan-grill-auto`, `quick-piv`, `review-dev-plan`, `validate`, `api-integrate`, `pattern-review`, `purge-skill`, `consolidate`, `modularity-review`, `optimize2` |
| `loop-build` | built | `implement`, `quick-piv` |
| `loop-check` | built | `validate`, `review` |
| `loop-ship` | built | `finish`, `push`, `bundle-ship` |
| `loop-verdict` | built | `finish` |
| `spec-load-context` | built | `prime` |
| `spec-debug-runtime` | built | `debug`, `hypothesis` |
| `spec-reuse-package` | built | `dont-reinvent-the-wheel` |
| `spec-simplify-flow` | built | `challenge`, `standards-align` |
| `spec-optimize-performance` | built | `optimize2`, `react-perf-vite` |
| `spec-check-layer` | built | `layer-consistency-check` |
| `meta-write-skill` | built | `create-skill` |
| `meta-audit-harness` | built | `align-harness`, `tighten-harness` |
| `meta-intake-harness` | built | `update-harness` |
| `meta-write-adoption-guide` | built | `write-adoption-guide` |
| `meta-learn-lessons` | built | `learn` |
| `meta-grade-rule` | built | `rule-quality` |
| `meta-compress-output` | built | `caveman` |

## Retired without a skill

| Source (v0.42.0) | Destination |
|---|---|
| `name-the-mechanism` | `code-style` rule § Naming (skill-loop D33) |
| `improve` | deleted — an owner front door to specialists (skill-loop D35) |
