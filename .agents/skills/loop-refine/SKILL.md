---
name: loop-refine
description: >-
  Turns the top backlog task — feature, bug, or Stop 2 feedback — into an agent-facing BRIEF.md:
  problem, success check, in / out of scope, touched edges, and a size estimate (XS / S / M,
  larger work cut into laps). Drafts silently from the task, app vision, feature READMEs and
  code, asks the owner only per the agent-behavior stop list, and ends Stop 1 with a one-line
  restatement. Use when loop-backlog has picked a task, after a Change verdict, or whenever a
  request must be scoped before planning — "refine this", "scope it", "what exactly do we build".
  Not for writing the build plan (use loop-plan) or for choosing which task is next (use loop-backlog).
---

# loop-refine

Second half of **Stop 1**. When this skill is done, `BRIEF.md` describes exactly what the lap builds and where it stops, every product choice is either derived or answered, and the owner has seen a single restatement line. The brief is for the agent, not the owner (skill-loop D19), so getting it right here is what keeps the rest of the loop running without stops.

## Edges

| Field | Value |
|---|---|
| In | Top task in `src/config/app-tasks.json`; `documentation/DOC_APP_VISION.md`; feature READMEs and code of the touched areas; rules; owner feedback (Change verdict) |
| Out | `documentation/jobs/temp_job_<slug>/BRIEF.md` ([`references/brief-template.md`](references/brief-template.md)); lap `DECISIONS.md` ([`references/decisions-template.md`](references/decisions-template.md)); follow-up backlog tasks when the work is cut into laps |
| Calls | if repo context is missing → [`spec-load-context`](../spec-load-context/SKILL.md) · if the task is a bug → [`spec-debug-runtime`](../spec-debug-runtime/SKILL.md) (reproduce only) · if the request changes existing behavior → [`spec-check-layer`](../spec-check-layer/SKILL.md) (fired by `architecture` rule § Layer consistency) · if any edge row is `new` (`architecture` rule § Don't reinvent the wheel) → [`spec-reuse-package`](../spec-reuse-package/SKILL.md) · if the user flow itself is in question → [`spec-simplify-flow`](../spec-simplify-flow/SKILL.md) · when done → [`loop-plan`](../loop-plan/SKILL.md) |
| Called by | [`router`](../router/SKILL.md), [`loop-backlog`](../loop-backlog/SKILL.md) |
| Next | [`loop-plan`](../loop-plan/SKILL.md) |
| Owner stops | Stop list only ([`agent-behavior` rule § When to ask](../../../.claude/rules/agent-behavior.md)), asked per [`references/asking.md`](references/asking.md) |

## Steps

1. **Open the lap.** Derive `<slug>` (kebab-case) from the task title. Create the lap branch per [`git-workflow` rule § Mode-aware branch gate](../../../.claude/rules/git-workflow.md) (one lap = one branch, skill-loop D45), then `documentation/jobs/temp_job_<slug>/` on it. Read the task. For a Change verdict, the feedback is the task.
2. **Read before asking.** Read the vision, then the `README.md` of every feature the task plausibly touches, then those features' code paths ([`references/grounding.md`](references/grounding.md)). Recorded decisions live in those READMEs, the vision and the rules (skill-loop D48). If the vision is still `DRAFT` and the task changes product meaning, note `vision-deferred` and keep the perimeter minimal.
3. **Bugs:** call [`spec-debug-runtime`](../spec-debug-runtime/SKILL.md) to reproduce and pin the failing behavior only. The fix depth (patch, refactor, redesign) sets the size like any other work (skill-loop D27).
4. **Draft `BRIEF.md` silently:** problem, success check, in scope, out of scope (will NOT do / will NOT touch), the edges table, generality (clear winner unless a second consumer is named), and requirements when size ≥ M spans roles or journeys ([`references/requirements.md`](references/requirements.md)). When any edge row is `new`, run [`spec-reuse-package`](../spec-reuse-package/SKILL.md) now (before asking or sizing) and fill `Borrow / build:` under `## Edges` — borrowing a package or open-source pattern can shrink scope and size, and a recommended new package becomes one stop-list question in step 6. If every `new` row is pure product-specific rules, write `custom — <one-line reason>`.
5. **Find the open questions.** For each choice in the draft, check it against the stop list. Conflicts with a recorded decision are the most important ones to catch: flag them with proposed resolutions (skill-loop D3). Log clear winners in `DECISIONS.md` after naming the alternatives.
6. **Ask, one at a time,** only what remains (gaps, true ties, data / irreversible, cost / external service, new dependency, patch-on-top), per [`references/asking.md`](references/asking.md). Update the brief and the ledger after each answer.
7. **Size it.** Estimate XS / S / M from the edges touched plus the refactor a clean implementation needs (skill-loop D12, [`loop-plan/references/complexity-rubric.md`](../loop-plan/references/complexity-rubric.md)). Anything larger than M is cut into laps of M or smaller: this lap takes the first slice, and the rest become backlog tasks right after the current top task (skill-loop D44).
8. **Restate and hand off.** Post the restatement line (no wait). If the owner corrects it, update the brief and restate. Then run [`loop-plan`](../loop-plan/SKILL.md).

## Examples

**Example 1 — sharp request, no questions**
Input: top task "Show the user's avatar in the top bar". The profile feature README already defines the avatar source, and the top bar is in `layouts/`.
Output: brief with edges `profile` (ride) and `layouts` (ride), size XS, no questions. Chat: `Building: avatar in the top bar from the existing profile image. Not: avatar upload. Size: XS.`

**Example 2 — conflict with a recorded decision**
Input: "Let guests save drafts". The `drafts` README records "drafts require an account (owner, v0.40.0)".
Output: one question: keep the account requirement and prompt sign-up, store guest drafts locally, or reverse the decision and store them server-side. Each option states its consequences, and a challenge option is included. Once answered, the brief and the ledger record it, and `loop-build` later updates the `drafts` README line.

## Output

`BRIEF.md` per [`references/brief-template.md`](references/brief-template.md), the lap `DECISIONS.md`, and one chat line:

```text
Building: <in scope>. Not: <top non-goal>. Size: <XS|S|M>.
```

## Not for

| Case | Use |
|---|---|
| Choosing or reordering the next task | [`loop-backlog`](../loop-backlog/SKILL.md) |
| How to build it: phases, files, tests | [`loop-plan`](../loop-plan/SKILL.md) |
| Root-causing a bug beyond reproduction | [`spec-debug-runtime`](../spec-debug-runtime/SKILL.md) |
| Questions with no repo change ("how does X work?") | Answer directly; not a lap (skill-loop D54) |
