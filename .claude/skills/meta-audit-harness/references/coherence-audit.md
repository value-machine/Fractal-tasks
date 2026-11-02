# Coherence audit — scan, lenses, gate, no-loss

Read by [`meta-audit-harness`](../SKILL.md) for the coherence lens. Ported from `align-harness` (v0.42.0).


## Config

```text
SUBAGENT_MODEL=composer-2.5
```

Every **Task** subagent uses `model` = slug above. Subagents are **self-contained** — they do not see this chat. Briefs: [`references/subagent-briefs.md`](subagent-briefs.md).

## Purpose

Keep the **agent harness** one coherent system: SSOT enforced, no conflicting instructions, no silent context bloat. Evolves the former `improve-skill-library` scope to the full harness (harness-skills D2).

## Scope

| Set | Paths | Treatment |
|-----|-------|-----------|
| **Harness corpus** | `AGENTS.md`, `.claude/rules/*`, `documentation/DOC_RULES_INDEX.md`, `.agents/skills/**`, `ARCHITECTURE.md`, `documentation/DOC_AGENT_WORKFLOW_LAYERS.md`, subagent brief files | Audited; edited after gate |
| **Routing spine** | `router/SKILL.md`, `DOC_AGENT_WORKFLOW_LAYERS.md`, `loop-map.md` | Audited; updated when harness routing changes |
| **Artifacts** | `documentation/jobs/harness/` (registry, ledger, scan manifest) | Persist audit outputs |
| **Reference-only** | User/plugin skills outside repo | Read for overlap; never edited |

Domain lenses: [`references/domain-*.md`]().

## What this is NOT

| Sibling | Use when |
|---------|----------|
| [`meta-intake-harness`](../../meta-intake-harness/SKILL.md) | Dropping **external** content into `.agents/harness-inbox/` |
| [`meta-write-skill`](../../meta-write-skill/SKILL.md) | Authoring **one** new skill |
| [`meta-grade-rule`](../../meta-grade-rule/SKILL.md) | Grading **one** rule/command file |
| The context-cost lens ([`context-cost.md`](context-cost.md)) | Cutting harness **context cost** (prune, merge, relocate) without behavior change |
| [`meta-learn-lessons`](../../meta-learn-lessons/SKILL.md) | Capturing a **lesson** from a session |
| [`spec-simplify-flow`](../../spec-simplify-flow/SKILL.md) | Product vs repo standards decision |
| [`loop-plan → deepen-modules`](../../loop-plan/references/deepen-modules.md) | `src/` application code duplication |
| [`loop-check`](../../loop-check/SKILL.md) | Plan/impl **compliance** audit |

## Triggers

- "Align the harness", "audit agent instructions", "SSOT drift", "rules vs AGENTS conflict"
- After `meta-intake-harness` apply or large harness edit
- Periodic health check; before claiming harness work "done"
- Foreign-skill alarm (lens 7) → hand off intake to `meta-intake-harness`

## Modes

| Mode | When | Lenses |
|------|------|--------|
| **`--full`** (default first run) | Initial audit or major migration | `harness_scan` + Phase 0 ledger + lenses 1–8 |
| **`--quick`** | Periodic check | `harness_scan` + lenses 3, 4, 6 |

## Workflow

```
HARNESS_SCAN -> PHASE 0 LEDGER -> PARALLEL LENSES -> SYNTHESIS -> GATE -> EXECUTE -> NO-LOSS -> RECONCILE
```

### Step 0 — Deterministic facts (`harness_scan`)

```bash
node .agents/skills/meta-audit-harness/scripts/harness_scan.cjs
```

Manifest SSOT: `documentation/jobs/harness/entry-points.yaml`. Record facts (always-on bytes/lines, missing refs, orphans, frontmatter). **Advisory** over budget — never hard-block (harness-skills D12).

### Phase 0 — Registry + content ledger

Same as former skill-library Phase 0, persisted under `documentation/jobs/harness/`. Include harness domains beyond skills (rules catalog rows, `AGENTS.md` units).

**Diagram need-check:** `router/references/loop-map.md` — verdict in notes.

### Phase 1 — Parallel lens subagents (read-only)

Launch in parallel per [`references/subagent-briefs.md`](subagent-briefs.md):

| # | Lens | Domain doc |
|---|------|------------|
| 1 | Separation / overlap | `domain-skills.md` |
| 2 | SSOT / duplication | all domains |
| 3 | Conflicts | skills + rules |
| 4 | Composition / handoffs | skills |
| 5 | Quality / trigger clarity | skills |
| 6 | Catalog drift (`AGENTS.md` ↔ `.claude/rules`) | `domain-agents-md.md`, `domain-rules.md` |
| 7 | Foreign / orphan content | `foreign-content.md` |
| 8 | Loadability / context budget | `domain-rules.md`, `domain-agents-md.md` |

`--quick` skips 1, 2, 5, 7 unless user asks.

### Phase 2 — Synthesis → issue table

Merge lens + scan outputs. Format:

`# | tier | domain | where | issue | why | resolution | SSOT owner`

- **blocking** — broken spine, contradictory commit/push, missing router entry
- **advisory** — budget, cosmetic duplication, nice-to-have wording

≥2 lenses on same item → prioritize. Budget findings always **advisory**.

### Phase 3 — Decision gate

**Do not edit before approval.** User picks rows. Structural SSOT moves or many files → stop, run [`loop-plan`](../../loop-plan/SKILL.md).

### Phase 4 — Execute (approved only)

One row at a time. **Supersede** don't silently delete. Protected paths need harness-skills D18 scope or explicit OK.

### Phase 5 — No-information-loss pass

Same contract as former `improve-skill-library` — `MISSING` must be 0.

### Phase 6 — Reconcile

Router lists each harness skill once; registry updated; `loop-map.md` if stale.

## Escalation

- Phase 7 cap (≤5 blocking rows) exceeded → `documentation/jobs/temp_job_harness-fixes/`
- Big-bang restructure of always-on rules → separate plan (harness-skills D12)

## Related

- [`meta-intake-harness`](../../meta-intake-harness/SKILL.md) — external intake
- [`meta-learn-lessons`](../../meta-learn-lessons/SKILL.md) — session lessons; structural conflicts → here
- [`router`](../../router/SKILL.md) — routing SSOT
- [`DOC_AGENT_WORKFLOW_LAYERS.md`](../../../../documentation/DOC_AGENT_WORKFLOW_LAYERS.md)
- [`references/subagent-briefs.md`](subagent-briefs.md)
