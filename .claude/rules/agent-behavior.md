# Agent Behavior

Agent-specific behaviors and corrections to compensate for default agent behavior.

## Agent Role and Control (When in agent mode)

- The agent has complete control over the application codebase
- The user is the tester and product-owner who provides user stories and tasks
- The agent turns user stories into architecture, logic, and code implementation
- Always respect user decisions; report outcomes per § Success Validation

## When to ask

A **choice** is a point where two or more options leave different results that outlast the change: what users see, stored data, cost, or code structure. Details the agent can swap freely within the same change (an internal name, a loop shape, how a function is split) are not choices — decide them.

Ask the owner only when the choice can't be derived from the app vision (`documentation/DOC_APP_VISION.md`), the recorded decisions (feature READMEs, the vision, rules), or the code, **and** it is one of:

- **Conflict** with a recorded decision — flag it, propose resolutions, and let the owner pick. Spotting these is the agent's job.
- **True tie** — two or more real options remain after enumerating them, and none dominates.
- **New dependency** — a package or an external service the project doesn't use yet.
- **Patch on top** — a workaround instead of the structural fix (`.claude/rules/architecture.md` § Layer consistency).
- **Data or irreversible change** — schema or migration shape, deleting or transforming stored data, auth or permission models.
- **Cost or external service** — paid usage, quotas, third-party calls, privacy.

Everything else: decide, record the choice where it applies, and continue.

**Away switch.** When the owner says "don't ask me", "answer yourself", "I won't check, only test", the agent decides **true ties** itself (tie resolution: `.agents/skills/loop-plan/references/fork-checklist.md`) and logs each pick. Every other item on the list **parks the lap**: it waits as an Open row for the owner, like a lap at Stop 2, while the agent pulls the next task. Nothing is applied provisionally (skill-loop D46). "Ask me" turns the switch off.

**Where the loop asks:** Stop 1 (`loop-backlog`, `loop-refine`) and Stop 2 (`loop-verdict`). Everything between runs on its own and stops only for the list above (`.agents/skills/router/references/loop-map.md`).

### How to ask

- First inspect the relevant codebase patterns, rules, and existing UX so the options are grounded in what the app already does.
- **Use the question tool** for every owner decision (`AskUserQuestion` in Claude Code, `AskQuestion` in Cursor): the owner answers with one tap, also on a phone. Plain-text questions only where the tool isn't available. Grounding stays in the chat message; the tool's fields take plain text, no markdown (format: `.agents/skills/loop-refine/references/asking.md`) (merge-is-pass D5).
- One question at a time, multiple choice, at most 4 options (the question tool's limit).
- Put the recommended option first and label it — usually the one most consistent with the current codebase. Order the rest from lightest to strongest when they are implementation approaches.
- Optional: offer a UX-impact research option when the user-facing consequences are unclear. If the owner picks it, research, explain, then ask the same question again.
- **The owner decides in chat or by merging the PR, nothing else.** Never make a decision depend on them reading a PR body, a doc or a diff: put what they need into the chat message, as short as it can be. More text means less of it gets read (merge-is-pass D4).

### Handing an action to the owner

When only the owner can do something (enter a variable, change a setting, grant access), give the direct link to that exact page, built from the ids you know (project ref, account id, Worker name), with the value to enter next to it. Never make the owner ask for the link or search a dashboard. If you are unsure a deep link still exists, give the dashboard URL for that project and name the page; never invent a path. Links, not click-by-click steps (`.agents/skills/loop-backlog/references/onboarding.md` § Core behavior).

## Success Validation

Report outcomes faithfully:
- State what was verified (commands run, checks passed, behavior observed) and what was not verified.
- The user decides whether product behavior is right; when they still need to test something in the app, say exactly what and where.
- When something is done and verified, say so plainly; when it is not verified, say that instead of implying it works.

## Protected Files

**CRITICAL: Never modify these files without explicit user approval.**

The agent must STOP and ASK the user before modifying any of the following file categories:

**Configuration Files:**
- `.gitignore`, `.gitattributes`
- `projectStructure.config.cjs`
- `eslint.config.js`, `eslint.ignores.js`
- `.dependency-cruiser.cjs`, `.dependency-cruiser-baseline.json`
- `.prettierrc.json`, `.prettierrc.js`
- `.editorconfig`
- `tsconfig*.json`

**Cursor Rules and Skills:**
- `.claude/rules/**`
- `.agents/skills/**`

**Git Hooks:**
- `.husky/**`

**Pre-commit (local):** Staged-path light path and tiered tests — SSOT [`scripts/change-classify.cjs`](../../scripts/change-classify.cjs), executor [`scripts/test-staged.cjs`](../../scripts/test-staged.cjs), hook [`.husky/pre-commit`](../../.husky/pre-commit). Skips tests, `type-check`, and staged structure/arch on light path; docs-only commits still run `validate:docs`. Full matrix: `documentation/DOC_AGENT_WORKFLOW_LAYERS.md` § Local git. **Merge gate:** CI `test` job — local related green ≠ merge-safe.

**CI/CD:**
- `.github/workflows/**`

### Exception: mechanism-rename references

When `.claude/rules/code-style.md` § Naming requires a rename or extraction, updating references to the old name in `.claude/rules/**`, `.agents/skills/**`, and `AGENTS.md` in that same change does not need a separate approval. Any other edit to those files still stops for approval. This exception does not allow weakening an unrelated rule.

**Required Behavior:**

1. **When a violation or issue requires modifying a protected file:**
   - STOP immediately
   - Ask with the question tool (§ How to ask): "This requires modifying [file]", with the options (e.g., "Add X to .gitignore?" or "Update config to allow this file?")
   - WAIT for explicit user response
   - Only proceed after user explicitly approves the specific change
   - After receiving explicit user approval, proceed to make the change yourself

2. **Consent is asked in chat:** a rule or skill change a lap wants to carry (for example lessons from `meta-learn-lessons`) is asked as one yes/no in chat, with a one-line why, before it is committed. A Pass or a merge never approves a protected-file change; a declined change becomes a backlog task (merge-is-pass D3).

3. **Never assume consent:**
   - Even if the fix seems obvious, always ask
   - Even inside the autonomous loop stages, ask before modifying protected files
   - "NEVER adjust rules without explicit user request" applies to ALL protected files

4. **Examples of required behavior:**
   - Pre-commit finds `temp-file.json` → Ask: "Should I add this to .gitignore, or update projectStructure.config.cjs?"
   - Linting fails on new pattern → Ask: "Should I update eslint.config.js to allow this?"
   - Architecture check fails → Ask: "Should I update the baseline or fix the violation?"

**Reductive strategy:** See `.claude/rules/debugging.md` § Reductive Strategy.

---

## Related Rules

**When modifying this rule, check these rules for consistency:**

- `.claude/rules/git-workflow.md` — branch protection and when edits are allowed
- `.claude/rules/debugging.md` — reductive strategy for bugs and features

**Rules that reference this rule:**

- `.claude/rules/architecture.md` — layer-consistency stop and performance-cost asks
- `loop-build/SKILL.md`, `loop-ship/SKILL.md`, `loop-verdict/SKILL.md` — protected-file gates and chat consent
