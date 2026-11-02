# Documentation Index

Central navigation for plate-harness documentation. For authoritative rules and process, see the SSOT locations below.

## Quick Links

| Topic | Document |
|-------|----------|
| **How to contribute safely** | [DOC_CONTRIBUTING.md](./DOC_CONTRIBUTING.md) |
| **Agent: session context** | [`.agents/skills/spec-load-context/SKILL.md`](../.agents/skills/spec-load-context/SKILL.md) |
| **Agent: entry point (router)** | [`.agents/skills/router/SKILL.md`](../.agents/skills/router/SKILL.md) — finds the loop stage |
| **Agent: the product-owner loop (map)** | [`.agents/skills/router/references/loop-map.md`](../.agents/skills/router/references/loop-map.md) |
| **Agent: backlog and Stop 1 (loop-backlog, loop-refine)** | [`loop-backlog`](../.agents/skills/loop-backlog/SKILL.md), [`loop-refine`](../.agents/skills/loop-refine/SKILL.md) |
| **Agent: plan, build, check (loop-plan, loop-build, loop-check)** | [`loop-plan`](../.agents/skills/loop-plan/SKILL.md), [`loop-build`](../.agents/skills/loop-build/SKILL.md), [`loop-check`](../.agents/skills/loop-check/SKILL.md) |
| **Agent: ship and Stop 2 (loop-ship, loop-verdict)** | [`loop-ship`](../.agents/skills/loop-ship/SKILL.md), [`loop-verdict`](../.agents/skills/loop-verdict/SKILL.md) |
| **Agent: skill registry** | [`.agents/skills/router/references/catalog.md`](../.agents/skills/router/references/catalog.md) |
| **Agent: write adoption guides** | [`.agents/skills/meta-write-adoption-guide/SKILL.md`](../.agents/skills/meta-write-adoption-guide/SKILL.md) |
| **Agent workflow layers (skills vs rules)** | [DOC_AGENT_WORKFLOW_LAYERS.md](./DOC_AGENT_WORKFLOW_LAYERS.md) — includes **The product-owner loop** |
| **Handoffs (portable notes)** | [handoffs/README.md](./handoffs/README.md) |
| **Agent skill: persist lessons** | [`.agents/skills/meta-learn-lessons/SKILL.md`](../.agents/skills/meta-learn-lessons/SKILL.md) |
| **Harness overview (designed flowchart for non-technical readers; route `/harness`)** | [`src/features/harness-overview/README.md`](../src/features/harness-overview/README.md) · [preview image](../public/harness-overview.png) |
| **Architecture** | [ARCHITECTURE.md](../ARCHITECTURE.md) |
| **Architecture migration** | [DOC_ARCHITECTURE_MIGRATION_INSTRUCTIONS.md](./DOC_ARCHITECTURE_MIGRATION_INSTRUCTIONS.md) |
| **Agent: human onboarding** | [`loop-backlog/references/onboarding.md`](../.agents/skills/loop-backlog/references/onboarding.md) |
| **App vision & goals (fillable)** | [DOC_APP_VISION.md](./DOC_APP_VISION.md) |
| **Dev task backlog** | [src/features/tasks/README.md](../src/features/tasks/README.md) |
| **Theming (DTCG tokens, light/dark, runtime overrides)** | [DOC_THEMING.md](./DOC_THEMING.md) |
| **TanStack Query** | [DOC_TANSTACK_QUERY.md](./DOC_TANSTACK_QUERY.md) |
| **Testing (runners, placement, patterns)** | [DOC_TESTING.md](./DOC_TESTING.md) |
| **Feature-local README enforcement** | [DOC_FEATURE_LOCAL_README.md](./DOC_FEATURE_LOCAL_README.md) |
| **Supabase: Sign in with Google (dashboard setup)** | [DOC_SUPABASE_GOOGLE_OAUTH.md](./DOC_SUPABASE_GOOGLE_OAUTH.md) |
| **Mobile local dev (physical device)** | [DOC_MOBILE_LOCAL_DEV.md](./DOC_MOBILE_LOCAL_DEV.md) |
| **Cloudflare Workers deployment** | [DOC_CLOUDFLARE_WORKERS.md](./DOC_CLOUDFLARE_WORKERS.md) |
| **Complexity reduction** | See `.claude/rules/architecture.md` complexity section |

## SSOT Map (Single Source of Truth)

| Topic | SSOT Location |
|-------|----------------|
| Workflow, versioning, changelog | `.agents/skills/loop-ship/SKILL.md` (+ `references/commit-standards.md`) |
| Branch strategy, release promotion flow | `.claude/rules/git-workflow.md` (mode: `src/config/git-workflow.json`) |
| Git workflow mode selector | `src/config/git-workflow.json` + `src/config/git-workflow.README.md` |
| Protected files, agent behaviors | `.claude/rules/agent-behavior.md` |
| PowerShell / local environment | `.claude/rules/platform.md` |
| Development process (the product-owner loop) | `.agents/skills/router/references/loop-map.md` |
| Architecture patterns | `.claude/rules/architecture.md` |
| Project structure | `projectStructure.config.cjs` |
| Dependency rules | `.dependency-cruiser.cjs` |
| **Dev task backlog / onboarding checklist** | `src/config/app-tasks.json` + `src/features/tasks/README.md` |
| **App vision & goals (problem, persona, app role)** | `documentation/DOC_APP_VISION.md` |
| **Agent workflow layers** | `documentation/DOC_AGENT_WORKFLOW_LAYERS.md` |
| **Supabase + Google OAuth (dashboard / Google Cloud)** | `documentation/DOC_SUPABASE_GOOGLE_OAUTH.md` |
| **Mobile local dev on physical device** | `documentation/DOC_MOBILE_LOCAL_DEV.md` |
| **Cloudflare Workers deployment** | `documentation/DOC_CLOUDFLARE_WORKERS.md` + `wrangler.jsonc` |
| **Testing (runners, colocation, patterns)** | `documentation/DOC_TESTING.md` |
