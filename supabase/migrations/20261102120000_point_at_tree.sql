-- Point At: the task tree.
-- One table of nodes forming a strict "split-from" tree, an event log per node,
-- and "also serves" links across branches.
--
-- Access model (see supabase/README.md):
--   * RLS is enabled with NO policies, and table privileges are revoked from anon/authenticated.
--     The publishable key therefore cannot read or write these tables.
--   * Only the point-at Edge Function can, through a direct Postgres connection (SUPABASE_DB_URL,
--     role postgres, which bypasses RLS). The browser reads through the function's JSON API.
--
-- Replay-safe: every statement is IF NOT EXISTS / OR REPLACE / DROP IF EXISTS.

-- Supabase convention: extensions live in the "extensions" schema.
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- ---------------------------------------------------------------------------
-- Nodes
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The split-from relation. Null for a root. Set once at creation, never changed,
  -- so the tree can never contain a cycle (guard trigger below).
  parent_id uuid REFERENCES public.nodes (id) ON DELETE RESTRICT,

  -- The three questions every node answers.
  title text NOT NULL,
  done_check text,
  next_action text,

  status text NOT NULL DEFAULT 'proposed'
    CHECK (status IN ('proposed', 'reviewed', 'in_progress', 'done', 'overtaken')),

  -- Leaf type: null while the node still needs splitting or has been split.
  leaf_type text CHECK (leaf_type IN ('agent', 'human')),

  -- Human leaf template. done_check doubles as the done-signal.
  leaf_who text,
  leaf_what text,
  leaf_how text,

  -- Recorded when this node is split.
  split_hypothesis text,
  split_prediction text,
  split_assumptions text,
  split_at timestamptz,

  labels text[] NOT NULL DEFAULT '{}',

  claimed_by text,
  claimed_at timestamptz,

  verification_level smallint CHECK (verification_level BETWEEN 1 AND 4),
  overtaken_note text,
  unclear_reason text,

  created_by text,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Semantic search. 384 dimensions matches Supabase's built-in gte-small model.
  -- Not filled by anything yet.
  embedding extensions.vector(384),

  -- Full-text search over the node's own words.
  search tsvector GENERATED ALWAYS AS (
    to_tsvector('simple',
      coalesce(title, '') || ' ' || coalesce(done_check, '') || ' ' ||
      coalesce(next_action, '') || ' ' || coalesce(leaf_what, '') || ' ' ||
      coalesce(leaf_who, ''))
  ) STORED,

  CONSTRAINT human_leaf_complete CHECK (
    leaf_type IS DISTINCT FROM 'human'
    OR (leaf_who IS NOT NULL AND leaf_what IS NOT NULL AND leaf_how IS NOT NULL AND done_check IS NOT NULL)
  ),
  CONSTRAINT overtaken_has_note CHECK (status <> 'overtaken' OR overtaken_note IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS nodes_parent_idx ON public.nodes (parent_id);
CREATE INDEX IF NOT EXISTS nodes_status_idx ON public.nodes (status);
CREATE INDEX IF NOT EXISTS nodes_leaf_idx ON public.nodes (leaf_type) WHERE leaf_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS nodes_labels_idx ON public.nodes USING gin (labels);
CREATE INDEX IF NOT EXISTS nodes_search_idx ON public.nodes USING gin (search);
CREATE INDEX IF NOT EXISTS nodes_embedding_idx ON public.nodes USING hnsw (embedding extensions.vector_cosine_ops);

-- The split-from relation is immutable: no re-parenting, so no cycles.
CREATE OR REPLACE FUNCTION public.nodes_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.parent_id IS DISTINCT FROM OLD.parent_id THEN
    RAISE EXCEPTION 'parent_id cannot be changed once a node exists';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END
$$;

REVOKE ALL ON FUNCTION public.nodes_guard() FROM PUBLIC;

DROP TRIGGER IF EXISTS nodes_guard_trg ON public.nodes;
CREATE TRIGGER nodes_guard_trg
  BEFORE UPDATE ON public.nodes
  FOR EACH ROW EXECUTE FUNCTION public.nodes_guard();

-- ---------------------------------------------------------------------------
-- Event log: what happened when someone acted (reports, reviews, bounce-backs)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.node_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  node_id uuid NOT NULL REFERENCES public.nodes (id) ON DELETE CASCADE,
  actor text NOT NULL,
  type text NOT NULL
    CHECK (type IN ('created', 'split', 'claimed', 'released', 'report',
                    'unclear', 'review', 'overtaken', 'note', 'link')),
  body text,
  evidence text,
  verification_level smallint CHECK (verification_level BETWEEN 1 AND 4),
  verdict text CHECK (verdict IN ('accept', 'reject')),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS node_events_node_idx ON public.node_events (node_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- "Also serves" links: credit across branches, never used for splitting.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.node_links (
  from_id uuid NOT NULL REFERENCES public.nodes (id) ON DELETE CASCADE,
  to_id uuid NOT NULL REFERENCES public.nodes (id) ON DELETE CASCADE,
  note text,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (from_id, to_id),
  CHECK (from_id <> to_id)
);

-- Reverse lookup ("served by"): the primary key only covers from_id lookups.
CREATE INDEX IF NOT EXISTS node_links_to_idx ON public.node_links (to_id);

-- ---------------------------------------------------------------------------
-- Security: RLS on, no policies, no API-role privileges. See header.
-- ---------------------------------------------------------------------------
ALTER TABLE public.nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.node_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.node_links ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.nodes, public.node_events, public.node_links FROM anon, authenticated;
