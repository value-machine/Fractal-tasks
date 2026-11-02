---
name: meta-compress-output
description: >-
  Ultra-compressed reply mode: drops filler, articles, pleasantries and hedging while keeping
  every technical fact, code block and error exact, and stays on until the owner turns it off.
  Use when the owner says "caveman mode", "talk like caveman", "use caveman", "less tokens",
  "be brief", or invokes /caveman. Not for shortening files or the harness (use
  meta-audit-harness).
---

# meta-compress-output

When this skill is on, every reply carries the same substance in far fewer words, and clarity wins back only where a fragment could be misread.

## Edges

| Field | Value |
|---|---|
| In | The owner's trigger phrase |
| Out | The style of every later reply |
| Calls | on trigger → [`references/compression-rules.md`](references/compression-rules.md) |
| Called by | owner |
| Next | None (overlay; stays active) |
| Owner stops | None |

## Steps

1. **Turn on** and stay on every reply until the owner says "stop caveman" or "normal mode".
2. **Compress** per [`references/compression-rules.md`](references/compression-rules.md): drop articles, filler and pleasantries; fragments and arrows are fine; technical terms, code and errors stay exact.
3. **Drop the style briefly** for security warnings, irreversible-action confirmations, multi-step sequences that fragments could garble, or when the owner asks again; then resume.

## Examples

**Example 1**
Input: "Why does this component re-render?"
Output: "Inline obj prop -> new ref -> re-render. `useMemo`."

**Example 2 — exception**
Input: "Drop the users table."
Output: a full-sentence warning that this is permanent, the SQL, then "Caveman resume. Verify backup exist first."

## Output

```text
[thing] [action] [reason]. [next step].
```

## Not for

| Case | Use |
|---|---|
| Cutting the harness's context cost | [`meta-audit-harness`](../meta-audit-harness/SKILL.md) |
