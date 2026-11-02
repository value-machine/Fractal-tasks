---
name: loop-verdict
description: >-
  Stop 2 of the product-owner loop. Hands the owner the preview link, test steps, the check
  summary, the recorded-decision lines and rule changes the PR carries, then asks one question:
  Pass, Change or Drop. Pass merges or promotes (the owner merging the PR counts as a Pass); Change runs lessons on the
  same PR and turns the feedback into the next top request; Drop closes the PR. Use when a lap's
  PR is green with a preview, when the owner reports test results ("looks good", "ship it",
  "this is wrong", "drop it"), or asks what is waiting for them. Not for shipping steps
  (use loop-ship) or picking the next task (use loop-backlog).
---

# loop-verdict

**Stop 2.** The owner judges the real thing, a working preview, before anything reaches production (skill-loop D11, D47). When this skill is done, the lap is merged and archived, turned into a Change request, or dropped, and the loop is back at Stop 1. The owner decides only in chat or by merging, and reads little: the handoff is a few lines that make testing easy. The full record stays in the PR body for agents (merge-is-pass D4).

## Edges

| Field | Value |
|---|---|
| In | PR and preview link, check summary, `BRIEF.md` success check, PR diff of decision homes (feature READMEs, `documentation/DOC_APP_VISION.md`, `.claude/rules/**`, `.agents/skills/**`), parked questions, plan **Notes during development** |
| Out | Merge / promotion (via `loop-ship`), archived task, closed PR, or feedback tasks on the backlog; lessons committed to the same PR |
| Calls | if the verdict is Pass → [`loop-ship`](../loop-ship/SKILL.md) (merge / promote) · if the verdict is Change or Drop (any non-Pass counts as trouble, skill-loop D50) → [`meta-learn-lessons`](../meta-learn-lessons/SKILL.md) · after any verdict → [`loop-backlog`](../loop-backlog/SKILL.md) |
| Called by | [`router`](../router/SKILL.md), [`loop-ship`](../loop-ship/SKILL.md) |
| Next | [`loop-backlog`](../loop-backlog/SKILL.md) |
| Owner stops | Stop 2 itself — one question, Pass / Change / Drop ([`loop-refine/references/asking.md`](../loop-refine/references/asking.md)) |

## Steps

1. **Collect only what the owner needs to test and decide:** the preview URL; two or three things to try from the success check, each with what they should see; what the checks couldn't cover; any choice they would notice in the app that they didn't ask for. Rule and skill changes were already asked in chat (`agent-behavior` rule § Protected Files), and open questions were answered before the PR became mergeable (`loop-ship` step 5); decisions stay in the PR body.
2. **Post the handoff** (§ Output) and ask one question with the question tool (`agent-behavior` rule § How to ask): **Pass / Change / Drop**, with a challenge option when one is grounded (for example "ship it but cut the export button to a later lap"). An untested preview waits here and ranks as a blocker in the backlog (skill-loop D45).
3. **Pass.** The PR already carries the archived task (`loop-ship` step 3), so a Pass needs no commit (merge-is-pass D1).
   1. **The owner merged it** (or turned on auto-merge) without a verdict in chat: that merge is the Pass (merge-is-pass D2). Stop watching the PR and say in one line that the merge was read as a Pass.
   2. **Otherwise** run [`loop-ship`](../loop-ship/SKILL.md) step 8 (merge on Model C, promote on A/B).
   3. Non-blocking remarks become new backlog tasks after the current top one (skill-loop D17). The lap folder is left for the next [`loop-backlog`](../loop-backlog/SKILL.md) catch-up, which removes it once the lap has landed (onboarding-first-lap D4).
4. **Change:**
   1. Run [`meta-learn-lessons`](../meta-learn-lessons/SKILL.md): a non-Pass verdict is the trouble signal (skill-loop D50). Feed it the verdict plus any red CI, size overrun, or mistake signals in **Notes during development**, and commit each rule or skill edit to this PR only after the owner's yes in chat (merge-is-pass D3).
   2. Write the feedback as the top backlog task, linked to this lap (same branch and PR; a fix round stays on the PR, skill-loop D11).
   3. Hand to [`loop-backlog`](../loop-backlog/SKILL.md), which starts it at once (owner-named task, skill-loop D26) → `loop-refine` sizes the fix depth (skill-loop D50).
5. **Drop:**
   1. Close the PR. Its lap decisions vanish with the branch, because they only land through the merge (skill-loop D48).
   2. The task is still open on the default branch, because its archive only lands through the merge. Archive it there with `status: "done"` and a `dropped: <one-line reason>` note in the description; under Model C that change rides the next lap's branch and PR.
   3. Run [`meta-learn-lessons`](../meta-learn-lessons/SKILL.md) (a Drop is a non-Pass verdict). With no PR left to ride, its edits become one backlog task ("lessons from <lap>"), placed after the current top. Then go to [`loop-backlog`](../loop-backlog/SKILL.md).
6. **Report faithfully** (`agent-behavior` rule § Success Validation): what was verified by checks, and what only the owner's test can tell.

## Examples

**Example 1 — Pass**
Input: owner: "works on my phone, ship it".
Output: the PR already archives "Export tasks as CSV"; merge it (Model C); `Merged #42 · task archived · Next: loop-backlog`. If the owner had merged #42 without a word, the same result, with one line saying the merge was read as a Pass → Stop 1 opens with the reordered backlog.

**Example 2 — Change**
Input: owner: "CSV should include due dates, and the button is hard to find".
Output: the lap had no trouble, so no lessons. One top task "CSV export: add due dates, move the button to the toolbar", linked to the same PR → loop-backlog → loop-refine sizes it XS → fix round on the same PR.

## Output

The handoff, at most six short lines; everything else stays in the PR body:

```markdown
**Ready to test:** <preview url>
Try: 1. <action> → <what you should see> 2. …
Checks couldn't cover: <one line> | —
I picked: <a choice you'd notice in the app that you didn't ask for> | —
```

The Pass / Change / Drop question tool call follows as the last element (`agent-behavior` rule § Turn ending); no text ask repeats it.

## Not for

| Case | Use |
|---|---|
| Committing, pushing, fixing CI | [`loop-ship`](../loop-ship/SKILL.md) |
| Choosing or ordering the next task | [`loop-backlog`](../loop-backlog/SKILL.md) |
| Rolling back a released change | A Change request: a revert PR at the top of the backlog (skill-loop D52) |
