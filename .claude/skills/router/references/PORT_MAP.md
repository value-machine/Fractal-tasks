# Port map — router

Format: [`meta-write-skill/references/port-map-format.md`](../../meta-write-skill/references/port-map-format.md). Backlog intake from the v0.42.0 router is ported in [`loop-backlog/references/PORT_MAP.md`](../../loop-backlog/references/PORT_MAP.md).

| Source (v0.42.0) | Section | Status | Where / why |
|---|---|---|---|
| `router` | ## `/router` — pick next action + skill | kept | SKILL.md § Steps |
| `router` | ### Active thread work | moved | references/loop-map.md § Where a lap stands (evidence from git, PRs, lap folders) |
| `router` | ### Thread → next skill (mid-task) | moved | references/loop-map.md § Where a lap stands |
| `router` | ## Decision model: goals + requirements → skill | dropped | Gates 1–3 replaced by the fixed loop: loop-refine always scopes, size sets plan depth (skill-loop D10, D13) |
| `router` | ### Gate 1 — Goal / outcome | moved | loop-refine (problem + success check; vision read first) |
| `router` | ### Gate 2 — Scope / requirements | moved | loop-refine (in / out, edges); layer-consistency and naming gates now fire from the architecture and code-style rules (skill-loop D56) |
| `router` | ### Gate 3 — Delivery shape (only after gates 1–2 pass) | moved | loop-refine size estimate → loop-plan depth (references/complexity-rubric.md) |
| `router` | ### Clarification-first routing (gate 1 or 2 fails) | moved | loop-refine § Steps 5–6 (ask only per the stop list) |
| `router` | ### Plan corridor flow (`grill-me` → ledger → `plan` + `plan-grill` rail) | moved | references/loop-map.md + loop-plan/references/fork-checklist.md |
| `router` | ### Matrix (compact) | dropped | Superseded by references/loop-map.md |
| `router` | ### Flowchart | moved | references/loop-map.md diagram |
| `router` | ## Skill index (situation → skill) | moved | references/catalog.md (registry) + references/loop-map.md § Outside the loop |
| `router` | ### This repo — workflow & delivery | moved | references/catalog.md + loop skills |
| `router` | ### This repo — product & codebase shape | moved | references/catalog.md + references/loop-map.md § Outside the loop |
| `router` | ### This repo — integrations | moved | loop-plan/references/research-api.md |
| `router` | ### User-level Cursor skills (`~/.cursor/skills-cursor/`) | moved | references/external-skills.md |
| `router` | ### Plugin skills (paths vary by install; discover under `~/.cursor/plugins/`) | moved | references/external-skills.md |
| `router` | ## When more than one skill seems relevant | moved | references/tiebreaks.md (pruned to skills outside the loop) |
| `router` | ### Routing state rules | moved | loop-backlog (backlog SSOT, pick-up, thread-vs-backlog → request wins, skill-loop D26) |
| `router` | ## Router references (not skills) | moved | SKILL.md § Edges + § Not for (loop-map, tiebreaks, external-skills, catalog) |
| `router` | ## Not present in this workspace | dropped | The catalog is the registry; the admission check rejects unknown skills (skill-loop D37) |
