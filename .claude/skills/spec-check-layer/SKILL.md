---
name: spec-check-layer
description: >-
  Checks the assumption behind a request to change existing behavior, and catches workarounds:
  traces how the system really works, then compares the request or the diff against the
  workaround shapes (special-case flag, parallel path, symptom tuning, disconnected patch,
  instance-encoded naming, growing scope, "for now" comments). A confirmed patch-on-top becomes
  an owner choice between the workaround and the structural fix. Use when the architecture
  rule's layer-consistency trigger fires — "just add", "only for this case", a first-of-a-kind
  instance, behavior by analogy — or when the agent's own diff starts to look like a workaround.
  Not for industry precedent (loop-plan review-precedent) or naming rules (code-style § Naming).
---

# spec-check-layer

When this skill is done, the request's assumption about the system is verified or corrected, and no workaround is built silently: either the structural path is planned, or the owner chose the workaround knowingly. The trigger and core reflex live in `.claude/rules/architecture.md` § Layer consistency (skill-loop D33, D56); this skill holds the rubric and the alert.

## Edges

| Field | Value |
|---|---|
| In | The request or diff, the code path it touches, `architecture` rule § Layer consistency |
| Out | A one-beat layer check; when a shape clears the severity filter, the **WARNING, WORKAROUND** alert ([`references/alert-template.md`](references/alert-template.md)) and the owner's pick |
| Calls | always → [`references/procedure.md`](references/procedure.md) and [`references/workaround-shapes.md`](references/workaround-shapes.md) |
| Called by | [`loop-refine`](../loop-refine/SKILL.md) (request changes existing behavior), [`loop-build`](../loop-build/SKILL.md) (diff looks like a workaround) · owner (skill-loop D57) |
| Next | Back to the caller |
| Owner stops | Patch on top vs structural fix (stop list) |

## Steps

1. **Verify the assumption:** trace the real behavior behind the request (the owner can't see the implementation).
2. **Naming first:** a new or copied symbol follows `code-style` § Naming. No one-off skip.
3. **Match the shapes** in [`references/workaround-shapes.md`](references/workaround-shapes.md) (request-side cues and implementation-side shapes).
4. **Severity filter:** skip a genuinely one-off exception with no recurring cost. Otherwise post the alert from [`references/alert-template.md`](references/alert-template.md).
5. **Owner pick** (stop list: patch on top). The structural path goes into the brief or plan, at the size it costs. The workaround is recorded with its debt.

## Examples

**Example 1**
Input: "just add a 'premium' flag to this one button".
Output: the trace shows entitlements already live in `features/billing`. Shape: special-case flag. Alert: ride billing's entitlement check (structural) vs hard-code the flag (workaround). One owner question.

## Output

```text
Layer check: assumption <verified | corrected: …> · shape <none | #n name> · result <clear | WARNING, WORKAROUND → owner pick>
```

## Not for

| Case | Use |
|---|---|
| Is this design industry-standard? | [`loop-plan/references/review-precedent.md`](../loop-plan/references/review-precedent.md) |
| Code already in the wrong layer | [`loop-plan/references/semantic-placement.md`](../loop-plan/references/semantic-placement.md) |
