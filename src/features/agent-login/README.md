# agent-login

## Purpose

Agent login (OAuth): a person pastes only the Point At MCP URL into their agent tool (Claude, Cursor, Claude Code) and approves once in the browser; from then on the agent works in Point At in their name. No token to copy. Owner decision 2026-11-11.

Flow: the MCP endpoint answers 401 with where to log in (`/.well-known/oauth-protected-resource` in the point-at function), the tool registers with Supabase Auth's OAuth 2.1 server, Supabase sends the person to the Site URL plus `/oauth/consent`. The Site URL is inventhor.com (the project is shared), so a Cloudflare redirect on inventhor.com forwards `/oauth/consent` here. After "Allow", Supabase gives the tool an access token, which the function accepts.

## Structure

| Layer      | Path                                | Purpose                                                                                          |
| ---------- | ----------------------------------- | ------------------------------------------------------------------------------------------------ |
| Services   | `services/agentApprovalService.ts`  | `supabase.auth.oauth`: read the request, approve or deny                                         |
| Hooks      | `hooks/useAgentApproval.ts`         | Query for the request (single use, no retries); mutation that hands the browser back to the tool |
| Components | `components/AgentApprovalPanel.tsx` | "Connect <tool>?" with Allow and Cancel                                                          |

Page (thin): `src/pages/AgentApprovalPage.tsx` at `/oauth/consent`; signed out it shows the sign-in panel with `returnPath` set to itself (`src/features/auth/README.md` § Return page after sign-in).

## Dependencies

- Supabase Auth OAuth 2.1 server (beta), switched on in the shared project with authorization path `/oauth/consent` and dynamic client registration.
- point-at function: `WWW-Authenticate` on 401, `/.well-known/oauth-protected-resource`, Supabase access tokens accepted on `/mcp` (`supabase/functions/point-at/index.ts`).
- Kit components `Card`, `Button`, `Alert`, `PageLoadingState`; `@tanstack/react-query`.
