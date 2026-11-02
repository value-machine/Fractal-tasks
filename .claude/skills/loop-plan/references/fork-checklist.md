# Fork checklist

Used by [`loop-refine`](../../loop-refine/SKILL.md) and [`loop-plan`](../SKILL.md) before any product, scope, or architecture-boundary choice is written into the brief or the plan. Ported from `plan-grill` (v0.42.0) § When a grill question is needed, § Generality, § Mandatory fork checklist, § Ask vs log, and `plan-grill-auto` § Tie resolution. **When** to ask is `agent-behavior` § When to ask; **how** is [`loop-refine/references/asking.md`](../../loop-refine/references/asking.md). Ledger: [`loop-refine/references/decisions-template.md`](../../loop-refine/references/decisions-template.md).

## When a fork exists

A **fork** exists when **any** of these is true for a topic **not** already decided — in the lap's `DECISIONS.md` (Closed or Open) or in a recorded decision (feature README, vision, rule):

| Cue | Examples |
|-----|----------|
| **Scope meaning** | What counts as v1; in vs out; success criteria that change UX |
| **Non-goals** | Capability a reasonable person might assume is included |
| **Neighbor absorption** | Ride existing loop vs new path; which feature owns the data |
| **User-visible behavior** | Which outcome, error, or empty state the user sees |
| **Architecture boundary** | Feature split, layer ownership, sync vs async user-visible contract — when the choice changes product feel, coupling, or what neighbors are touched |
| **Generality** | Composition vs feature module vs rewirable port — how reusable vs specific this capability is (see § Generality). The level name is not permission to encode the caller in an identifier. |
| **About to write it down** | Phase/step text would pick A over B as if decided |

**Not a fork** (decide or route elsewhere):

| Cue | Owner |
|-----|--------|
| Concrete API example, schema field list, RLS policy text | Plan detail — write it; data / irreversible shapes are stop-list items |
| Industry “is this standard?” | [`review-precedent.md`](review-precedent.md) |
| Package/pattern reuse vs custom (library search) | [`spec-reuse-package`](../../spec-reuse-package/SKILL.md) — a new dependency is a stop-list item |
| Helper extract / copy counts | `.claude/rules/code-style.md` § Naming — not this cue |
| Stack/feature replaceability scores after a folder exists | [`deepen-modules.md`](deepen-modules.md) § Replaceability |
| Pure code mechanism with **no** product/scope/boundary effect (local refactor shape) | Agent decides — still prefer a one-line note in plan Notes if non-obvious. **Names** are not a product fork: `.claude/rules/code-style.md` § Naming |

### Generality (composition vs rewirable)

**SSOT for this fork.** Run the checklist on this topic before the brief or the plan assumes a platform or a one-off. Do not silently over-build or under-build.

**Modularity is the default; speculative platforms are not.** Every level below uses composition and a narrow replaceable boundary from the first implementation. Identifier names and copy counts: `.claude/rules/code-style.md` § Naming. The fork decides how much product-specific extension machinery to build, not whether the code is modular.

**Three levels** (later options add stronger product extension machinery):

| Level | Meaning | When |
|-------|---------|------|
| **Composition** | One contextual composition for the known job, built from generic primitives; caller details stay in props, the caller, or a thin wrapper. This level does not name the identifier after that caller. | Default when only one consumer is known now |
| **Feature** | One bounded domain with a public API (checkout start/confirm/fail); thin UIs call it | The work is a domain even with one screen |
| **Rewirable** | Ports for “what is bought / how paid / what success means” so other products plug in | ≥2 product kinds are **in scope now**, or the owner picks future expansion *and* names the second consumer |

**Default:** modular and composable enough to replace or reuse from day one; specific enough to ship the known job. Do not add speculative ports, plugin registries, or unused hooks until a second real consumer exists or is a Closed row. Reuse an established generic primitive immediately; do not wait for duplicate contextual implementations.

| Situation | Classify |
|-----------|----------|
| One known use; second use is a guess | **Clear-winner → composition** (or **feature** if it is already a domain), using generic primitives and a replaceable boundary. Log deferred extension machinery as a non-goal. Do **not** ask. |
| Two known uses, same verbs | **Clear-winner → feature** (one public API, two thin UIs) unless product kinds differ |
| Two known uses, different verbs | **Tie or clear-winner → split features**; share only what both need. Ask if which concepts belong together is Pareto-fair |
| Owner wants a platform “just in case” | **Ask** — `[Wins: least code]` composition vs `[Wins: reusability]` rewirable, with explicit pay lines |

Guessed future use stays a **deferred non-goal** in `DECISIONS.md`. Do not code the unused hook.

**Not this cue:** npm/package reuse (`spec-reuse-package`); extracting a shared helper from repeated business logic (`code-style` § Naming, [`deepen-modules.md`](deepen-modules.md)); scoring how hard a shipped feature is to swap ([`deepen-modules.md`](deepen-modules.md) § Replaceability).

### Mandatory fork checklist (before locking)

Before treating an approach as decided in `loop-refine` or `loop-plan`, run this checklist **out loud in the work** (chat and/or ledger):

1. **Name the topic** in one line (what is being chosen).
2. **Enumerate ≥2 viable options** *or* state why only one option exists after a real search (repo neighbors + obvious alternatives).
3. **Classify:**
   - **Tie** (tradeoff options with distinct `[Wins: …]` axes, **or** a choice the owner owns — placement, preference, what counts as in) → **ask** one question ([`loop-refine/references/asking.md`](../../loop-refine/references/asking.md)) → then Closed. With the away switch on: agent-pick per § Tie resolution, log, continue.
   - **Clear winner** (one option dominates after enumeration) → **log** Closed as `clear-winner` — **no** ask. Do **not** skip the enumeration step.
   - **Precedent-only** → [`review-precedent.md`](review-precedent.md).
4. **Anti-dup:** if the topic is already Closed/Open in `DECISIONS.md` or recorded in a README / vision / rule → skip (a contradiction with a recorded decision is a conflict, not a fork — stop list).
5. **Resume the same step** — ask → write ledger → continue (do not jump ahead).

**Anti-pattern:** Invent one approach, call it clear-winner, never name alternatives. That is a silent lock — forbidden.

**Scale:** at size **M**, before building: `DECISIONS.md` lists every product/scope lock from the plan as a Closed row (asked or clear-winner), **or** one Closed row stating `no product forks — <reason>`.

## Ask vs log

| Situation | Action |
|-----------|--------|
| Tie after enumeration | One question ([`asking.md`](../../loop-refine/references/asking.md)); then Closed. Away switch: agent-pick |
| Clear winner after enumeration | Log Closed `clear-winner`; no question |
| Already in Closed / Open | Skip (anti-dup) |
| Industry/precedent only | [`review-precedent.md`](review-precedent.md) |
| Package/pattern reuse vs custom | `spec-reuse-package` |
| Helper extract / copy counts | `code-style` § Naming |
| Pure mechanism, no product/boundary edge | Agent decides (see “Not a fork”) |

## Tie resolution (away switch)

With the away switch on (`agent-behavior` § When to ask), the agent answers true ties itself. Apply in order; stop at the first that decides.

1. Explicit constraints already in this thread (user text beats inference).
2. Filled `documentation/DOC_APP_VISION.md` (skip if `DRAFT`).
3. Ride the existing neighbor loop unless greenfield has a repo-grounded reason it cannot absorb the work ([`loop-refine/references/grounding.md`](../../loop-refine/references/grounding.md) § Ride vs new).
4. Smallest v1 perimeter that is user-testable.
5. Remaining Pareto set: if the fork is user-visible feel → `[Wins: UX]` matching live neighbor surfaces; else `[Wins: code consistency]` then `[Wins: least code]`.
6. Still tied → first remaining option; notes must say `tie-break: first remaining`.

Question shape and axes follow [`asking.md`](../../loop-refine/references/asking.md). Tradeoff forks need a distinct `[Wins:]` axis per option (common axes are a menu; name the real one). Choice forks (placement, preference) list plain options and skip step 5 when no axis applies.

**Challenge (internal):** for every fork, write the `[Challenge: <assumption>]` line too. If the assumption does not hold up against thread text, vision, or repo evidence, pick the challenge, reopen the row it overturns, and redo that step's checklist. Otherwise log it in notes as `challenge rejected: <one-line why>`.


**Progress line per fork (away switch):** `Fork: <topic> · options: A / B / [Challenge] · Pick: <choice> — <why> · Logged D<n> agent-pick`. Stop-list items are not auto-picked: they park the lap until the owner answers (skill-loop D46).

