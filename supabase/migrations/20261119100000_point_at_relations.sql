-- Point At: typed relations, assignments, duration and requirements.
--
-- 1. node_relations: one table for every relation between two tasks, with a type, so a new kind
--    of relation needs no new table and a graph view can switch relation types with one query.
--    Rows read "from_id <type> to_id":
--      blocked_by      from cannot start until to is closed (done or overtaken)
--      also_serves     from also contributes to the goal of to (credit only)
--      alternative_to  either one reaches the same result (symmetric)
--      replaces        from replaces to (a re-plan)
--      duplicate_of    from is the same task as to
--      related_to      loose link without rules (symmetric)
--    The split-from tree stays nodes.parent_id: the stopping and hypothesis rules depend on it
--    being a strict tree, and its guard trigger keeps it loop-free.
--    Existing node_dependencies (blocked_by) and node_links (also_serves) rows are copied in;
--    the old tables are dropped in the follow-up cleanup migration, after the function that
--    reads them is redeployed.
--
-- 2. node_assignments: a person (and the agent acting for them) attached to a task over time.
--    A claim is a row with role 'claimed' and no ended_at; at most one per task. Releasing,
--    finishing or bouncing back ends the row, so the history is kept. user_id points at the
--    contributor when the caller is signed in. Existing claims are copied in; the old
--    nodes.claimed_by / claimed_at columns go in the cleanup migration.
--
-- 3. nodes.duration_minutes: the estimated time a leaf takes, as the upper bound of a bucket
--    (15 min, 1 hour, half a day, a day, several days), so filters can compare with <=.
--
-- 4. node_requirements: what a task needs: a skill, material, money, location, language or
--    access. One row per requirement; amount and unit for money and materials.
--
-- Access model: same as the tree (RLS on, no policies, no API-role privileges); only the
-- point-at Edge Function reads and writes. Additive and replay-safe.

CREATE TABLE IF NOT EXISTS public.node_relations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_id uuid NOT NULL REFERENCES public.nodes (id) ON DELETE CASCADE,
  to_id uuid NOT NULL REFERENCES public.nodes (id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('blocked_by', 'also_serves', 'alternative_to',
                                     'replaces', 'duplicate_of', 'related_to')),
  note text,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (from_id <> to_id),
  UNIQUE (from_id, to_id, type)
);

CREATE INDEX IF NOT EXISTS node_relations_to_idx ON public.node_relations (to_id, type);
CREATE INDEX IF NOT EXISTS node_relations_type_idx ON public.node_relations (type);

DO $$
BEGIN
  IF to_regclass('public.node_dependencies') IS NOT NULL THEN
    INSERT INTO public.node_relations (from_id, to_id, type, note, created_by, created_at)
    SELECT node_id, needs_id, 'blocked_by', note, created_by, created_at
    FROM public.node_dependencies
    ON CONFLICT (from_id, to_id, type) DO NOTHING;
  END IF;
  IF to_regclass('public.node_links') IS NOT NULL THEN
    INSERT INTO public.node_relations (from_id, to_id, type, note, created_by, created_at)
    SELECT from_id, to_id, 'also_serves', note, created_by, created_at
    FROM public.node_links
    ON CONFLICT (from_id, to_id, type) DO NOTHING;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.node_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id uuid NOT NULL REFERENCES public.nodes (id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.contributors (user_id) ON DELETE SET NULL,
  actor text NOT NULL,
  role text NOT NULL DEFAULT 'claimed' CHECK (role IN ('claimed')),
  started_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  ended_at timestamptz,
  end_reason text CHECK (end_reason IN ('released', 'done', 'overtaken', 'unclear', 'unmarked')),
  CHECK (ended_at IS NULL OR ended_at >= started_at)
);

-- One open claim per task.
CREATE UNIQUE INDEX IF NOT EXISTS node_assignments_open_claim_idx
  ON public.node_assignments (node_id) WHERE role = 'claimed' AND ended_at IS NULL;
CREATE INDEX IF NOT EXISTS node_assignments_user_idx ON public.node_assignments (user_id, started_at);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'nodes' AND column_name = 'claimed_by'
  ) THEN
    INSERT INTO public.node_assignments (node_id, actor, role, started_at)
    SELECT n.id, n.claimed_by, 'claimed', coalesce(n.claimed_at, now())
    FROM public.nodes n
    WHERE n.claimed_by IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.node_assignments a
        WHERE a.node_id = n.id AND a.role = 'claimed' AND a.ended_at IS NULL
      );
  END IF;
END $$;

ALTER TABLE public.nodes
  ADD COLUMN IF NOT EXISTS duration_minutes integer
  CHECK (duration_minutes IN (15, 60, 240, 480, 2400));

CREATE TABLE IF NOT EXISTS public.node_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id uuid NOT NULL REFERENCES public.nodes (id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('skill', 'material', 'money', 'location', 'language', 'access')),
  value text NOT NULL CHECK (char_length(btrim(value)) BETWEEN 1 AND 200),
  amount numeric CHECK (amount IS NULL OR amount >= 0),
  unit text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS node_requirements_node_idx ON public.node_requirements (node_id);
CREATE INDEX IF NOT EXISTS node_requirements_kind_idx ON public.node_requirements (kind, value);

ALTER TABLE public.node_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.node_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.node_requirements ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.node_relations, public.node_assignments, public.node_requirements
  FROM anon, authenticated;
