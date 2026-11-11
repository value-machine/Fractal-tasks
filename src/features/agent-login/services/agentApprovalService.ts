import { getSupabase, isSupabaseConfigured } from "@/shared/services/supabaseService";

/**
 * Agent login (OAuth): an agent tool asks to act as the signed-in person; Supabase Auth sends the
 * person here with an `authorization_id`, and they approve or deny. Supabase issues the agent's
 * tokens after approval; this app never sees them.
 */

/** What the person is asked to approve. */
export interface AgentApprovalRequest {
  kind: "ask";
  clientName: string;
  clientUri: string | null;
  redirectUri: string;
}

/** Either a request to show, or an address to go to at once (already approved earlier). */
export type AgentApprovalState = AgentApprovalRequest | { kind: "redirect"; url: string };

const requireConfigured = (): void => {
  if (!isSupabaseConfigured()) throw new Error("Sign-in requires Supabase to be configured.");
};

export const fetchAgentApproval = async (authorizationId: string): Promise<AgentApprovalState> => {
  requireConfigured();
  const { data, error } = await getSupabase().auth.oauth.getAuthorizationDetails(authorizationId);
  if (error || !data) throw new Error(error?.message ?? "This request was not found.");
  if (!("authorization_id" in data)) return { kind: "redirect", url: data.redirect_url };
  return {
    kind: "ask",
    clientName: data.client.name || "An agent tool",
    clientUri: data.client.uri || null,
    redirectUri: data.redirect_uri,
  };
};

/** Approve or deny; resolves with the agent tool's return address. */
export const decideAgentApproval = async (
  authorizationId: string,
  approve: boolean
): Promise<string> => {
  requireConfigured();
  const oauth = getSupabase().auth.oauth;
  const options = { skipBrowserRedirect: true };
  const { data, error } = approve
    ? await oauth.approveAuthorization(authorizationId, options)
    : await oauth.denyAuthorization(authorizationId, options);
  if (error || !data) throw new Error(error?.message ?? "The decision was not saved.");
  return data.redirect_url;
};
