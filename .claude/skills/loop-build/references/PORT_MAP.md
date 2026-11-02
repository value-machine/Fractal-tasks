# Port map — loop-build

Format: [`meta-write-skill/references/port-map-format.md`](../../meta-write-skill/references/port-map-format.md). `quick-piv` is shared with `loop-plan`.

| Source (v0.42.0) | Section | Status | Where / why |
|---|---|---|---|
| `implement` | ## Input | moved | router locates the lap; SKILL.md § Edges In |
| `implement` | ## Flow | kept | SKILL.md § Steps |
| `implement` | ### 0. Branch gate | kept | SKILL.md § Steps 1 (lap branch, protected files) |
| `implement` | ### 1. Load plan | kept | SKILL.md § Steps 1; plan-review / validate pending stops dropped (no owner plan gates, skill-loop D2/D23) |
| `implement` | ### 2. Per phase: execute | kept | SKILL.md § Steps 2 |
| `implement` | ### 3. Gate | kept | SKILL.md § Steps 2.2 + § Steps 5 (staged-test infra) |
| `implement` | ### 4. Next phase | kept | SKILL.md § Steps 2 (in order) + 7 |
| `implement` | ## Rules reference (follow while coding) | moved | loop-plan/references/rules-registry.md (linked in Edges In) |
| `implement` | ## Notes during development | kept | SKILL.md § Steps 2.3 (incl. mistake signals for meta lessons) |
| `implement` | ## Decisions made | kept | SKILL.md § Steps 2.3 + 4; "stop and ask" replaced by the agent-behavior stop list (skill-loop D6) |
| `implement` | ## Unexpected obstacles | kept | SKILL.md § Steps 3–4 (overrun skill-loop D51; patch-on-top stop) |
| `implement` | ## Documentation | kept | SKILL.md § Steps 6 (fold decisions; ARCHITECTURE.md) |
| `implement` | ## Checklist per phase | kept | SKILL.md § Steps 2.3 |
| `implement` | ## Completion | kept | SKILL.md § Steps 7 + § Output; validate/finish offers replaced by the autonomous hand-off (skill-loop D2) |
| `implement` | ## Boundaries | kept | SKILL.md § Not for |
| `quick-piv` | ## Implement | kept | SKILL.md § Steps 2 (same flow for XS/S plans in BRIEF.md) |
| `quick-piv` | ## Validate (quick pass — not the `validate` skill) | moved | loop-check (one check path for every size; phase gates cite the tooling list) |
| `quick-piv` | ## Boundaries | kept | SKILL.md § Not for |
