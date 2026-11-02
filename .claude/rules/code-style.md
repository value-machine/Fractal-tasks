# Code Style Standards

## Enforced by tooling (don't hand-check — run the command)

- **Formatting** — Prettier (`.prettierrc.json`: double quotes, `(x) => x` arrow parens, LF line endings, width 100). `pnpm format`.
- **Lint** — `eslint.config.js` (flat config, extends GTS; SSOT): `===`, no `var`, `prefer-const`; feature components can't import feature services, feature hooks can't import feature components, and `components/common` can't import features (error); `react-hooks/rules-of-hooks` (error), `react-hooks/exhaustive-deps` (warn); hardcoded colors in class strings and `style` props (warn); `@tanstack/query/exhaustive-deps` (warn); complexity (warn, below). `pnpm lint` / `pnpm lint:fix`.
- **Types** — TypeScript `strict` plus `noUnusedLocals` / `noUnusedParameters` (prefix intentionally unused params with `_`). `pnpm type-check`.
- **Layers, cycles, `@/` alias** — dependency-cruiser (`pnpm arch:check`) and `.claude/rules/architecture.md`.

Pre-commit runs these on staged files; CI runs them in full. Fix errors; warnings are acceptable but don't add new ones.

## Naming

The single statement of how to name shared code and when a copy must be extracted. Other rules and skills point here; do not copy these thresholds anywhere else.

**When:** before adding or copying a function, hook, component, type, file, or feature folder, and before writing a placement line, example, glob, or router trigger that tells later work where that kind of code goes. A small edit, a one-off, and "match the neighboring file" all still apply.

- **F1 — Name by role, not by caller.** A shared mechanism is named for what it does (`useRadialMenu`), not for its first consumer (`useTradeOrbit`). A feature-specific name fits only code that truly belongs to that one feature. Test titles may name the scenario (`should … when …`). Vague names (`handleData`, `processItem`, `ThingManager`) don't count as role names.
- **F2 — Notice at 2, extract at 3 and beyond.**
  1. **First copy:** a specific name is fine. If it is plausibly a reusable mechanism (menu, timer, queue, layout primitive, or a similar shared widget), use the role name from the start.
  2. **Second copy:** allowed. Leave a visible marker (a comment or tracked TODO) naming the other copy, so the next agent sees the pattern.
  3. **Third copy and every one after:** not allowed. Pull the shared part into one place named for its role, even when leaving the copies would be simpler.

  These don't override F2: "skip small changes", "don't over-engineer a one-off", "prefer duplication", "match neighboring names", "mirror the closest implementation". Matching an existing file means matching its layer and folder. Do not copy a neighbor's feature prefix onto a shared mechanism.
- **F3 — Extraction includes a naming pass.** When logic moves to a shared module, re-evaluate its name at the new reuse level and rename it if it still encodes the first consumer. Leave no alias named after the original feature unless it is marked deprecated with a removal note. "Minimize the diff", "don't rename files", and "avoid unrelated churn" don't skip this pass.
- **F4 — Guidance is in the blast radius.** A rename or extraction isn't done until every reference in `AGENTS.md`, the router, skills, rules, placement tables, examples, and match or route patterns is updated in the same change. Those reference updates need no separate approval (`.claude/rules/agent-behavior.md` § Protected Files); any other edit to those files still stops for approval.
- **F5 — Guidance cites roles and locations.** Placement tables and routing say where a role lives ("radial menu primitives live in `<dir>/`"), not "add menus to `useTradeOrbit.ts`". A concrete file is cited only as a labeled example, never as the canonical home.
- **F6 — Match on categories.** Globs, path patterns, and router triggers match directories or category terms, never an instance name alone.

**When an extract or rename is required:** (1) extract the shared logic; (2) rename it to the role, with a deprecated alias only if needed and a removal note; (3) search all guidance and routing patterns for the old name and update them; (4) remove the second-copy markers the extraction resolved.

**Unchanged by this section:** layer rules, complexity limits, and the ban on speculative extracts it doesn't require. `spec-optimize-performance` owns hotspot design, not these thresholds.

**Syntax:**

- camelCase variables/functions, UPPER_SNAKE_CASE constants, PascalCase types/interfaces (no `I` prefix unless it adds clarity). Interfaces for objects, types for unions.
- Files: components `ItemList.tsx`, hooks `useItems.ts`, services `itemService.ts`, types `item.types.ts` (case and suffix only — not destinations).
- **Generic core, contextual edge:** a reusable control takes its role name from the skill (e.g. `TextInput`); context (`label`, validation, data binding) stays in props, the caller, or a thin wrapper (e.g. `ItemDescriptionField`). No plugin registries or unused ports until a second consumer exists.

## TypeScript

- No `any`: use a narrow type, `unknown`, or a local interface. Last resort for third-party gaps: `// eslint-disable-next-line @typescript-eslint/no-explicit-any` with a one-line justification.
- Explicit return types on exported and async functions; JSDoc on exported functions and types (explain *why*, not *what*).
- Catch errors as `unknown` and narrow; mark intentionally un-awaited promises with `void`.
- Services are pure functions — no React hooks.
- Imports: external first, then `@/` internal; `import type` for types; prefer named exports. Before importing a package, confirm it is in `package.json` — types for wrapped libraries often come from the wrapper (e.g. TipTap via `@tiptap/react`).

## Reuse and extraction

- Search for an existing component/hook/utility before adding one, and say which ones you checked.
- When extracting to a new file, trace **every** usage of each moved state, setter, and function (watch error-clearing callbacks, resets, and setters used in handlers): each either moves with the extraction or is exposed in its return value/props. Then confirm every reference in the original file still resolves.

## Styling scope

Pick the scope of a styling change yourself — global tokens by default, since that is the usual intent — and state the scope you used when reporting the change. Ask only per `.claude/rules/agent-behavior.md` § When to ask (for example, when it conflicts with a recorded design decision).

| Scope | Where | Use for |
|-------|-------|---------|
| Global tokens | DTCG token files in `src/shared/theme/tokens/` → `pnpm tokens:build` (guide: `documentation/DOC_THEMING.md`) | Colors, radius, fonts, shadows, motion |
| Component | Kit variants (`cva`) in `src/components/common/<Name>/<Name>.tsx` | How every usage of a kit component (or one variant) looks |
| Instance | `className` on one usage (merge with `cn()`) | Layout and spacing only (margin, padding, position, width) — never colors or typography |

`radix-ui` is imported only by kit components in `src/components/common/` (enforced: `stack-port-radix`, `pnpm arch:check`).

## Complexity

Thresholds (SSOT `eslint.config.js`, warnings in `pnpm lint`):

| Metric | Limit |
|--------|-------|
| Cyclomatic complexity | ≤ 10 |
| Cognitive complexity | ≤ 15 |
| Nesting depth | ≤ 4 |
| Function length | ≤ 100 lines (excluding blanks and comments) |
| Parameters | ≤ 3 (use an options object) |
| Statements | ≤ 15 |

Reduce with early returns/guard clauses, helper extraction, and options objects; full workflow in `.agents/skills/spec-optimize-performance/SKILL.md`.

## Related Rules

When modifying this rule, check `architecture`, `testing`, `.agents/skills/spec-optimize-performance/SKILL.md`, and `.agents/skills/spec-check-layer/SKILL.md`.
