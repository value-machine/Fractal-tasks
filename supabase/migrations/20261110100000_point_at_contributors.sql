-- Point At: contributor identity.
-- A person signs in on the site (Supabase Auth) and creates personal agent tokens. An MCP call
-- with such a token is attributed to that person, not to a name the agent types in.
--
-- Tokens are stored only as SHA-256 hashes, with a short visible prefix so people can tell them
-- apart; the token itself is shown once, at creation.
--
-- Access model: same as the tree (RLS on, no policies, no API-role privileges); only the
-- point-at Edge Function reads and writes, after checking the caller's Supabase session.
-- The project is shared with inventhor.com: these tables only reference auth.users and change
-- nothing in Supabase Auth itself. Additive and replay-safe.

CREATE TABLE IF NOT EXISTS public.contributors (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  display_name text NOT NULL CHECK (char_length(btrim(display_name)) BETWEEN 1 AND 80),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.agent_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.contributors (user_id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 80),
  token_hash text NOT NULL UNIQUE,
  token_prefix text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

CREATE INDEX IF NOT EXISTS agent_tokens_user_idx ON public.agent_tokens (user_id, created_at);

ALTER TABLE public.contributors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_tokens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.contributors, public.agent_tokens FROM anon, authenticated;
