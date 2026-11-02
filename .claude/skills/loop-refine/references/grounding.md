# Grounding the brief in the repo

How `loop-refine` builds the perimeter, non-goals and neighbor map that go into `BRIEF.md`. Ported from `grill-me` (v0.42.0) § Codebase grounding, § Interrogation priority, § Ride vs new, § Non-goals, § Roles. The question format is [`asking.md`](asking.md).

## Codebase grounding (mandatory, scoped)

Ground the brief and any edge question in repo context so ride-vs-new and boundary choices are concrete. Search **only for neighbors implied by the agreed perimeter** (steps 1–3 below) — scope the search to named neighbors once perimeter is agreed.

| Stage | Action |
|---|---|
| **Steps 1–3** (problem, perimeter, non-goals) | Draft from the task, `documentation/DOC_APP_VISION.md` and the feature READMEs; ask only for gaps. Defer the wider codebase search until step 4. |
| **Step 4** (neighbor map) | For each neighbor from the agreed perimeter, search narrowly (its feature area + direct dependencies, ~3–5 files) and trace its flow end-to-end (UI → hook/service → API/edge → DB/storage) in one plain-language sentence. |
| **Per edge answer / when stuck** | Re-check the answer still fits the traced loop; step back (problem, route, evidence, alternative) if unclear, then resume. |

**Verify before you state.** Name loops and behaviors only after reading enough to be confident; when unsure, say `Uncertain — only read X so far` or `Not found in repo` and explore more or ask the user to confirm.

For each neighbor, surface a **hook map** in plain language (user-visible names — save file/symbol detail for `loop-plan`) before the boundary question:

1. **Name** — what the user knows it as (auth, notifications, import…).
2. **Loop** — trigger → path → outcome, or `Not found` / `Uncertain`.
3. **Hook point** — where this rides, if it rides — mark **provisional** until that neighbor's edge decisions are agreed; use `TBD` when no loop exists.
4. **Fork cost** — one line on what a new path would duplicate, or `N/A`.

Use exploration to make boundary questions **evidence-based**. Keep mechanism choices with the agent; ask the user about scope, behavior, and edges. File-level paths, migrations, and API contracts belong in [`loop-plan`](../../loop-plan/SKILL.md) — grill still learns what exists so alignment isn't abstract.

Run [`spec-load-context`](../../spec-load-context/SKILL.md) once at step 4 if the repo is unfamiliar, then trace each neighbor — a single context pass supplements, not replaces, per-neighbor grounding.

## Interrogation priority (edges before interior)

Resolve in this order; a branch may open another. Treat integration hooks as **edge work** in step 4 — surface where new work attaches while mapping neighbors, before interior questions.

1. **Problem + success** — one sentence each.
2. **Perimeter (in scope)** — smallest set of capabilities that counts as this feature.
3. **Non-goals (out of scope)** — will NOT do / NOT touch (see below).
4. **Neighbor + hook map** — per neighbor: name, traced loop (or not found), provisional hook point, then **ride vs new**.
5. **Generality** — instance vs feature vs rewirable. SSOT [`loop-plan/references/fork-checklist.md`](../../loop-plan/references/fork-checklist.md) § Generality. If the topic is not in `DECISIONS.md`, treat it as an edge: one known consumer → log clear-winner (do not ask); ask only on a real tie (two consumers, or owner wants a platform “just in case”).
6. **Edge decisions** — one question per boundary: handoff, ownership, atomicity, precedence vs observed behavior.
7. **Interior** — only where an edge choice already constrains it.

### Ride vs new (default-greenfield check)

For each neighbor, trace the existing loop (or confirm absence), then ask whether this feature **rides** it (same flow/data path, extended) or forks a **parallel/new** one.

**Burden of proof is on greenfield** — state a repo-grounded reason the existing path can't absorb the work (divergent concept, incompatible constraints, unacceptable coupling) before proposing a fork. When no loop exists, greenfield is justified — log it and capture what the new path must not duplicate later.

This is a **scope/boundary** question for the user (riding vs forking changes consistency, divergence risk, coupling). Keep file/mechanism choices with the agent; look at the repo first so the question is concrete. Ask only when it is a true tie (`agent-behavior` § When to ask); otherwise log the clear winner.

## Non-goals are first-class

Name what the feature will **NOT** do and **NOT** touch — often the highest-value part of the brief. Push on two lists, grounding **will NOT touch** in verified behavior when you have it:

- **Will NOT do** — capabilities a reasonable person might assume are included but are deferred or excluded.
- **Will NOT touch** — existing functionality/behavior that stays unchanged.

Mark each **deferred** ("not now") vs **excluded** ("not ever"). Pair as "In: X. Out: Y." When there genuinely are none, say so and move on.

## Roles

The user owns behavior, product feel, direction, priorities, tradeoffs; the agent translates that into code and ties the conversation to what already exists.

Ask about product direction, scope, and boundaries only when the stop list in `agent-behavior` § When to ask applies — ride-vs-new is such a boundary (see above). Reserve file/function/layer/mechanism choices for the agent unless they change product direction or scope.

Share findings plainly ("the app already does X via Y") or uncertainty ("no notifications pipeline found") so boundary questions are informed.
