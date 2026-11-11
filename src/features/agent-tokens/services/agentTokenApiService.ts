import { getSupabase, isSupabaseConfigured } from "@/shared/services/supabaseService";
import {
  getPointAtRequest,
  PointAtNotConfiguredError,
  readPointAtError,
} from "@/shared/services/pointAtFunctionService";
import type {
  AgentToken,
  CreatedAgentToken,
  PublicProfile,
} from "@/features/agent-tokens/types/agentToken.types";

/** Raised when nobody is signed in: the token endpoints act for the signed-in person only. */
export class SignInRequiredError extends Error {
  constructor() {
    super("Sign in first");
    this.name = "SignInRequiredError";
  }
}

/** Call /api/me/tokens with the person's own session, so the function knows who is asking. */
const request = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  const target = getPointAtRequest(path);
  if (!target || !isSupabaseConfigured()) throw new PointAtNotConfiguredError();
  const { data } = await getSupabase().auth.getSession();
  const accessToken = data.session?.access_token;
  if (!accessToken) throw new SignInRequiredError();
  const response = await fetch(target.url, {
    ...init,
    headers: {
      ...target.headers,
      Authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
  });
  if (!response.ok) throw new Error(await readPointAtError(response));
  return (await response.json()) as T;
};

/** The signed-in person's tokens, newest first. */
export const fetchAgentTokens = (): Promise<AgentToken[]> =>
  request<AgentToken[]>("/api/me/tokens");

/** Create a named token; the secret in the answer is never shown again. */
export const createAgentToken = (name: string): Promise<CreatedAgentToken> =>
  request<CreatedAgentToken>("/api/me/tokens", {
    method: "POST",
    body: JSON.stringify({ name }),
  });

/** Revoke a token: agents using it are refused from then on. */
export const revokeAgentToken = (id: string): Promise<AgentToken> =>
  request<AgentToken>(`/api/me/tokens/${encodeURIComponent(id)}`, { method: "DELETE" });

/** The person's public name, and a suggestion from their sign-in provider. */
export const fetchPublicProfile = (): Promise<PublicProfile> => request<PublicProfile>("/api/me");

/** Choose or change the name shown on everything the person's agents write. */
export const savePublicName = (displayName: string): Promise<PublicProfile> =>
  request<PublicProfile>("/api/me", {
    method: "PUT",
    body: JSON.stringify({ display_name: displayName }),
  });
