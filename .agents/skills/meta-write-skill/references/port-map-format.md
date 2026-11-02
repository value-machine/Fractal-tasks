# Port map format (`references/PORT_MAP.md`)

Every skill whose catalog row lists v0.42.0 sources carries a port map (skill-loop D55). It accounts for each `##` / `###` section of every source skill, so nothing is lost silently while skills are merged. [`scripts/validate-skills.cjs`](../../../../scripts/validate-skills.cjs) checks it against [`router/references/baseline-sections.md`](../../router/references/baseline-sections.md).

```markdown
# Port map — <name>

| Source (v0.42.0) | Section | Status | Where / why |
|---|---|---|---|
| `grill-me` | ## Non-goals are first-class | kept | SKILL.md § Steps 3 |
| `grill-me` | ## Codebase grounding (mandatory, scoped) | moved | references/grounding.md |
| `feature` | ### 1.1 Branch & Workflow Check | dropped | loop-ship owns branch mode (skill-loop D34) |
```

- **Section:** the heading text as it appears in the baseline snapshot. Matching ignores `#`, `§` and backticks, and is case-insensitive.
- **Status:** `kept` (in this SKILL.md), `moved` (to a reference, another skill or a rule; say where), or `dropped` (say why; required).
- **Coverage:** a source replaced by several skills (for example `feature` → `loop-refine` + `loop-plan`) is covered by the union of their port maps. The check enforces full coverage once every replacing skill is `built`.
- **Behavior:** a port map shows the text survived. The evals (baseline = the v0.42.0 skill) show the behavior survived (skill-loop D59).
