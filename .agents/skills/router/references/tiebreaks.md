# Router tiebreaks (pairwise disambiguation)

On-demand companion to [`../SKILL.md`](../SKILL.md). Read when two or more skills outside the loop seem to apply. Loop stages need no tiebreak: [`loop-map.md`](loop-map.md) fixes their order. Choose by **primary outcome** (what must be true when done).

### `spec-simplify-flow` vs `spec-optimize-performance`

- **`spec-simplify-flow`:** Question whether the **feature or workflow** should exist or be simpler (remove/merge steps).
- **`spec-optimize-performance`:** Improve existing code **without** necessarily changing product scope.

### `spec-debug-runtime` vs `meta-learn-lessons`

- **`spec-debug-runtime`:** Active incident; hypotheses; runtime evidence; possibly temporary instrumentation.
- **`meta-learn-lessons`:** Capture durable rule/skill/debug-pattern updates. **Proactive** learn waits until the struggle is resolved (not as primary beside active `spec-debug-runtime`). **Manual** `/learn` (user invoked or skill attached) runs **in that turn**, including on a still-red CI/incident message — do not defer behind the fix. Procedure: `.agents/skills/meta-learn-lessons/SKILL.md` § Turn contract.

### `meta-grade-rule` vs `meta-learn-lessons`

- **`meta-grade-rule`:** Score (Mode A) or rewrite (Mode B) **provided rule/command text**.
- **`meta-learn-lessons`:** Decide **where** lessons live (rules vs skills vs debug appendix) from incident context.

### `meta-audit-harness` vs `meta-intake-harness` vs `meta-learn-lessons`

- **`meta-audit-harness`:** In-repo harness coherence and context cost (skills + rules + AGENTS + INDEX + layers).
- **`meta-intake-harness`:** External drops in `.agents/harness-inbox/` — disposition report + confirmed apply.
- **`meta-learn-lessons`:** Session lesson from a mistake; removal-first; structural conflicts → `meta-audit-harness`.

### `meta-audit-harness` vs `meta-grade-rule`

- **`meta-audit-harness`:** **Harness-wide** audit — separation of concerns, SSOT, conflicts, handoffs — via parallel lens subagents and a no-information-loss gate. Edits harness corpus + router/layers spine.
- **`meta-grade-rule`:** One **rule/command file's** grade or prose. Duplication in **`src/` application code** is `loop-plan/references/deepen-modules.md`, not a harness audit.

### `meta-grade-rule` vs the component lens

- **`meta-grade-rule`:** Grade or improve **rules/commands** (rubric + quality standards).
- **Component lens** (`loop-check/references/component-lens.md`): score **React/shadcn-ui components** with the component rubric.


### `canvas` vs the check summary

- **`canvas`:** Standalone **visual artifact** (tables, timelines, rich layouts) as deliverable.
- **`loop-check`:** Structured **text report** (check summary) of a lap.

### External API research: `loop-plan` research vs stack plugin skills

- **[`loop-plan/references/research-api.md`](../../loop-plan/references/research-api.md):** Use for an **unfamiliar/new** vendor or API — MCP-first check, then Phase 1 schema/contract → Phase 2 sample/wire-shape discipline (the same two-phase order the retired `airtable-inspect` skill used, now generalized). Worked example: Supabase (MCP path).
- **Stack plugin skill** (`supabase`, `cloudflare`, `wrangler`, etc.): Use for **operating inside a stack you're already on** — see the Supabase/Cloudflare disambiguations below. Don't route routine stack work through the research reference.
- **A fork's own vendor-specific skill** (if one exists, e.g. a fork-added `stripe-inspect`): prefer it when it's more specific than the generic research path — don't force every integration through one skill.
- See also `.claude/rules/api-integration.md` for the globs-scoped principles this skill implements (`alwaysApply: false`).

### Supabase: `supabase` vs `supabase-postgres-best-practices` vs API research

- **`supabase`:** Product workflows, Auth, RLS correctness, CLI/MCP, migrations narrative — operating inside this fork's already-configured backend.
- **`supabase-postgres-best-practices`:** **Performance** tuning, query plans, indexing, pooling — narrow DB optimization.
- **API research** (`research-api.md`): only if researching Supabase itself as an unfamiliar vendor (rare in this repo, since it's already configured) — see § External API research above.

### Cloudflare: `cloudflare` vs `wrangler` vs `workers-best-practices`

- **`cloudflare`:** Pick **product** (Workers vs Pages vs DO vs R2…).
- **`wrangler`:** **CLI** syntax and deploy/dev workflow.
- **`workers-best-practices`:** **Code/config review** against current Workers guidance.

### Cloudflare agents: `agents-sdk` vs `building-ai-agent-on-cloudflare`

- **`agents-sdk`:** Reference-led SDK usage (state, RPC, docs fetch).
- **`building-ai-agent-on-cloudflare`:** End-to-end **generated** agent app and deployment narrative.

### `building-mcp-server-on-cloudflare` vs `agents-sdk` (MCP sections)

- **`building-mcp-server-on-cloudflare`:** **Expose** tools as remote MCP with OAuth/deploy.
- **`agents-sdk`:** **Consume** or embed MCP patterns inside Agents SDK — use when agent wiring dominates.

### `web-perf` vs `spec-optimize-performance`

- **`web-perf`:** **Browser-measured** performance (CWVs, network, traces via DevTools MCP).
- **`spec-optimize-performance`:** **Code-level** fixes — design / approach / efficiency / complexity levels (Rule of Three for extractions) and stack-native React patterns from its `rules/` folder.

**Order when both apply:** measure with **`web-perf`** if symptoms are CWV/Lighthouse → fix with **`spec-optimize-performance`**.


### `spec-reuse-package` vs precedent review vs API research

- **`spec-reuse-package`:** Should we **depend on a package** or **model a verified public implementation** instead of writing custom code for a generic subsystem? Live search; stops at a recommendation.
- **Precedent review** (`loop-plan/references/review-precedent.md`): does this **design** match **external industry / product precedent** for the capability?
- **API research** (`loop-plan/references/research-api.md`): how do we **research this vendor’s contract** (MCP → schema → sample) once we are integrating an API?

**Order when both apply:** **`spec-reuse-package` first** (may pick an SDK and skip raw API work). If still integrating a vendor API → API research. Then precedent review on the chosen approach (material design). A new package is an owner stop (`agent-behavior` § When to ask).

**Tiebreak:** User asks “which library / don’t build this ourselves” → **`spec-reuse-package`**. “Is this how products usually do it?” → precedent review. “How does this vendor’s API work?” → API research.


### Precedent review vs `spec-check-layer`

- **Precedent review:** does this design match **external industry / product precedent** for the capability?
- **`spec-check-layer`:** Does this request fit the **internal** layer beneath it (abstraction hierarchy, architecture, physics/math) — or are we about to ship a workaround?

**Order when both apply:** **`spec-check-layer` first** (one-beat check). If the structural path changes UX/API contracts, run precedent review before building.


### `meta-write-skill` vs `meta-audit-harness` vs `meta-grade-rule`

- **`meta-write-skill`:** One new/refined `.agents/skills/<name>/SKILL.md` (this repo).
- **`meta-audit-harness`:** Whole-corpus coherence audit.
- **`meta-grade-rule`:** Grade/rewrite one **rule/command** file (not skill authoring).

### `spec-simplify-flow` vs precedent review

- **Precedent review** (`loop-plan/references/review-precedent.md`): proactive **evaluation** of a plan or proposal vs industry — verdict + Pattern risk options.
- **`spec-simplify-flow`:** On-demand for an **existing** feature or flow — the simplify lens (fewer steps or code when it is overbuilt) and the align lens (should we move toward common practice, then how). Reuses `loop-plan/references/precedent-rubric.md`; does not replace the plan gate.

**Tiebreak:** novel plan or proposal → precedent review. Existing scope that is overbuilt or unlike other apps → **`spec-simplify-flow`**.

