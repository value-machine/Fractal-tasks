# Asking the owner — shared protocol

**When** to ask is [`.claude/rules/agent-behavior.md` § When to ask](../../../../.claude/rules/agent-behavior.md) (choice definition + stop list). This file is **how** to ask, shared by every loop skill — link here, never copy it. Ported from `grill-me` § Question style (v0.42.0).

Every answer, and every clear-winner after enumerating the alternatives, is logged in the lap's `DECISIONS.md` ([`decisions-template.md`](decisions-template.md)) so no later stage re-asks it.

### Turn contract (mandatory — no exceptions)

- **One question per turn.** One question-tool call (`AskQuestion` in Cursor, `AskUserQuestion` in Claude Code), one entry in its `questions` array. Never queue a second question, preview upcoming questions, or merge two boundary questions into one form "for efficiency" — even when both are already known.
- **Stop and think before the next ask.** After the user answers: update the lap's `DECISIONS.md` ([`decisions-template.md`](decisions-template.md)), re-check the answer against the hook map / perimeter / non-goals, and only then decide the next single question. An earlier answer can change which question is next, or make one unnecessary — decide that in this thinking step, not by asking anyway.
- A turn is grounding prose in the **chat message** (evidence, cost sketch) **plus one** question-tool call — never plus a second question.
- **Plain text inside the tool.** The question tool's `prompt` and option `label`s do not render markdown. Never put a table, heading, or other markdown in those fields. A pipe table there shows as raw `|` text.

Use a question tool call when available; prefer multiple-choice when branches are clear.

**Options first, labels second.** Start from the real alternatives the question is choosing between. Then describe them. Never generate options by walking an axis list — that produces choices the user was not actually weighing.

### Question shape (pick one per question)

| Shape | Options differ in… | Example | Label format |
|---|---|---|---|
| **Tradeoff** | Cost — each option buys one thing by paying another | Shader glow vs extra render pass | `[Wins: <axis>] <option> — pays: <cost>` |
| **Choice** | What the user wants — placement, wording, which of N, preference, what counts as in | "On which page should this live?" | `<option> — <what follows from it>` |

**Test:** if every option is roughly equal in cost and the user is picking by preference or product intent, it is a **choice** question. Do not stamp `[Wins: …]` on it.

**Tradeoff questions — offer Pareto-optimal options only.** Each option wins on a **distinct** axis. When one option dominates every axis with acceptable costs on the rest, state it, **enumerate the alternatives you rejected**, **log as clear-winner** in `DECISIONS.md`, and move on — do not invent fake tradeoffs and do not skip enumeration.

**Axes are a menu, not a checklist.** Common axes: performance, code consistency, least code, reusability, UX, separation/ease-of-cutting. When the real tension is something else (discoverability, admin control, data freshness, privacy, learning curve…), name that axis instead. Use only the axes the options actually trade on.

### Challenge option (always present)

Every multiple-choice question carries one **challenge** option. It questions a deeper assumption that all the other options take for granted. It is not a fourth variant of the same idea.

**Format:** `[Challenge: <assumption>] <alternative> — <what it would change>`

Pick the assumption most likely to be wrong for *this* question. Common targets:

- **Right thing?** — does the stated problem need this capability at all, or a smaller or different one?
- **Right home?** — should this live in another feature, an existing flow, or a different surface (dialog vs page, setting vs default)?
- **Build vs borrow?** — search open-source or shipped examples first and base the work on one ([`spec-reuse-package`](../../spec-reuse-package/SKILL.md)).
- **Right time?** — defer until a prerequisite or a real second consumer exists.
- **Build at all?** — a config, content, or process change solves it without code.

**Example (choice question "On which page should this live?"):** `[Challenge: it needs its own page] Fold it into the existing Settings dialog — no new route; settings gets busier.`

Make it concrete and grounded in what you know about the repo or the problem. A generic "reconsider the approach" is forbidden. If, after honest thought, every underlying assumption is already Closed in `DECISIONS.md`, challenge the strongest remaining one and cite the row it would reopen.

**When the user picks the challenge:** do not log it as a normal answer and move on. Treat it as reopening the assumption: say which earlier decision or perimeter line it overturns, update or reopen that row in `DECISIONS.md`, and re-ground from that level (perimeter, neighbor map, or a hand-off such as `spec-reuse-package`) before the next question.

### Boundary-question template (required)

Same content every time. Split across two channels — any cost-sketch table stays in chat, where markdown renders:

1. **Chat message — evidence.** One line on what the repo shows (or `Uncertain`). Explore first when the codebase can answer part of the question.
2. **Chat message — cost sketch (tradeoff questions only).** When exploration allows, a compact markdown table comparing branches on the axes they actually trade on (for example **Perf | Code | UX**, add **Scope-cut** when relevant). Mark agent estimates; `loop-plan` verifies exact numbers. Skip the table for choice questions. Never copy it into the question tool.
3. **Question tool `prompt`.** One plain-text question sentence. No table. No markdown.
4. **`options` labels** — 2–3 choices in the format for the question's shape (see § Question shape), each one plain line, no markdown.
5. **Challenge option** — one `[Challenge: …]` line (see § Challenge option).
6. **Total cap** — at most **4** options including the challenge (question-tool limit; the tool adds its own free-text "Other").

**Example tradeoff line:** `[Wins: performance] Shader-only fake glow — no extra passes; pays with less convincing scatter.`

**Example choice line:** `Dashboard — first thing users see after login; competes with existing widgets.`

Optional escape hatches — add one only when it fits under the cap and the answer is genuinely unclear:

- **"Explain the UX impact first"** — research the flow, explain what each branch means for users, re-ask.
- **"Dig deeper in the codebase"** — widen exploration, update the hook map, re-ask.

### Anti-patterns (do not ship questions like these)

- A markdown table (or any markdown) inside the question tool's `prompt` or option labels. Cost sketch stays in the chat message.
- A tradeoff question with options grouped **only by feature area** (e.g. "glints / Fresnel / foam") with no `[Wins: …]` axis or pay line.
- `[Wins: …]` labels forced onto a **choice** question ("[Wins: UX] Dashboard / [Wins: least code] Settings" for a placement question). The axis is fake; describe what each option means instead.
- Options invented to fill the axis list instead of the alternatives actually on the table.
- Two options claiming the **same winning axis** without different pay lines.
- A challenge option that is generic ("rethink the approach"), or that is just another variant of the regular options.
- **Bundling** integration approach and content scope in one question when each branch has different Perf/Code/UX — split (usually integration perimeter first, then what is in the bright-pass / handoff).

Mechanism detail (`functionA` vs `functionB`) belongs in [`loop-plan`](../../loop-plan/SKILL.md). Borrow-vs-build (`spec-reuse-package`) runs in `loop-refine` step 4 whenever an edge is `new`, because a library or open-source pattern changes scope, size, and whether a new-dependency question is needed in Stop 1.

Ask at the level the user can answer — behavior, scope, edges:

- Perimeter: "Is v1 just browsing cached data, or working fully offline and syncing later?"
- Grounded edge (tradeoff): *Evidence: save flow shows a toast today.* Cost sketch + `[Wins: UX]` / `[Wins: least code]` / … options with pay lines + challenge.
- Grounded ride-vs-new (tradeoff): *Evidence: shared notifications pipeline exists (prefs + history).* Ride vs fork with axis labels, not file names alone + challenge.
- Placement (choice): "Which page should show this?" Pages as plain options with consequences, no cost table + challenge ("does it need a page at all?").

