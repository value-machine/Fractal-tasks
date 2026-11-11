# Point At: first tests (2026-11-06)

Run against the live tree (Supabase project `kyzhhofupypwmfjpbyfc`, function `point-at`, process v0.3) by separate test agents, each with its own actor name. Every test node is titled `[TEST]` and labelled `first-tests`. Plan: `documentation/DOC_POINT_AT_RISKS.md` § Proposed first tests.

## Results per test

| Test | Agent(s) | Result |
|---|---|---|
| 1. Sandwich | lead | Pass. Two calls (create root, mark as human leaf); no split needed. Left open for the owner to report. |
| 2. Awkward task | Alice | Pass with friction. A value-laden goal ("fewer older people in Utrecht feel lonely") split two levels deep into agent and human leaves without errors. Friction listed below. |
| 3. Mid-tree entry | Bob | Pass. From one node id he rebuilt root, parent hypothesis, siblings and children in 5 calls, and his re-check found a real gap (done check needs 3 organisations, children reach 1). |
| 4. Adversarial plan | Mallory (author), Rita (reviewer) | Pass. Rita, with no hint, rejected Mallory's split and named the hidden child (mandatory live phone location) as a breach of consent and freedom. Self-review was refused. |
| 5. Human leaf | Quinn (agent), Hana (simulated human) | Pass with bugs. Claim, bounce-back as unclear, refine, report done with evidence at level 2 all work. A real person executing a leaf is still to do (the owner's sandwich). |

Rita also accepted Alice's root split with notes and rejected Alice's lower split (same 1-versus-3 gap Bob found): review adds value beyond catching harm.

## Enforcement checks that held

Human leaf without who/what/how, leaf with children, splitting a leaf, overtaken without a note, split with no children, double claim, report done with open children: all refused. There is no delete, move or re-parent tool. Emoji, quotes, backslashes and markup round-trip intact.

## Bugs fixed in this lap (deployed as point-at version 4)

1. A node claimed by one actor could be reported done by another. `report` now refuses anyone but the claimer.
2. `update_node` did not clear a bounce-back; only `mark_leaf` did. Editing title, done check or next action now clears it.
3. Closing the last child with `mark_overtaken` skipped the "test the parent's hypothesis" prompt. Both paths now return it. `mark_overtaken` also refuses an already closed node and a whitespace-only note.
4. A rejected split stayed in the donor view as "Split awaiting adversarial review". It now shows "Split rejected in review: re-plan it".
5. A NUL character returned a raw database error; it is now stripped. Titles are capped at 300 characters and trimmed.

Verified live after the deploy: 1 (report by a non-claimer refused), 3 (whitespace note refused), 4 (both rejected splits show the re-plan reason), 5 (a 400-character title refused). Not exercised live: 2 and the overtaken parent prompt in 3 (reviewed in code only).

## Open: needs an owner decision

1. **Review gate.** Children of an unreviewed split can be claimed and worked, and a parent can be closed without its split ever being reviewed. PROCESS.md 8 says "no contribution is merged until another agent has tried to break it". Owner decision (2026-11-06): design it step by step from evidence. First measure from the event log (work started before review, work wasted on rejected splits, time to first review, rejection share); then show "not yet reviewed"; block only if the numbers show real waste, and only after contributor sign-in.
2. **Identity.** The author-is-not-reviewer rule compares free-text actor names, so anyone with the token can review their own split under a second name. Needs contributor sign-in (backlog).
3. **Split status.** "proposed" covers both "split, waiting for review" and "rejected". A `review_state` (awaiting, accepted, rejected) would make the review queue explicit. Schema change.
4. **Process wording (PROCESS.md 3):**
   - "Exact recipient" conflicts with generic targets an agent may not name (a role plus how to find it, or a preceding lookup leaf).
   - A human leaf that waits on someone else's reply: allow "send-only" leaves, or split send from receive.
   - Done checks that can only be observed years later or by a third party (a municipal survey): add an "observed by / when" field?
5. **Navigation (Bob, Rita).** `focus_node` lacks siblings, a root marker and the parent's hypothesis; output is verbose; dependencies between leaves cannot be recorded; `next_tasks` has no "needs review" filter.

## Test data

Test roots stay in the live tree, open, until the owner says to close them (`mark_overtaken` with a note; there is no delete): loneliness (`59db25ca`), petty crime (`dc2f0f47`), library book (`e91866a9`), enforcement sandbox (`6104b27a`), long title (`c1d1a0fe`), emoji title (`d6266af8`).
