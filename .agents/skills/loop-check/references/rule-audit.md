# Rule audit — modes, subagent contract, tooling pass

How [`loop-check`](../SKILL.md) audits a built change, and how [`loop-plan/references/plan-review.md`](../../loop-plan/references/plan-review.md) audits a plan. Ported from `validate` (v0.42.0). One read-only subagent per relevant rule in `.claude/rules/`, plus the tooling pass and a plan-compliance pass. Registry: [`loop-plan/references/rules-registry.md`](../../loop-plan/references/rules-registry.md).

## Modes

| Mode | When | Rule subagents | Tooling | Plan-compliance |
|---|---|---|---|---|
| **plan-review** | Size-M plan before building | Every rule plausibly relevant to the plan, always `code-style` | no | no |
| **impl** | A lap with a plan (`BRIEF.md` § Plan or `DEVELOPMENT_PLAN.md`) | Every rule plausibly relevant to the diff, always `code-style` | yes | yes |
| **gate** | A diff with no governing plan (owner-direct check, skill-loop D57) | `architecture` (incl. feature granularity), `file-placement`, `code-style`; plus `security`, `database`, `testing` when touched | yes | no |

Err toward inclusion — `applicable: false` is cheap. Fan-out runs on every invocation. State the mode in the summary's first line.

**Scope:** plan path (plan-review); the lap branch diff against its base (`git diff --name-only <base>...HEAD`) otherwise.

## Grading basis (contract vs drift vs advisory)

When the governing plan has a **Review contract** (plan review, impl), the contract is the bar the assignee was given:

| Basis | When | Max severity |
|-------|------|--------------|
| `contract` | Rule is pinned in the contract and the finding holds under the **pinned** text (`git show <pin>:<rule path>`) | Blocker |
| `drift` | Finding holds only under rule text changed after the pin (`git diff --name-only <pin>..HEAD -- .claude/rules`) | Warning |
| `advisory` | Rule is not pinned in the contract, but plausibly relevant | Warning |
| `repo-current` | No governing contract (gate mode, legacy plan without one) — current rule text is the bar | Blocker |

`drift` and `advisory` findings never block. The owner may promote one at Stop 2 (a Change verdict), which adds an **Amendments** row to the plan and turns it into `contract`. Legacy plan without a Review contract: use Conflict & compliance § Applicable rules as the pinned set, pinned at the plan file's last commit (`git log -1 --format=%h -- <plan path>`), and state that in the report header.

---


## Subagent contract

Every rule subagent is invoked the same way. The parent spawns a read-only subagent (Cursor: `Task` with `subagent_type: explore`, `readonly: true`; Claude Code: `Agent` with the `Explore` type), passing:

- **Mode** — `plan-review` (from `loop-plan/references/plan-review.md`), `impl` (lap with a plan), or `gate` (diff with no plan).
- **Scope** — plan path for plan review; changed paths or unified diff otherwise.
- **Rule file** — exactly one (e.g. `.claude/rules/architecture.md`).
- **Contract** — the plan's Review contract, the pin SHA, whether this rule is pinned, and the paths of `DECISIONS.md` / Amendments (or `none` in gate mode).
- **Output schema** — every subagent returns the structure below.

**Allowed reads:** the rule file, the scope, and configs the rule itself references (e.g. `projectStructure.config.cjs`, `.dependency-cruiser.cjs`, `ARCHITECTURE.md`, `documentation/DOC_TANSTACK_QUERY.md`, `documentation/DOC_FEATURE_LOCAL_README.md`, `documentation/DOC_APP_VISION.md`). Do **not** read other rule files; cross-rule overlap is handled by the parent.

**Output schema (required):**

```json
{
  "rule": ".claude/rules/<name>.md",
  "applicable": true,
  "findings": [
    {
      "severity": "Blocker | Warning | Suggestion",
      "basis": "contract | drift | advisory | repo-current",
      "category": "<short>",
      "file": "<path or 'plan'>",
      "line": "<number or null>",
      "finding": "<text>",
      "rule_section": "<e.g. § Layer direction>",
      "ambiguity": "none | user-question-needed",
      "question": "<text or null>"
    }
  ]
}
```

If the rule does not apply to the scope, return `{ "applicable": false, "findings": [] }`. If the subagent fails, return the same shape with an additional `"error"` field describing the failure.

**Standards diversion** — a deviation from repo conventions or framework best practices becomes a finding, **unless** it is already decided: confirmed in Conflict & compliance § Standards diversions, Closed in `DECISIONS.md`, waived in Pattern & precedent, or in Amendments. Already-decided diversions are not re-flagged. A finding gets `ambiguity: "user-question-needed"` only when resolving it hits the `agent-behavior` stop list. Industry precedent stays with `loop-plan/references/review-precedent.md`.

**Applicability:** spawn a subagent for every rule plausibly relevant to the scope. Err toward inclusion — `applicable: false` is cheap and explicit. **Always spawn `code-style`** in every mode.

### Category naming (code-style subagent, every mode)

The parent prompt for `.claude/rules/code-style.md` must require a naming sweep of the scope. The subagent reads `.claude/rules/code-style.md` § Naming and reports a finding for each violation. Do not apply a stricter test than that rule section. Do not return `applicable: false` just because quotes and imports look fine.

Do not flag test titles (`should … when …`), an example explicitly marked as the wrong name, or a path labeled as one shipped instance rather than the template.

Severity: **Warning** when guidance will be copied later; **Blocker** when the plan or diff leaves a third or later copy, or introduces an instance name as the shared home. `rule_section`: code-style § Naming.

---


## Tooling pass

The parent runs these directly, in parallel with the subagent fan-out (deterministic shell, no value in delegating). Summarize failures only.

**Contract gate list (SSOT — impl and gate run the same list; plan phase gates cite it):**

- `pnpm validate:structure`
- `pnpm validate:feature-size`
- `pnpm validate:feature-docs:strict`
- `pnpm lint`
- `pnpm type-check`
- `pnpm arch:check`
- `pnpm test:run` — when the change touches tested logic or the plan requires tests; **not** a substitute for CI `test` job
- `pnpm test:staged` — preview only (dry-run); does not prove tests pass
- `pnpm format:check` — optional, if style drift is in scope
- `pnpm validate:docs` and `pnpm validate:skills` — when the diff touches docs, rules or skills
- The lap's **acceptance test** (from `loop-plan`) — must pass; a failing acceptance test is always a Blocker

Each failing command becomes one finding (`rule: "tooling"`, `rule_section: "<command>"`, `basis: "contract"` — or `repo-current` in gate mode). Severity: Blocker for structural / type / lint / arch failures; Warning for format drift; tests follow whether the plan required them. Demote to Warning only with clear context.

**Classifier denylist (manual):** When the diff touches `scripts/change-classify.cjs` or adds `scripts/*staged*` / `scripts/*validator*`, flag any new enforcement paths missing from `TEST_INFRA_EXACT` / `TEST_INFRA_PREFIXES` in the report (no new automation script).

## Plan-compliance subagent (impl only)

One additional read-only subagent compares the code against the **whole contract**: `DEVELOPMENT_PLAN.md` (including Review contract and Amendments), plan **Decisions made**, and sibling `DECISIONS.md`:

- Closed product/scope decisions and accepted Amendments vs actual code.
- Phases marked done vs actual code.
- Gates implied by the plan vs reality.
- Feature `README.md` content alignment the plan required (`pnpm validate:feature-docs:strict` covers presence; this covers content).

Same output schema, with `rule: "plan-compliance"`. It also checks that every Closed lap decision that governs future work was folded into its home (feature README, vision, rule — skill-loop D48).

Excluded from `gate` (there is no plan to compare against).

---


## Report format (check summary)

Open the report with: **Mode**, contract pin (or `none — repo-current`), total findings, counts by severity **and basis**, and any rules listed as **not audited**. List `drift` and `advisory` findings in their own section after `contract` findings.

Group findings by category (Architecture, File placement, Code style, … — plus Tooling, and Plan vs code in impl). For each finding:

- **Finding** — what is wrong, missing, or risky
- **Suggestion** — concrete improvement
- **Rule** — `.claude/rules/<name>.md` § section
- **Severity** — Blocker | Warning | Suggestion
- **Source** — `file:line` for impl/gate, plan section for plan review
- **Owner answer** — when resolving the finding hit the stop list, the owner's answer (or `parked` when it waits)

Severity meaning:

| Severity | Meaning |
|----------|---------|
| **Blocker** | Must fix before shipping (loop-check hands back to loop-build) |
| **Warning** | Should fix; risks tech debt |
| **Suggestion** | Nice to have |

---


