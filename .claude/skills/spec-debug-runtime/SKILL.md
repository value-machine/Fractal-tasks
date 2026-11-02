---
name: spec-debug-runtime
description: >-
  Scientific debugging for runtime bugs, regressions, flaky behavior, failing tests and red CI:
  reconstructs the event chain, proposes falsifiable hypotheses (including a configuration
  cause), adds targeted logging, and narrows with one unified list of checks until the cause is
  proven; switches to pre-registered hypothesis mode after a failed naive fix. Use when a bug is
  reported, a test or CI check fails unexpectedly, behavior is inconsistent, or the owner says
  "debug", "why is this broken", "it fails on X". Not for planning the fix scope (use loop-refine)
  or performance tuning (use spec-optimize-performance).
---

# spec-debug-runtime

When this skill is done, the root cause is proven by evidence (not guessed), the failing behavior is reproducible, and the fix or next narrowing step is clear. Inside the loop it reproduces bugs for `loop-refine`, unblocks `loop-build`, and fixes red CI for `loop-ship`. The owner confirms a product fix at Stop 2; the agent never claims it alone.

## Edges

| Field | Value |
|---|---|
| In | Error, stack trace, console or CI logs, the owner's description, the code path, `references/patterns.md` |
| Out | Event chain, hypotheses with falsification conditions, instrumentation, the proven cause; new reusable bug classes added to `references/patterns.md` |
| Calls | always → [`references/scientific-method.md`](references/scientific-method.md) · if a naive fix already failed or the owner asks for hypothesis mode → [`references/hypothesis-mode.md`](references/hypothesis-mode.md) · when narrowing scope or planning a test → [`references/strategy.md`](references/strategy.md) |
| Called by | [`loop-refine`](../loop-refine/SKILL.md) (reproduce a bug), [`loop-build`](../loop-build/SKILL.md) (unexpected failure), [`loop-ship`](../loop-ship/SKILL.md) (red CI) · owner (skill-loop D57) |
| Next | Back to the caller (owner-direct: the fix becomes a backlog task) |
| Owner stops | Only when the owner must act or report evidence (run a step in the app, paste logs, check a dashboard) |

## Steps

1. **Intake.** Restate the symptom, the environment and what "fixed" means. Search [`references/patterns.md`](references/patterns.md) for the symptom class before forming hypotheses.
2. **Reconstruct the event chain** (user action → app behavior → API calls / side effects → failure point). For UI issues, analyze component nesting first.
3. **Hypotheses:** two or three, each mapped to a link in the chain, each with a predicted observation and a falsification condition, at least one a configuration cause (env, RLS, keys, quotas, dev vs prod).
4. **Instrument and narrow:** targeted logs and one unified ordered list of checks that halves the search space at each step. Each check states what success and failure mean (`debugging` rule § User Testing Instructions). Full procedure: [`references/scientific-method.md`](references/scientific-method.md).
5. **Iterate on the evidence:** mark hypotheses supported, refuted or uncertain, and shrink the set. After a failed fix, switch to [`references/hypothesis-mode.md`](references/hypothesis-mode.md).
6. **Fix at the cause** with the reductive strategy (`debugging` rule). Never skip, disable or quarantine a test to get green.
7. **Record:** a reusable bug class goes into `references/patterns.md` (it must pass the quality gate there). Keep debugging logs until the owner says they can go.

## Examples

**Example 1 — red CI**
Input: `loop-ship`: CI `test` fails only in CI on a date assertion.
Output: chain → hypotheses (timezone, locale, clock mocking) → the test assumes local time; fix the test setup; CI green; pattern "environment-dependent time" added.

**Example 2 — owner-reported bug**
Input: "login works on desktop, not on my phone".
Output: hypotheses include an OAuth redirect URL mismatch (configuration). Checks: the redirect in the Supabase dashboard vs the preview URL. Cause proven, and the fix enters the loop as the top task.

## Output

```text
Debug: symptom <…> · chain <step → … → failure> · hypotheses H1 <status>, H2 <status> · next check <…> | cause <proven: …> · fix <where>
```

## Not for

| Case | Use |
|---|---|
| Scoping how deep the fix goes | [`loop-refine`](../loop-refine/SKILL.md) |
| Slow or heavy code without a defect | [`spec-optimize-performance`](../spec-optimize-performance/SKILL.md) |
| Durable lessons after a struggle | [`meta-learn-lessons`](../meta-learn-lessons/SKILL.md) |
