# Port map — loop-refine

Format: [`meta-write-skill/references/port-map-format.md`](../../meta-write-skill/references/port-map-format.md). `feature` is shared with `loop-plan` (Phase 3–4 rows live in [`loop-plan/references/PORT_MAP.md`](../../loop-plan/references/PORT_MAP.md)).

| Source (v0.42.0) | Section | Status | Where / why |
|---|---|---|---|
| `grill-me` | ## What this skill owns (SSOT) | moved | SKILL.md purpose + Edges; the ledger moved to references/decisions-template.md |
| `grill-me` | ## Codebase grounding (mandatory, scoped) | moved | references/grounding.md |
| `grill-me` | ## Interrogation priority (edges before interior) | moved | references/grounding.md |
| `grill-me` | ### Ride vs new (default-greenfield check) | moved | references/grounding.md (asks only on a true tie) |
| `grill-me` | ## Non-goals are first-class | moved | references/grounding.md; brief-template § Out of scope |
| `grill-me` | ## Roles | moved | references/grounding.md § Roles |
| `grill-me` | ## Question style | moved | references/asking.md (shared by all loop skills) |
| `grill-me` | ### Turn contract (mandatory — no exceptions) | moved | references/asking.md |
| `grill-me` | ### Question shape (pick one per question) | moved | references/asking.md |
| `grill-me` | ### Challenge option (always present) | moved | references/asking.md |
| `grill-me` | ### Boundary-question template (required) | moved | references/asking.md |
| `grill-me` | ### Anti-patterns (do not ship questions like these) | moved | references/asking.md |
| `grill-me` | ## Recommendation timing | dropped | No closing recommendation to the owner: the brief goes straight to loop-plan (skill-loop D19); the restatement line replaces the summary |
| `grill-me` | ## Ending the grill | kept | SKILL.md § Steps 8 + § Output (restatement line); brief-template |
| `grill-me` | ## Handoffs | kept | SKILL.md § Edges + § Not for |
| `feature` | ## Phase 1: Pre-Development Analysis | moved | references/requirements.md |
| `feature` | ### 1.0 App vision (product SSOT) | kept | SKILL.md § Steps 2 (`vision-deferred` instead of a stop) |
| `feature` | ### 1.1 Branch & Workflow Check | moved | loop-ship (branch mode, skill-loop D34) |
| `feature` | ### 1.2 Rule Decision Tree | moved | loop-plan/references/rules-registry.md + plan conflict & compliance |
| `feature` | ### 1.3 Risk & Impact Assessment | moved | references/requirements.md § Risk and impact |
| `feature` | ## Phase 2: Requirements & Design | moved | references/requirements.md |
| `feature` | ### 2.0 Ambiguity Elimination Gate | kept | SKILL.md § Steps 5–6; mandatory stops replaced by the agent-behavior stop list (skill-loop D6) |
| `feature` | ### 2.1 User Stories | moved | references/requirements.md § User stories |
| `feature` | ### 2.1.1 User Journey & State Transition Mapping (MANDATORY) | moved | references/requirements.md § User journey (mandatory at size M when roles/journeys span, skill-loop D18) |
| `feature` | ### 2.2 Existing Functionality Search | moved | references/requirements.md § Existing functionality first |
| `feature` | ### 2.3 Required Information Gathering | moved | references/requirements.md § Information still missing |
| `feature` | ### 2.5 Decision Point Matrix | moved | references/requirements.md § Objective vs subjective |
| `feature` | ## Key Principles | moved | Simplify-first → debugging rule § Reductive strategy; reuse → references/requirements.md; ask-only-subjective → agent-behavior § When to ask |
| `feature` | ## Problem This Strategy Alleviates | dropped | Rationale for the mandatory stops, which skill-loop D6/D8 removed |
| `feature` | ## Decision Point Enforcement | dropped | 🔴 stops replaced by the agent-behavior stop list (skill-loop D6); ledger rows → references/decisions-template.md |
| `feature` | ## Boundaries | kept | SKILL.md § Not for |
