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
