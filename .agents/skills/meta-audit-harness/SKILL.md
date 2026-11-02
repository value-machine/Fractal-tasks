---
name: meta-audit-harness
description: >-
  One harness audit with two lenses — coherence (SSOT, conflicts, overlap, handoffs, catalog
  drift, orphans, port maps) and context cost (what loads when, cut / merge / relocate / enforce
  with a ledger) — over AGENTS.md, CLAUDE.md, rules, skills, INDEX, the layers doc and subagent
  briefs. Runs harness_scan for facts, parallel read-only lenses, a tiered issue table, an owner
  gate and a no-information-loss pass. Use when the harness drifts, after an intake or a skill
  rename, for a periodic health check, or when the owner says "align the harness", "audit the
  rules", "tighten", "slim", "prune", "de-bloat", "token-optimize" or asks why the context fills
  up before work starts. Not for external drops (use meta-intake-harness), one skill (use
  meta-write-skill) or app code (loop-plan deepen-modules).
---

# meta-audit-harness

When this skill is done, the harness is one coherent system that costs no more context than its behavior needs: each instruction has one home, nothing contradicts, every skill is routed once, and every removed line is accounted for in a ledger.

## Edges

| Field | Value |
|---|---|
| In | `AGENTS.md`, `CLAUDE.md`, `.claude/rules/*`, `.agents/skills/**` (incl. port maps), `documentation/DOC_RULES_INDEX.md`, `documentation/DOC_AGENT_WORKFLOW_LAYERS.md`, `documentation/jobs/harness/entry-points.yaml` |
| Out | Issue table and ledger under `documentation/jobs/harness/`; approved edits to the harness corpus |
| Calls | coherence lens → [`references/coherence-audit.md`](references/coherence-audit.md) (scan: `.agents/skills/meta-audit-harness/scripts/harness_scan.cjs`) · context-cost lens → [`references/context-cost.md`](references/context-cost.md) · if one rule file needs grading or a rewrite → [`meta-grade-rule`](../meta-grade-rule/SKILL.md) · if a landed change needs a fork porting note → [`meta-write-adoption-guide`](../meta-write-adoption-guide/SKILL.md) |
| Called by | [`meta-write-skill`](../meta-write-skill/SKILL.md) (spine change), [`meta-intake-harness`](../meta-intake-harness/SKILL.md) (after apply), [`meta-learn-lessons`](../meta-learn-lessons/SKILL.md) (structural conflict) · owner |
| Next | Back to the caller; a large restructure becomes a backlog task (`loop-backlog`) |
| Owner stops | The issue-table gate (no edit before the owner picks rows); protected paths (`agent-behavior` rule § Protected Files) |

## Steps

1. **Pick the lenses:** coherence for drift, conflicts or after an intake; context cost for "too long" or a full context; both for a health check. `--quick` runs the scan plus the conflict, handoff and catalog lenses.
2. **Scan facts:** `node .agents/skills/meta-audit-harness/scripts/harness_scan.cjs` (always-on bytes, missing refs, orphans, frontmatter). Budget findings are advisory, never blocking.
3. **Run the lenses read-only**, in parallel subagents per [`references/subagent-briefs.md`](references/subagent-briefs.md). The coherence lens also checks every port map against `router/references/baseline-sections.md` (skill-loop D55). The context-cost lens maps load tiers and tests each instruction (inferable, stated elsewhere, enforced, enforceable, procedure, verbose) and protects scar tissue and consent gates.
4. **Synthesize one table:** `# | tier | domain | where | issue | why | resolution | SSOT owner`, plus the savings table for cost findings. Blocking = broken spine or contradiction; advisory = budget, wording.
5. **Gate:** show the table and ask which rows to apply ([`loop-refine/references/asking.md`](../loop-refine/references/asking.md)). Many files or a structural move → a backlog task for the loop instead of ad-hoc edits.
6. **Apply approved rows** one at a time; supersede, don't silently delete. Rule descriptions: YAML first, then the `AGENTS.md` catalog.
7. **No-information-loss pass:** every removed or moved instruction has a ledger row (`MISSING` = 0). Reconcile the router, catalog and `loop-map.md`, then run `pnpm validate:skills`, `pnpm validate:docs`, `pnpm test:classify`.

## Examples

**Example 1 — after a rename**
Input: `meta-write-skill` renamed three skills.
Output: scan finds two stale links and one orphan; table of 3 blocking rows; owner approves; links fixed; ledger empty of losses.

**Example 2 — context cost**
Input: "Why is my context half full before I type anything?"
Output: always-loaded total 9.1k → 6.4k tokens; ledger rows (relocated a procedure from a rule to a skill reference, shrunk an enforced lint rule to its command); one scar-tissue rule flagged for the owner.

## Output

```text
Audit: lenses <coherence|cost|both> · blocking <n> · advisory <n> · applied <rows> · always-loaded <before → after> · ledger MISSING 0
```

## Not for

| Case | Use |
|---|---|
| External content in `.agents/harness-inbox/` | [`meta-intake-harness`](../meta-intake-harness/SKILL.md) |
| Authoring or changing one skill | [`meta-write-skill`](../meta-write-skill/SKILL.md) |
| A lesson from one session | [`meta-learn-lessons`](../meta-learn-lessons/SKILL.md) |
| Duplication in `src/` | [`loop-plan/references/deepen-modules.md`](../loop-plan/references/deepen-modules.md) |
