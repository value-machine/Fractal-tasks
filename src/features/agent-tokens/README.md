# agent-tokens

## Purpose

Personal agent tokens: a signed-in person creates a named token for each agent (Claude Code, Cursor, …), copies it once together with ready-to-paste MCP settings, sees when each token was last used, and revokes tokens. An MCP write made with such a token is attributed to that person, whatever name the agent types in (the agent's label is kept as "via …").

## Structure

| Layer      | Path                                                                                               | Purpose                                                                                                                |
| ---------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Types      | `types/agentToken.types.ts`                                                                        | `AgentToken` (listing, no secret) and `CreatedAgentToken` (secret, shown once)                                         |
| Services   | `services/agentTokenApiService.ts`                                                                 | `/api/me/tokens` client; sends the person's Supabase session token, not the public key                                 |
| Services   | `services/mcpClientConfig.ts`                                                                      | Claude Code command and `mcpServers` JSON for a token                                                                  |
| Hooks      | `hooks/useAgentTokens.ts`, `hooks/useMcpClientSnippets.ts`                                         | TanStack Query list + create/revoke (server record merged with `setQueryData`); snippets                               |
| Components | `components/AgentTokensPanel.tsx`, `PublicNameForm.tsx`, `NewTokenReveal.tsx`, `CopyableBlock.tsx` | Public name first (chosen by the person, never their email), then create form, one-time reveal, token list with revoke |

Page (thin): `src/pages/agents/AgentTokensPage.tsx` at `/agents`, linked from the profile menu; signed-out visitors see the sign-in panel.

## Dependencies

- Edge Function `point-at`: `GET/POST /api/me/tokens`, `DELETE /api/me/tokens/:id` (`supabase/functions/point-at/index.ts`); tokens are hashed in `agent_tokens` (`supabase/migrations/20261110100000_point_at_contributors.sql`, logic in `supabase/functions/_shared/pointAt/contributors.ts`).
- Shared: `src/shared/services/pointAtFunctionService.ts` (function URL, region pin), `src/shared/hooks/usePointAtMcpUrl.ts`, `getSupabase` session, `formatRelativeTime`.
- Kit components `Card`, `Input`, `Button`, `Alert`, `Badge`; `lucide-react` icons.

## Decisions

- Tokens, not OAuth, for now (owner, 2026-11-10): they work in every MCP client, including Claude Code cloud sessions. Lap decisions: `documentation/jobs/temp_job_contributor-identity/DECISIONS.md`.
- The secret is shown once and stored only as a SHA-256 hash; the list shows a short prefix.
- People choose their public name before their first token (prefilled from GitHub or Google, never from the email address), because the tree is public. A name change applies to future writes only.
- Mutations use the server's canonical record with `setQueryData`; nothing is optimistic, because a token only exists once the server made it.
