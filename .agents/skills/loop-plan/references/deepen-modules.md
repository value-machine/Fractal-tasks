# Deepen modules — cleaning the foundation a change builds on

Read when the modules a change touches are shallow, duplicated, badly named, misplaced, or hard to replace (skill-loop D21). The cleanup becomes part of the plan and counts toward the size (skill-loop D12). It is not a separate job and not an owner stop, unless choosing the patch instead of the cleanup is the question (stop list: patch on top).

Sources: TMI-apps/MILA `improve-codebase-architecture` (deep-module lens), `consolidate` and `modularity-review` (v0.42.0). Vocabulary: [`module-language.md`](module-language.md) — use **module, interface, depth, seam, adapter, leverage, locality** exactly. Copy counts and names: `.claude/rules/code-style.md` § Naming (never restate them here).

## Contents

1. Scope · 2. Find friction · 3. Classify · 4. Decide · 5. Plan the cleanup · 6. Replaceability · 7. Anti-patterns

## 1. Scope

**Focus set** = the files the brief's edges touch ∪ their 1-hop callers ∪ their 1-hop callees under `src/`. Not transitive. **Sweep** `src/` for more copies of any pattern found in the focus set: in-focus hits go into the plan, out-of-focus hits are listed as "also exists" and become a backlog task when they are worth it, never a silent widening.

## 2. Find friction

- **Shallow modules:** an interface nearly as complex as its implementation. Apply the **deletion test**: if deleting the module just moves complexity, it was a pass-through; if complexity would reappear across N callers, it earns its keep.
- **Bouncing:** understanding one concept means opening many small modules (traceability budget: a feature should be traceable in ≤ 5 files).
- **Leaky seams:** tightly coupled modules reaching across their interfaces; pure functions extracted for testability while the bugs live in how they're called (no locality).
- **Repetition lenses:** similar names or roles across features (`use*TableModel`, `*Filters.tsx`); import clusters (3+ files importing the same 3+ modules); repeated shapes (fetch → transform → expose, loading / error / empty handling); the same concern solved two ways; a shared utility that exists but isn't used everywhere; files that always change together (`git log --since="60 days ago" --name-only`).
- **Wrong place:** code in the wrong layer or feature, or mixing concerns. See [`semantic-placement.md`](semantic-placement.md).

## 3. Classify

| Type | Definition | Typical fix |
|---|---|---|
| **Literal** | Copy-pasted, near-identical code | Extract to `src/shared/utils/` (or the right shared layer) |
| **Structural** | Different code following the same shape | Shared base hook or parameterized utility |
| **Conceptual** | Several mechanisms solving the same problem | Standardize on one |
| **Inconsistent usage** | A shared utility exists but isn't used everywhere | Adopt the existing one |
| **Shallow** | Interface ≈ implementation | Merge into a deeper module behind a smaller interface |

Record per finding: what, where (in-focus / out-of-focus), type, frequency (all sweep hits), and variance (what differs).

## 4. Decide

- **Naming rule first:** if `code-style` § Naming forbids keeping the copies (a third copy, or a first-consumer name on shared code), the verdict is extract. Accepted duplication is allowed only where that rule allows it.
- **Otherwise score** with [`warrant-rubric.md`](warrant-rubric.md) (hard gates first, then `2×Frequency + 2×Stability + 2×Simplicity + 3×Sameness + 2×SharedBoundary`). ≥ 12 consolidate · 8–11 only if simple · ≤ 7 accept and document.
- **Divergence:** copies that will need to evolve differently stay separate.
- **Coupling cost:** don't make independent features depend on each other. Extract to a lower shared layer instead.
- **Lowest-cost form that works:** accept → standardize the convention → extract a utility → parameterized hook or component. A configurable factory is a last resort, and five or more parameters is a smell.
- **Existing shared code first:** extend what `src/shared/`, `src/components/common/` or `src/lib/` already has before creating new.
- **Speculative extracts stay out**, along with ports with one adapter ("one adapter = hypothetical seam; two adapters = real seam").

## 5. Plan the cleanup

For each accepted candidate, add plan steps that:

1. Place the shared module per `architecture` rule (layer, `@/` alias, whitelist, no cycles).
2. Pick the dependency strategy at the seam: **in-process** (merge and test through the new interface) · **local-substitutable** (test with the local stand-in) · **remote but owned** (port + production adapter + in-memory adapter) · **true external** (injected port + mock adapter).
3. Migrate consumers one at a time, verifying lint and type-check after each, and remove the old copies only after the last consumer has moved.
4. **Replace, don't layer, tests:** tests at the deepened module's interface replace the old unit tests on the shallow parts. The interface is the test surface.
5. Do the naming pass (`code-style` § Naming F3–F4) and update the feature READMEs.

To compare alternative interfaces for a deepened module, see [`interface-design.md`](interface-design.md).

## 6. Replaceability

When the change adds a `src/features/` folder or a new UI or data vendor:

1. `pnpm arch:check` runs the stack-port ratchet (`stack-port-radix`, `stack-port-supabase`). Existing leaks are baselined.
2. `pnpm modularity:report` prints Score A (features) and Score B (stack file counts). Definitions: [`modularity-scores.md`](modularity-scores.md). Report both tables and never blend them.
3. A new npm UI or data client with no port rule: plan a `forbidden` row in `.dependency-cruiser.cjs`. It's a protected file, so it needs the owner (stop list: protected-file consent).
4. Don't unwrap `radix-ui`, swap Vite, or rewrite baselines (`pnpm arch:baseline`, `--write-baseline`) unless the lap is about that.

## 7. Anti-patterns

Premature abstraction (extracting before checking divergence) · god utilities (20+ exports) · abstraction harder to read than the copies · forcing variance into flags or modes · big-bang migration · a transitive neighborhood · silently migrating out-of-focus copies · skipping the sweep.
