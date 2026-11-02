---
name: meta-write-adoption-guide
description: >-
  Writes a cross-repo adoption guide (<SLUG>_ADOPTION_GUIDE.md) for a capability or harness
  change that landed here: what it is and is not, the portable substance, one illustrative
  example, porting steps, a target-repo checklist and, for harness changes, the rename map forks
  apply with meta-intake-harness. Use when the owner wants an adoption guide, a playbook for
  other repos, a fork porting note, or to document how to replicate a capability elsewhere. Not
  for a session handoff to the next agent or a change only this repo needs.
---

# meta-write-adoption-guide

When this skill is done, another repo's agent can install the same idea in its own layout from one guide that links the SSOT here instead of copying it, and forks have the rename map they need (skill-loop D42).

## Edges

| Field | Value |
|---|---|
| In | The SSOT here (skill, rule, `DOC_*`, script), why it exists, what was wired, one teaching example, the rename map for harness changes |
| Out | `documentation/handoffs/<SLUG>_ADOPTION_GUIDE.md`; one line in `documentation/DOC_AGENT_WORKFLOW_LAYERS.md` § Related |
| Calls | always → [`references/procedure.md`](references/procedure.md) · draft → [`references/adoption-guide-template.md`](references/adoption-guide-template.md) + [`references/voice-and-naming.md`](references/voice-and-naming.md) · map layers → [`references/layer-mapping.md`](references/layer-mapping.md) |
| Called by | [`meta-write-skill`](../meta-write-skill/SKILL.md) (rename or new skill forks must port), [`meta-audit-harness`](../meta-audit-harness/SKILL.md) (landed harness change) · owner |
| Next | Back to the caller |
| Owner stops | None; stop and report when the SSOT does not exist yet |

## Steps

1. **Confirm inputs** from the repo (never invent paths): slug, SSOT, why, what was wired, one example, audience. No SSOT yet → stop and say what must exist first.
2. **Draft** at `documentation/handoffs/<SLUG>_ADOPTION_GUIDE.md` from the template: purpose block (the home repo named once), what it is / is not, illustrative wiring, portable substance, teaching example, adopt steps, checklist. For a harness change add the old → new name table.
3. **Check voice:** the home repo name appears only in the purpose block; examples are marked illustrative ([`references/voice-and-naming.md`](references/voice-and-naming.md)).
4. **Integrate minimally:** one line in the layers doc § Related; run `pnpm validate:docs`.

## Examples

**Example 1 — harness rename**
Input: batch 4 of the skill-loop rework landed.
Output: `SKILL_LOOP_ADOPTION_GUIDE.md` with the v0.42.0 → new name table, what forks keep local, and "drop this file in `.agents/harness-inbox/` and run `meta-intake-harness`".

**Example 2 — capability**
Input: "Write a guide so other apps get the mobile local-dev setup."
Output: `MOBILE_LOCAL_DEV_ADOPTION_GUIDE.md` linking `DOC_MOBILE_LOCAL_DEV.md` as SSOT, with a discovery checklist for the target repo.

## Output

```text
Guide: <path> · SSOT <paths> · rename map <rows | none> · layers doc linked
```

## Not for

| Case | Use |
|---|---|
| Applying a guide in this repo | [`meta-intake-harness`](../meta-intake-harness/SKILL.md) |
| Changing the skill the guide describes | [`meta-write-skill`](../meta-write-skill/SKILL.md) |
