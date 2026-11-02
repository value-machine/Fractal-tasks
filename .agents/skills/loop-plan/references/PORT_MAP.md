# Port map — loop-plan

Format: [`meta-write-skill/references/port-map-format.md`](../../meta-write-skill/references/port-map-format.md). Shared sources: `feature` (with `loop-refine`), `quick-piv` (with `loop-build`), `validate` (with `loop-check`). `optimize2` design levels arrive with `spec-optimize-performance` in batch 3.

| Source (v0.42.0) | Section | Status | Where / why |
|---|---|---|---|
| `plan` | ## Flow | kept | SKILL.md § Steps |
| `plan` | ### 0. Branch gate | moved | loop-refine § Steps 1 (lap branch per git-workflow gate) |
| `plan` | ### 1. Input | kept | SKILL.md § Edges In (BRIEF.md replaces free-form input) |
| `plan` | ### 2. Refine (if needed) | moved | loop-refine (product scope) + references/fork-checklist.md; gate-2 typed requirements → loop-refine/references/requirements.md |
| `plan` | ### 3. Investigate | kept | SKILL.md § Steps 2–4 (reuse, decomposition, foundation, POC) |
| `plan` | ### 4. Create plan | kept | SKILL.md § Steps 5–7 + references/plan-template.md |
| `plan` | ### 5. Pattern & precedent | moved | references/review-precedent.md (any size, material design — skill-loop D56; agent picks, skill-loop D2) |
| `plan` | ### 6. Plan review gate | moved | references/plan-review.md (M only, merged — skill-loop D23) |
| `plan` | ### 7. Present and iterate | dropped | No owner sign-off of the plan (skill-loop D2); the footer replaces Present |
| `plan` | ## Output location | kept | SKILL.md § Edges Out |
| `plan` | ## Plan document structure | moved | references/plan-template.md |
| `plan` | ### Mandatory sections (always include) | moved | references/plan-template.md skeleton |
| `plan` | ### Per phase (repeat for each phase) | moved | references/plan-template.md § Per phase |
| `plan` | ### Optional sections (include when relevant) | moved | references/plan-template.md § Per phase |
| `plan` | ## Rules reference (research before writing steps) | moved | references/rules-registry.md |
| `plan` | ## Conflict & compliance checklist | kept | SKILL.md § Steps 6; template § Conflict & compliance |
| `plan` | ## Gate examples | moved | references/plan-template.md § Gate examples |
| `plan` | ### Frontend (this stack: Vite + React + Tailwind/shadcn-ui) | moved | references/plan-template.md § Gate examples |
| `plan` | ### Backend / Supabase | moved | references/plan-template.md § Gate examples |
| `plan` | ### Repo quality | moved | references/plan-template.md § Gate examples |
| `plan` | ## Notes during development (mandatory empty section) | moved | references/plan-template.md; filled by loop-build |
| `plan` | ## Decisions made (mandatory empty section) | moved | references/plan-template.md; filled by loop-build |
| `plan` | ## Example phase overview table | moved | references/plan-template.md § Example phase overview |
| `plan` | ## Key principles | kept | SKILL.md purpose + Steps; "ask on ambiguity / diversions" now per agent-behavior stop list |
| `plan` | ## Boundaries | kept | SKILL.md § Not for |
| `feature` | ### 2.4 Concrete Implementation Approaches (Progressive Complexity) | moved | references/fork-checklist.md (enumerate ≥ 2 options; agent picks clear winners, asks only true ties) |
| `feature` | ## Phase 3: Architecture & Structure Planning | kept | SKILL.md § Steps 2 + 6 |
| `feature` | ### 3.1 Architecture Planning | kept | SKILL.md § Steps 2 (decomposition) + 6 (layers, placement) |
| `feature` | ### 3.1a Don't reinvent the wheel (proactive — when applicable) | kept | SKILL.md § Edges Calls (fired by architecture rule) |
| `feature` | ### 3.1b Pattern & industry precedent (proactive — when applicable) | moved | references/review-precedent.md |
| `feature` | ### 3.2 Cloud Functions Planning (if backend needed) | kept | SKILL.md § Steps 6 (cloud-functions rule via rules-registry) |
| `feature` | ### 3.3 Database Planning (if database changes needed) | kept | SKILL.md § Steps 6; data / irreversible shapes are a stop-list item |
| `feature` | ### 3.4 Security Planning | kept | SKILL.md § Steps 6 (security + project-specific rules) |
| `feature` | ### 3.5 File Placement Validation | kept | SKILL.md § Steps 6 |
| `feature` | ### 3.6 Complexity Projection | moved | code-style rule § Complexity + references/deepen-modules.md; no owner stop (skill-loop D2) |
| `feature` | ### 3.7 Integration Points Analysis | moved | loop-refine brief § Edges + SKILL.md § Steps 2 |
| `feature` | ### 3.8 Standards Divergence Check | moved | references/review-precedent.md + plan-template § Conflict & compliance (agent decides, skill-loop D63 pattern) |
| `feature` | ## Phase 4: Implementation Plan | moved | references/plan-template.md (phases, steps, gates) |
| `feature` | ### 4.1 Component/API Design | moved | references/plan-template.md § Per phase + loop-check component lens |
| `feature` | ### 4.2 State & Data Flow | moved | references/plan-template.md § Per phase (DOC_TANSTACK_QUERY in Edges In) |
| `feature` | ### 4.3 UI/UX Considerations | moved | loop-refine/references/requirements.md § Typed requirements (UI component) |
| `feature` | ### 4.4 Accessibility Planning | moved | loop-refine/references/requirements.md § User stories (accessibility acceptance) + loop-check component lens |
| `feature` | ### 4.5 Technical Considerations | moved | SKILL.md § Steps 6 (Conflict & compliance) |
| `feature` | ### 4.6 Validation & Testing Plan | kept | SKILL.md § Steps 5 (acceptance test first, skill-loop D49) |
| `feature` | ### 4.7 Architecture Compliance Check (Plan Validation) | moved | references/plan-review.md (rule-compliance lenses) |
| `feature` | ## Handoff to engineering delivery (after Phase 4) | dropped | One corridor: loop-refine → loop-plan → loop-build (skill-loop D8) |
| `plan-grill` | ## What this skill owns (SSOT) | moved | references/fork-checklist.md |
| `plan-grill` | ### Two decision stores (do not conflate) | moved | loop-refine/references/decisions-template.md (lap ledger vs plan Decisions made; durable homes skill-loop D48) |
| `plan-grill` | ## When a grill question is needed (explicit triggers) | moved | references/fork-checklist.md § When a fork exists |
| `plan-grill` | ### Generality (composition vs rewirable) | moved | references/fork-checklist.md § Generality |
| `plan-grill` | ### Mandatory fork checklist (before locking) | moved | references/fork-checklist.md |
| `plan-grill` | ## Ledger — `DECISIONS.md` | moved | loop-refine/references/decisions-template.md |
| `plan-grill` | ## Continuous rail (call sites) | kept | SKILL.md § Steps 3 (checklist before every product/scope/boundary write) |
| `plan-grill` | ## Ask vs log | moved | references/fork-checklist.md § Ask vs log |
| `plan-grill` | ## Flow | moved | references/fork-checklist.md |
| `plan-grill` | ## Handoffs | kept | SKILL.md § Edges Calls |
| `plan-grill-auto` | ## User contract (verbatim) | moved | agent-behavior rule § When to ask (away switch, skill-loop D46) |
| `plan-grill-auto` | ## What this skill owns (SSOT) | dropped | Skill deleted (skill-loop D24); behavior is the away switch in agent-behavior |
| `plan-grill-auto` | ## Triggers | moved | agent-behavior rule § When to ask (away switch phrases) |
| `plan-grill-auto` | ## Communication | moved | references/fork-checklist.md § Tie resolution (progress line) |
| `plan-grill-auto` | ## Flow | dropped | The autonomous corridor is the default loop (skill-loop D2); no Present wait exists to skip |
| `plan-grill-auto` | ### Ask vs log (overrides `plan-grill`) | moved | references/fork-checklist.md § Ask vs log (away-switch column) |
| `plan-grill-auto` | ### Tie resolution (apply in order; stop at first that decides) | moved | references/fork-checklist.md § Tie resolution |
| `plan-grill-auto` | ## Ledger | moved | loop-refine/references/decisions-template.md (`agent-pick`) |
| `plan-grill-auto` | ## Handoffs | dropped | Superseded by the loop map (router) |
| `quick-piv` | ## When to use | kept | SKILL.md § Steps 1 (XS/S depth replaces the separate skill) |
| `quick-piv` | ## Branch gate | moved | loop-refine § Steps 1 |
| `quick-piv` | ## Hard stops (M/L and gates) | moved | references/complexity-rubric.md (size sets depth; removals → references/remove-feature.md) |
| `quick-piv` | ## Context detection (first step) | moved | router (locates the lap) |
| `quick-piv` | ### Branch A: Active plan exists | moved | router + loop-build (resume the next phase) |
| `quick-piv` | ### Branch B: No active plan | kept | SKILL.md § Steps 6 (XS/S plan in BRIEF.md) |
| `quick-piv` | ## Quick plan (always) | kept | SKILL.md § Steps 6 + § Output footer |
| `quick-piv` | ## Rules reference (follow during implementation) | moved | references/rules-registry.md |
| `quick-piv` | ## Summary flow | dropped | Superseded by the loop map (router) |
| `review-dev-plan` | ## Config | dropped | Cursor-specific subagent model slug; subagents use the session default |
| `review-dev-plan` | ## Which plan? | moved | router (locates the lap) |
| `review-dev-plan` | ## Run: seven parallel Task agents (one turn) | moved | references/plan-review.md § Fan-out |
| `review-dev-plan` | ### Naming generality (fixed lens) | moved | references/plan-review.md § Fan-out lens 1 |
| `review-dev-plan` | ### Grade against the contract | moved | references/plan-review.md § Grade against the contract |
| `review-dev-plan` | ## After | moved | references/plan-review.md § Apply (agent applies contract must-fixes, skill-loop D2) |
| `review-dev-plan` | ## Boundaries | moved | references/plan-review.md (merged with validate plan-review, skill-loop D23) |
| `review-dev-plan` | ## Related | dropped | Links to deleted skills |
| `validate` | ## Mode auto-selection | moved | plan-review mode → references/plan-review.md; impl modes → loop-check |
| `api-integrate` | ## Security (both phases) | moved | references/research-api.md |
| `api-integrate` | ## Phase 0 — Locate | moved | references/research-api.md |
| `api-integrate` | ### MCP fallback decision tree | moved | references/research-api.md |
| `api-integrate` | ## Phase 1 — Schema / contract (what exists) | moved | references/research-api.md |
| `api-integrate` | ### Output template | moved | references/research-api.md |
| `api-integrate` | ## Phase 2 — Sample / wire shape (what values look like) | moved | references/research-api.md |
| `api-integrate` | ## Worked examples | moved | references/research-api.md + references/vendor-supabase.md |
| `api-integrate` | ## Related | moved | references/research-api.md intro (api-integration rule, dont-reinvent-the-wheel) |
| `pattern-review` | ## Proactive obligation (agents) | moved | architecture rule § Pattern risk (trigger, skill-loop D56) + references/review-precedent.md |
| `pattern-review` | ## What this is NOT | moved | references/review-precedent.md intro |
| `pattern-review` | ## Where everything lives | moved | references/precedent-rubric.md + precedent-alert.md + plan-template § Pattern & precedent |
| `pattern-review` | ## When to run | moved | references/review-precedent.md intro (any size, material design) |
| `pattern-review` | ## Procedure | moved | references/review-precedent.md § Procedure (agent picks non-standard options) |
| `pattern-review` | ## Modes | moved | references/review-precedent.md § Modes |
| `pattern-review` | ### `scan` (default) | moved | references/review-precedent.md § Modes |
| `pattern-review` | ### `plan-section` | moved | references/review-precedent.md § Modes |
| `pattern-review` | ### `lite` | moved | references/review-precedent.md § Modes |
| `pattern-review` | ## Integration | dropped | Callers collapsed into loop-plan + plan-review |
| `pattern-review` | ## Output (chat) | moved | references/review-precedent.md § Output |
| `pattern-review` | ## Related | dropped | Links to deleted skills |
| `purge-skill` | ## Why this exists | moved | references/remove-feature.md |
| `purge-skill` | ## Phase 0 — Resolve the target | moved | references/remove-feature.md |
| `purge-skill` | ## Phase 1 — Map every reference | moved | references/remove-feature.md + scripts/reference_scan.py + removal-assets.md |
| `purge-skill` | ## Phase 2 — Classify every hit | moved | references/remove-feature.md |
| `purge-skill` | ## Phase 3 — Present the removal plan | moved | references/remove-feature.md § Phase 3 (written into the plan; owner only for stop-list items) |
| `purge-skill` | ## Phase 4 — Execute | moved | references/remove-feature.md § Phase 4 (run by loop-build) |
| `purge-skill` | ## Phase 5 — Final report | moved | references/remove-feature.md § Phase 5 (check summary) |
| `purge-skill` | ## What this is NOT | moved | references/remove-feature.md intro |
| `consolidate` | ## Purpose | moved | references/deepen-modules.md intro |
| `consolidate` | ## Modes | moved | references/deepen-modules.md § 2 + semantic-placement.md |
| `consolidate` | ## Triggers | moved | SKILL.md § Edges Calls (touched modules unclean) |
| `consolidate` | ## Core Principles | moved | references/deepen-modules.md § 4 |
| `consolidate` | ### Rule of Three (pointer) | moved | code-style rule § Naming F2 |
| `consolidate` | ### Consolidation != Abstraction | moved | references/deepen-modules.md § 4 (lowest-cost form) |
| `consolidate` | ### Warrant SSOT | moved | references/warrant-rubric.md |
| `consolidate` | ### Indirection Budget | moved | references/deepen-modules.md § 2 (traceability ≤ 5 files) + warrant-rubric hard gates |
| `consolidate` | ## Required Input — Target | moved | references/deepen-modules.md § 1 (focus = the brief's edges) |
| `consolidate` | ## Workflow | moved | references/deepen-modules.md §§ 1–5 |
| `consolidate` | ### Phase 1: Discovery | moved | references/deepen-modules.md § 2 |
| `consolidate` | ### Phase 2: Classification | moved | references/deepen-modules.md § 3 |
| `consolidate` | ### Phase 3: Analysis | moved | references/deepen-modules.md § 4 |
| `consolidate` | ### Phase 4: Prioritization | moved | references/deepen-modules.md § 4 + warrant-rubric.md |
| `consolidate` | ### Phase 5: Present Findings | dropped | No owner audit report; accepted candidates go straight into the plan (skill-loop D21) |
| `consolidate` | ### Phase 6: Execute | moved | references/deepen-modules.md § 5 (plan steps run by loop-build) |
| `consolidate` | ## Scoping Options | moved | references/deepen-modules.md § 1 (focus + sweep; out-of-focus → backlog task) |
| `consolidate` | ## Symbiotic Relationships | dropped | Sibling skills merged into the loop (skill-loop D35) |
| `consolidate` | ## Anti-Patterns | moved | references/deepen-modules.md § 7 |
| `consolidate` | ## Boundaries | moved | references/deepen-modules.md intro |
| `modularity-review` | ## Do | moved | references/deepen-modules.md § 6 Replaceability |
| `modularity-review` | ## Do not | moved | references/deepen-modules.md § 6 Replaceability |
| `modularity-review` | ## Tiebreak | dropped | Neighbors merged into loop-plan |
| `modularity-review` | ## Output | moved | references/deepen-modules.md § 6 (two tables, no composite) + modularity-scores.md |
