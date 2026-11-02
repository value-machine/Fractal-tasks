# Authoring — capture, draft, test, tune, integrate

Read by [`meta-write-skill`](../SKILL.md) § Steps. Ported from `create-skill` (v0.42.0). Structure SSOT: [`skill-template.md`](skill-template.md).


Loop: capture intent → draft → (optionally) test on realistic prompts → improve from feedback → tune the description → integrate into the repo. Figure out where the user already is (an idea, a workflow in this conversation, an existing draft) and start there. If they just want to "vibe" without evals, skip testing.

Match your vocabulary to the user: explain terms like "eval", "assertion", or "JSON" unless they clearly know them.

## 1. Capture intent

If the conversation already shows the workflow ("turn this into a skill"), extract the steps, tools, corrections, and formats from it first; then fill gaps with the user and confirm:

1. What should the skill enable the agent to do?
2. When should it trigger (phrases, contexts)?
3. What output format is expected?
4. Test cases? Suggest yes for objectively checkable outputs (transforms, extraction, code, fixed workflows), usually no for subjective ones (style, art) — the user decides.

Then ask about edge cases, inputs/outputs, example files, success criteria, and dependencies. Research with available MCPs or docs so the user carries less of the load. Before writing, check for overlap with existing skills (`router/references/catalog.md`) — refine one instead of adding a near-duplicate.

## 2. Write the SKILL.md

**New skills follow [`references/skill-template.md`](skill-template.md)**: the recurring structure, plus a port map in [`references/port-map-format.md`](port-map-format.md) when the skill replaces v0.42.0 skills. They also need a row in [`router/references/catalog.md`](../../router/references/catalog.md); `pnpm validate:skills` rejects a skill folder that has neither. The tree and bullets below still apply to edits of v0.42.0 skills until each one is replaced.

```
.agents/skills/<name>/
├── SKILL.md        # YAML frontmatter (name, description) + instructions
├── references/     # loaded on demand (whitelist: projectStructure.config.cjs)
└── scripts/        # deterministic/repetitive work
```

- **Description = the trigger.** Say what it does *and* when to use it, including the phrases users actually type; agents tend to under-trigger, so be a little pushy ("use whenever the user mentions X, even if they don't say Y"). Add a short "Not for … (use Z)" when a neighbor skill competes. All "when to use" belongs in the description, not the body.
- **Progressive disclosure:** the description is always listed; the body loads on trigger (keep it under ~500 lines); `references/` load only when pointed to — say *when* to read each. Large references get a table of contents. Multi-variant skills put one variant per reference file.
- **Style:** imperative; explain *why* instead of stacking ALL-CAPS MUSTs (a model that knows the reason generalizes); keep it general rather than fitted to the examples; give exact templates for required output formats and short input → output examples.
- **Repo fit:** follow `.claude/rules/code-style.md` § Naming for the skill name; point at SSOT rules instead of restating them; end with what it is *not* for and the **Next** step.
- **No surprises:** nothing whose intent the user wouldn't expect if described (no malware, exfiltration, deceptive behavior).

## 3. Test (optional)

1. Write 2–3 realistic prompts — what a real user would type, with concrete detail — and confirm them with the user.
2. Run each with the skill and without it (a baseline), e.g. as parallel subagents told to read the draft `SKILL.md` vs not. For an existing skill, the baseline is the previous version.
3. While they run, draft checkable assertions for the objective parts.
4. Show the user the outputs side by side with the assertion results, and ask what's wrong. Read the transcripts, not only the final outputs.

## 4. Improve

- **Generalize from feedback** — the skill will run on many prompts, not these three. Prefer a better explanation or pattern over a narrow patch or a rigid MUST.
- **Keep it lean** — cut instructions that make the model waste time.
- **Explain the why** behind each requirement.
- **Bundle repeated work** — if every test run wrote the same helper, put it in `scripts/` and tell the skill to use it.

Re-run the tests after each revision; stop when the user is happy, the feedback is empty, or progress stalls.

## 5. Tune the description

1. Write ~20 realistic queries: 8–10 that should trigger (varied phrasings, casual and formal, the skill not named, cases where it should beat a neighbor) and 8–10 near-misses that share keywords but need something else. Obvious non-matches test nothing.
2. Review the set with the user.
3. Check each query against the description (and the competing skills' descriptions in `router/references/catalog.md`); revise until should-trigger queries clearly match and near-misses clearly don't. Skills fire mainly for multi-step or specialized work, so one-step queries are poor tests.
4. Show the before/after description.

## 6. Integrate

- `.agents/skills/**` is protected: get explicit user approval before writing (`.claude/rules/agent-behavior.md` § Protected Files).
- Add or update the skill's row in [`router/references/catalog.md`](../../router/references/catalog.md) and run `pnpm validate:skills` (admission check).
- If it competes with another skill outside the loop, add a row to `router/references/tiebreaks.md`; if it is a loop stage, update `router/references/loop-map.md`. Update `documentation/DOC_AGENT_WORKFLOW_LAYERS.md` if it changes a workflow layer.
- A **proactive guard** skill also gets a thin always-on pointer in the matching `.claude/rules/<name>.md` (see precedent review (`loop-plan`) / `spec-reuse-package` in `.claude/rules/architecture.md`).
- Run `pnpm validate:docs` and `pnpm validate:structure`.

## What this is NOT

| Concern | Use instead |
|---------|-------------|
| Whole `.agents/skills/` corpus audit (overlap, SSOT, conflicts) | [`meta-audit-harness`](../../meta-audit-harness/SKILL.md) |
| Cut the context cost of existing skills/rules | [`meta-audit-harness`](../../meta-audit-harness/SKILL.md) |
| Grade/rewrite one **rule** file | [`meta-grade-rule`](../../meta-grade-rule/SKILL.md) |
| User-global Cursor skill authoring outside this repo | `~/.cursor/skills-cursor/create-skill/` (reference-only here) |

**Next:** optionally [`meta-audit-harness`](../../meta-audit-harness/SKILL.md) for library coherence.
