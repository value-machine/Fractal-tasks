# Rules Index

Quick reference guide to all rules and their relationships.

## Rule Categories

### Code Style (`.claude/rules/code-style.md`)
- **Naming** (SSOT, F1–F6): name by role, mark the 2nd copy, extract the 3rd+; guidance updates in the same change
- Formatting standards
- Documentation requirements
- Code organization
- **What tooling enforces** (Prettier, `eslint.config.js`, tsc, dependency-cruiser) — run the command
- **Styling scope** (agent picks the scope, global tokens by default, and reports it)
- **Complexity thresholds** (SSOT `eslint.config.js`)
- Reuse and extraction checks

**Related to:** All other rules

---

### Architecture (`.claude/rules/architecture.md`)
- **Proactive design checks:** pattern risk (precedent review, `loop-plan`), don't reinvent the wheel, performance cost risk, layer consistency (workaround guard; naming via `code-style` § Naming)
- **Code placement**, edge-case placement, import direction
- **Folder structure** and **path aliases** (SSOT: `@/*` → `src/*` only)
- **Feature granularity / bounded context** (budgets in `featureBudgets.config.cjs`, cross-feature imports)
- **TanStack Query optimistic + canonical merge** (summary; playbook SSOT `documentation/DOC_TANSTACK_QUERY.md`)
- Changing architecture rules/configs; architecture docs

**Related to:** code-style, testing, security

---

### Testing (`.claude/rules/testing.md`)
- **Onboarding guide:** `documentation/DOC_TESTING.md` (runners, colocation, naming, examples)
- Test authority (failing test = claim, not ground truth)
- Local test authority (commit vs merge tiers)
- Test coverage requirements
- Testing patterns
- Test organization
- Quality standards

**Related to:** code-style, architecture

---

### Security (`.claude/rules/security.md`)
- Authentication & authorization
- Input validation
- Data protection
- Vulnerability prevention

**Related to:** architecture, code-style

---

### Git workflow (`.claude/rules/git-workflow.md`)
- **Branch and release strategy** (SSOT: § Mode behavior table — Model C default, A/B selectable; config: `src/config/git-workflow.json`)
- Branch protection, PR standards (Model A), merge diagnostics
- Stop 2 surface + production per mode (owner's Pass → C: merge the PR; A/B: **Promote to production**)
- Commit/push/PR flow pointers (`loop-ship` for semver/changelog SSOT)

**Related to:** agent-behavior, platform

---

### Agent behavior (`.claude/rules/agent-behavior.md`)
- Protected files manifest (single SSOT)
- **When to ask** (SSOT): what counts as a choice + the owner stop list; how to ask
- Success reporting (verified vs unverified)
- Agent role and control

**Related to:** git-workflow, debugging

---

### Platform (`.claude/rules/platform.md`)
- Which shell rules apply (read the platform; Windows PowerShell / Git Bash vs plain bash)
- PowerShell command rules, `$LASTEXITCODE` handling
- Environment variable catalog (`VITE_*`, Supabase, Edge secrets)

**Related to:** git-workflow, security

---

### Cloud Functions (`.claude/rules/cloud-functions.md`)
- **When to use Edge Functions** vs frontend logic (decision framework)
- Function organization by business capability
- Deployment model and fragility considerations
- Testing strategy and migration paths

**Related to:** architecture, security

---

### Database (`.claude/rules/database.md`)
- **SQL migrations only** (`supabase/migrations/`) — not client queries or TanStack
- Safe migration patterns (idempotent, handles fresh/existing databases)
- New-table checklist (RLS, indexes, type generation)
- Layer boundaries (pointers to `.claude/rules/architecture.md`, `DOC_TANSTACK_QUERY.md`)
- Testing migrations (fresh database and incremental updates)
- Error handling and logging patterns

**Related to:** security, architecture

---

### API Integration (`.claude/rules/api-integration.md`)
- **MCP-first check** before assuming REST/scripts/browser fetch is the only path
- Doc-freshness (don't trust cached/stale docs)
- Cite doc URL(s) or MCP tool(s) actually used
- POC-before-code for new/unfamiliar vendors
- Pointer to `.agents/skills/loop-plan/references/research-api.md` for the full procedure (MCP fallback decision tree, schema→sample discipline, vendor worked examples)
- Absorbs the former workflow rule § Documentation Lookup

**Related to:** security, database, cloud-functions, project-specific

---

### Debugging (`.claude/rules/debugging.md`)
- Debugging strategies and logging practices
- Pointer to the `spec-debug-runtime` skill for the scientific-method procedure
- Reductive strategy for bugs and new features

**Related to:** testing, architecture

---

### Project-Specific (`.claude/rules/project-specific.md`)
- Rate limiting patterns for Edge Functions
- Project-specific security implementations
- Implementation examples and checklists

**Related to:** security, cloud-functions, database

---

### File Placement (`.claude/rules/file-placement.md`)
- **Validate file and folder placement before creation** (mandatory pre-creation check)
- Project structure validation using `projectStructure.config.cjs`
- Architecture compliance verification
- Guidance for correct file/folder locations
- **Feature-local README (Option 1):** SSOT `documentation/DOC_FEATURE_LOCAL_README.md`; `pnpm validate:feature-docs` / `validate:feature-docs:strict` / `validate:feature-docs:staged`
- **Feature size / granularity:** SSOT `featureBudgets.config.cjs`; `pnpm validate:feature-size` / `validate:feature-size:staged`; see `.claude/rules/architecture.md` § Feature granularity

**Related to:** architecture

---

## Consistency Check Matrix

When modifying a rule, check these related rules:

| Rule | Check These Rules |
|------|-------------------|
| `code-style` | architecture, testing |
| `architecture` | code-style, testing, security, cloud-functions, database |
| `testing` | code-style, architecture, debugging |
| `security` | architecture, code-style, cloud-functions, database, project-specific, api-integration |
| `git-workflow` | agent-behavior, platform, cloud-functions, testing |
| `agent-behavior` | git-workflow, debugging, loop-ship + loop-verdict skills |
| `platform` | git-workflow, security |
| `cloud-functions` | architecture, security, project-specific |
| `database` | security, architecture |
| `api-integration` | security, database, cloud-functions, project-specific |
| `debugging` | testing, architecture |
| `project-specific` | security, cloud-functions, database |
| `file-placement` | architecture |

## Adding a New Rule

1. Create `.claude/rules/<name>.md`. No frontmatter = always on; add `paths:` (list of globs) to load it only for matching files. Prefer a skill in `.agents/skills/<name>/` when the guidance is a procedure, not a constraint.
2. Add a "Related Rules" section at the bottom.
3. Add a row to the `AGENTS.md` catalog (that row is the description SSOT) and a section here.
4. Update related rules to reference the new rule.
5. Commit: the pre-commit hook generates `.cursor/rules/<name>.mdc` (or run `node scripts/sync-agent-config.mjs`).
