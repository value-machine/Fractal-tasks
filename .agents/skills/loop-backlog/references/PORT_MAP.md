# Port map — loop-backlog

Format: [`meta-write-skill/references/port-map-format.md`](../../meta-write-skill/references/port-map-format.md). Base: TMI-apps/MILA `backlog-management` (not a v0.42.0 skill; its generic core is SKILL.md, its signal steps are references/signal-adapter.md, skill-loop D15). The v0.42.0 `router` headings are mapped in [`router/references/PORT_MAP.md`](../../router/references/PORT_MAP.md).

| Source (v0.42.0) | Section | Status | Where / why |
|---|---|---|---|
| `start` | ## Core behavior | moved | references/onboarding.md |
| `start` | ## Template repo vs fork (read first) | moved | references/onboarding.md |
| `start` | ## Dev task backlog (onboarding SSOT) | kept | SKILL.md § Steps 4 (seeded tasks rank first, skill-loop D41) + references/onboarding.md |
| `start` | ## Flow (README-aligned) | moved | references/onboarding.md |
| `start` | ### 1) Prerequisites gate | moved | references/onboarding.md |
| `start` | ### 2) App vision & goals gate (mandatory before fork/clone and setup) | moved | references/onboarding.md |
| `start` | ### 3) Line endings gate (mandatory on Windows too) | dropped | the repo forces LF itself (`.gitattributes` `eol=lf`, `.editorconfig`, Prettier `endOfLine`); nothing for the owner to configure |
| `start` | ### 4) Fork + clone gate | moved | references/onboarding.md |
| `start` | ### 5) Branch workflow gate | moved | references/onboarding.md |
| `start` | ### 6) Dev server gate | moved | references/onboarding.md § App runs gate (merged with the route check) |
| `start` | ### 7) Configuration tasks gate (work through backlog) | moved | references/onboarding.md |
| `start` | ### 8) Route verification gate | moved | references/onboarding.md § App runs gate |
| `start` | ### 9) Physical device testing (optional) | moved | references/onboarding.md § Configuration tasks gate (one pointer line) |
| `start` | ## Mandatory verification checklist ("test for everything") | moved | references/onboarding.md |
| `start` | ## Communication rules during start | moved | references/onboarding.md § Communication rules during onboarding |
| `start` | ## Completion criteria | moved | references/onboarding.md |
| `start` | ## Boundaries | kept | SKILL.md § Not for |
| `finish` | ### Onboarding task sync (when applicable) | kept | SKILL.md § Steps 6 (archive a seeded task when its check passes) |
