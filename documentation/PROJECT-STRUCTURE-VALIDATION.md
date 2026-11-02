# Project structure validation

This repo enforces a **whitelist** of allowed folders and files. Anything not defined in the configuration is a violation — agents and humans must validate placement **before** creating new paths.

## What runs

| Command | Scope | When to use |
|---------|--------|-------------|
| `pnpm validate:structure` | Full repository | Before large refactors, after editing `projectStructure.config.cjs`, or when troubleshooting CI structure failures |
| `pnpm validate:structure:staged` | Staged paths only | Pre-commit (automatic); quick check while iterating on a few new files |
| `pnpm validate:all` | Structure + architecture checks | Broader local gate before a big PR |
| `pnpm validate:feature-size` | Per-feature file budgets | After adding many files under `src/features/*` |
| `pnpm validate:feature-docs` | Feature `README.md` presence | After feature code changes; pre-commit runs staged variant |

`validate:structure` also runs `validate:git-workflow` (checks `src/config/git-workflow.json` shape).

## Single sources of truth

| Topic | Location |
|-------|----------|
| Allowed paths and naming patterns | `projectStructure.config.cjs` |
| Validator implementation | `scripts/project-structure-validator.js` |
| Where to put new files (workflow) | `.claude/rules/file-placement.md` |
| Layer boundaries and feature budgets | `.claude/rules/architecture.md` |
| Feature README contract | `documentation/DOC_FEATURE_LOCAL_README.md` |
| Architecture overview (root doc) | `ARCHITECTURE.md` |

Do not duplicate rule bodies here — open the SSOT files above for placement tables and layer rules.

## When agents must run it

1. **Before creating** any file or folder outside familiar locations (mandatory per file-placement rule).
2. **After** proposing new top-level or `src/` subtrees — confirm the whitelist allows them or stop and ask the user to approve a config change.
3. **When CI fails** on `validate:structure` — read the reported path and fix placement or whitelist (protected config needs explicit user approval).

Humans: pre-commit runs `validate:structure:staged` on relevant staged files; run full `validate:structure` before merging large structural PRs.

## Common failures and fixes

### "File not allowed" / unknown path

- **Wrong folder:** Move the file to an allowed location per `.claude/rules/file-placement.md` (e.g. pages under `src/pages/<Name>/<Name>Page.tsx`, feature code under `src/features/<feature>/`).
- **Missing whitelist entry:** Legitimate new structure requires updating `projectStructure.config.cjs` — **protected**; get user approval first.
- **Stray build artifact:** Add it to the tracked `.gitignore` — the validator skips untracked paths the repo's `.gitignore` files ignore (personal excludes do not count). `DEFAULT_IGNORE_PATTERNS` in `scripts/project-structure-validator.js` is only the fallback when git is unavailable (see file-placement rule § Tooling artifacts).

### Feature size budget exceeded

- Split the feature into smaller bounded contexts, or add a justified waiver in `featureBudgets.config.cjs` (see architecture rule § Feature granularity).

### Missing feature `README.md`

- Add or update `src/features/<feature>/README.md` when feature code changes; run `pnpm validate:feature-docs:staged` before commit.

### Temporary files

- Use the `temp_` prefix for disposable artifacts; temporary **docs** belong under `documentation/jobs/` or `documentation/temp/` (not `documentation/` root without `DOC_` prefix).

## Related validation

- **Doc references in rules/skills:** `pnpm validate:docs` (`scripts/validate-cursor-doc-references.js`)
- **Layer boundaries:** `pnpm arch:check` (dependency-cruiser) + `no-restricted-imports` in `pnpm lint`
- **Contributing workflow:** `documentation/DOC_CONTRIBUTING.md`

## See also

- `documentation/DOC_CONTRIBUTING.md` — contributor workflow and git mode
- `.claude/rules/file-placement.md` — STOP → CHECK → VALIDATE → CREATE workflow
- `.claude/rules/architecture.md` — directory map and import direction
