# Research an external API or vendor

Read in [`loop-plan`](../SKILL.md) when the work integrates an unfamiliar vendor, API or backend. Ported from `api-integrate` (v0.42.0). Principles: `.claude/rules/api-integration.md` (MCP-first, doc freshness, POC before code). If a maintained client or SDK might already cover the work, run [`spec-reuse-package`](../../spec-reuse-package/SKILL.md) first; adding it is a stop-list item (new dependency). For a stack the repo already runs on, use that stack's plugin skill (`supabase`, `cloudflare`, `wrangler`) instead. New paid usage or a new external service is a stop-list item (cost / external service).

**Always do Phase 1 (schema / contract) before Phase 2 (sample / wire shape):** you need to know what exists before you fetch real values. The result goes into the plan's Conflict & compliance. A risky assumption becomes the plan's first phase, a minimal POC (foundation validation).

## Security (both phases)

- Never print API keys or raw `.env` lines.
- Redact PII in any sample output; prefer 1–3 records, a fields allowlist when the vendor supports one, and truncate in chat.
- Do not commit raw response samples without review.

---

## Phase 0 — Locate

Find the official docs URL, OpenAPI/GraphQL spec, or SDK for the vendor. Then check whether an MCP server already covers it — **before** assuming REST/browser fetch is the only path.

1. List the MCP tools registered in this workspace (Cursor: `GetMcpTools`; Claude Code: the tool list / `ToolSearch`) and look for the vendor name.
2. Decide which path this vendor falls into using the fallback decision tree below.

### MCP fallback decision tree

| Situation | Action |
|---|---|
| **No server matches the vendor name** | Use docs/REST/scripts. State explicitly: "no MCP server found for `<vendor>`" — make the gap visible, don't silently assume none exists. |
| **A server matches but reports `needsAuth` / `error` / `loading`** (per the MCP meta-tool `serverStatus`) | Treat as unusable. Do not retry indefinitely. Fall back to docs/REST/scripts and state which server was skipped and why. |
| **A server matches and looks usable, but the specific tool call fails** (auth, rate limit, wrong project/scope) | Fall back after one retry. State the failure — never silently trust a stale or partial result. |
| **Multiple servers match the same vendor** (e.g. a stack plugin skill's MCP server vs a fork's own project-specific server) | Prefer the one scoped to the environment actually being worked in. State which was chosen and why. Never hardcode a fork-specific server name as *the* default — see the Supabase worked example. |

**Always report which path was used** (MCP tool name, or REST/script/docs) in your output — the choice must be auditable, not implicit.

---

## Phase 1 — Schema / contract (what exists)

Answer **what exists**: endpoints, auth method, required fields, types, linked/nested structures — from docs or MCP schema tools, **not memory**. No request bodies or row data yet.

### Output template

```markdown
## Scope
[Vendor / feature]

## Contract
- Path used: [MCP tool name(s), or docs URL(s) / REST endpoint(s)]
- Auth method: [...]
- Endpoints / resources relevant to this task: [...]
- Types / required fields: [...]

## Code alignment
- Matches existing service code (if any): [...]
- Gaps: [...]

## Follow-up
- [Sample phase scope, or back to the plan]
```

---

## Phase 2 — Sample / wire shape (what values look like)

See **actual shapes**: pagination envelope, error format, nested/linked structures — via one real MCP tool call, a minimal script, or a documented example. Only meaningful once Phase 1 told you what to ask for.

- Prefer the smallest possible call (1-3 records/rows, narrow field selection when the vendor supports it).
- Note where the app's normalization layer (if any) differs from the raw wire shape — reading app code alone shows app behavior, not necessarily what the vendor actually returns today.

---

## Worked examples

- [`vendor-supabase.md`](vendor-supabase.md) — MCP path (schema and docs tools available).

Add a vendor as a new `vendor-<slug>.md` file beside this one (the `references/` folder allows flat `*.md` files only).
