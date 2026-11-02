-- Signals: runtime error logs, user feedback, and bugs.
-- Read by the loop-backlog signal adapter (.agents/skills/loop-backlog/references/signal-adapter.md).
--
-- Access model (see supabase/README.md):
--   * Nobody writes error_logs directly. Everyone (anon included) reports through upsert_error_log().
--   * Signed-in users insert their own app_feedback rows and read them back.
--   * Admins (JWT app_metadata.role = 'admin' | 'super-admin') read and update everything.
-- app_metadata is set server-side only. Never test user_metadata: users can edit their own.
--
-- Replay-safe: every statement is IF NOT EXISTS / OR REPLACE / DROP IF EXISTS.

-- ---------------------------------------------------------------------------
-- Admin check
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT COALESCE(
    (SELECT auth.jwt()) -> 'app_metadata' ->> 'role' IN ('admin', 'super-admin'),
    false
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- bugs (human record; the agent only links to existing rows)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bugs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 300),
  description text CHECK (char_length(description) <= 5000),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'fixed')),
  fix_notes text CHECK (char_length(fix_notes) <= 5000)
);

CREATE INDEX IF NOT EXISTS idx_bugs_status ON public.bugs (status);

ALTER TABLE public.bugs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.bugs FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bugs TO authenticated;

DROP POLICY IF EXISTS bugs_admin_all ON public.bugs;
CREATE POLICY bugs_admin_all ON public.bugs
  FOR ALL TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

-- ---------------------------------------------------------------------------
-- error_logs (one row per cluster; cluster = hash within an environment)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hash text NOT NULL CHECK (char_length(hash) BETWEEN 8 AND 128),
  environment text NOT NULL CHECK (environment IN ('local', 'staging', 'production')),
  message text NOT NULL,
  type text NOT NULL DEFAULT 'error',
  stack text,
  url text,
  user_agent text,
  user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'review', 'resolved', 'muted')),
  resolved boolean NOT NULL DEFAULT false,
  count integer NOT NULL DEFAULT 1,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (hash, environment)
);

CREATE INDEX IF NOT EXISTS idx_error_logs_status_last_seen
  ON public.error_logs (status, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_user ON public.error_logs (user_id);

ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.error_logs FROM anon, authenticated;
GRANT SELECT, UPDATE ON public.error_logs TO authenticated;

DROP POLICY IF EXISTS error_logs_admin_select ON public.error_logs;
CREATE POLICY error_logs_admin_select ON public.error_logs
  FOR SELECT TO authenticated
  USING ((SELECT public.is_admin()));

DROP POLICY IF EXISTS error_logs_admin_update ON public.error_logs;
CREATE POLICY error_logs_admin_update ON public.error_logs
  FOR UPDATE TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

-- ---------------------------------------------------------------------------
-- app_feedback
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  app_id text NOT NULL DEFAULT 'app',
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE DEFAULT auth.uid(),
  user_email text,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 5000),
  page_url text CHECK (char_length(page_url) <= 2000),
  environment text NOT NULL CHECK (environment IN ('local', 'staging', 'production')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'review', 'handled', 'completed')),
  bug_id uuid REFERENCES public.bugs (id) ON DELETE SET NULL,
  message_id text
);

CREATE INDEX IF NOT EXISTS idx_app_feedback_status_created ON public.app_feedback (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_feedback_user ON public.app_feedback (user_id);
CREATE INDEX IF NOT EXISTS idx_app_feedback_bug ON public.app_feedback (bug_id);

ALTER TABLE public.app_feedback ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.app_feedback FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.app_feedback TO authenticated;

DROP POLICY IF EXISTS app_feedback_select ON public.app_feedback;
CREATE POLICY app_feedback_select ON public.app_feedback
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR (SELECT public.is_admin()));

-- Own rows only, born open and unlinked; the email can only be the caller's own.
DROP POLICY IF EXISTS app_feedback_insert_own ON public.app_feedback;
CREATE POLICY app_feedback_insert_own ON public.app_feedback
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND status = 'open'
    AND bug_id IS NULL
    AND (user_email IS NULL OR user_email = ((SELECT auth.jwt()) ->> 'email'))
  );

DROP POLICY IF EXISTS app_feedback_admin_update ON public.app_feedback;
CREATE POLICY app_feedback_admin_update ON public.app_feedback
  FOR UPDATE TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

-- ---------------------------------------------------------------------------
-- upsert_error_log: the only write path to error_logs
-- ---------------------------------------------------------------------------
-- SECURITY DEFINER so anon can report errors without table access. Bounds on abuse:
-- fixed field caps, a cap on distinct clusters (existing clusters still count up),
-- and purge_old_error_logs() for retention. Per-visitor rate limits are not possible
-- in Postgres alone.
CREATE OR REPLACE FUNCTION public.upsert_error_log(
  p_hash text,
  p_message text,
  p_environment text,
  p_type text DEFAULT 'error',
  p_stack text DEFAULT NULL,
  p_url text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  max_clusters CONSTANT integer := 5000;
BEGIN
  IF p_hash IS NULL OR char_length(p_hash) NOT BETWEEN 8 AND 128 THEN
    RAISE EXCEPTION 'invalid hash' USING ERRCODE = '22023';
  END IF;
  IF p_environment IS NULL OR p_environment NOT IN ('local', 'staging', 'production') THEN
    RAISE EXCEPTION 'invalid environment' USING ERRCODE = '22023';
  END IF;

  -- Known cluster: count up and reopen finished ones. A muted cluster stays muted.
  UPDATE public.error_logs
  SET count = count + 1,
      last_seen_at = now(),
      status = CASE WHEN status IN ('review', 'resolved') THEN 'open' ELSE status END,
      resolved = CASE WHEN status IN ('review', 'resolved') THEN false ELSE resolved END
  WHERE hash = p_hash AND environment = p_environment;

  IF FOUND THEN
    RETURN;
  END IF;

  -- New cluster: refuse once the table is full instead of growing without bound.
  IF (SELECT count(*) FROM public.error_logs) >= max_clusters THEN
    RETURN;
  END IF;

  INSERT INTO public.error_logs (hash, environment, message, type, stack, url, user_agent, user_id)
  VALUES (
    p_hash,
    p_environment,
    left(COALESCE(p_message, ''), 2000),
    left(COALESCE(p_type, 'error'), 100),
    left(p_stack, 8000),
    left(p_url, 2000),
    left(p_user_agent, 500),
    (SELECT auth.uid())
  )
  ON CONFLICT (hash, environment) DO UPDATE
    SET count = public.error_logs.count + 1, last_seen_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_error_log(text, text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_error_log(text, text, text, text, text, text, text)
  TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- Retention: 90 days since last seen. Not scheduled here; run it from a scheduled
-- job (follow-up) or by hand with the service role.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.purge_old_error_logs()
RETURNS integer
LANGUAGE sql
SET search_path = ''
AS $$
  WITH deleted AS (
    DELETE FROM public.error_logs
    WHERE last_seen_at < now() - interval '90 days'
    RETURNING 1
  )
  SELECT count(*)::integer FROM deleted;
$$;

REVOKE ALL ON FUNCTION public.purge_old_error_logs() FROM PUBLIC, anon, authenticated;
