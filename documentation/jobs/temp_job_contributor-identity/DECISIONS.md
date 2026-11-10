# Decisions — contributor-identity

| # | Decision | Why | Who |
|---|---|---|---|
| D1 | Personal agent tokens, created after signing in on the site; OAuth for MCP later | Works in every MCP client, including Claude Code cloud sessions that only take a custom MCP with headers | Owner, 2026-11-10 |
| D2 | Sign in with email link and GitHub; Google stays because the shared project already has it | Email link works for anyone, GitHub is one click; no passwords to reset | Owner, 2026-11-10 (Google kept by agent, removable) |
| D3 | Tokens stored as SHA-256 hashes with a short visible prefix; shown once at creation | A database leak does not leak usable tokens; the prefix lets people tell tokens apart | Agent (standard practice for API tokens) |
| D4 | Actor = contributor display name; the agent's own label becomes "via <label>" | Writes are attributed to a person, while the log still shows which agent acted | Agent |
