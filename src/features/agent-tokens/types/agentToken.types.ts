/** A personal agent token as the site lists it; the secret itself is never sent back. */
export interface AgentToken {
  id: string;
  name: string;
  /** First characters of the token, so people can tell tokens apart. */
  token_prefix: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
}

/** The answer to creating a token: the secret, shown once, plus its listing. */
export interface CreatedAgentToken {
  token: string;
  record: AgentToken;
}

/** The signed-in person's public name; null until they choose one. */
export interface PublicProfile {
  display_name: string | null;
  /** From the sign-in provider (GitHub, Google), never the email address. */
  suggested_name: string | null;
}
