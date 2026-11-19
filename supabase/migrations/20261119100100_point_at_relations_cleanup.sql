-- Point At: remove the structures that 20261119100000_point_at_relations.sql replaced.
-- Apply only after the point-at function that reads node_relations and node_assignments is
-- deployed: until then the live function still reads these.
--   node_dependencies  -> node_relations (type 'blocked_by')
--   node_links         -> node_relations (type 'also_serves')
--   nodes.claimed_by / claimed_at -> node_assignments (role 'claimed', ended_at null)
-- The rows were copied by the previous migration. Safe to re-run.

-- Claims made between the two migrations by the old function would only be in the old columns.
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
  IF to_regclass('public.node_dependencies') IS NOT NULL THEN
    INSERT INTO public.node_relations (from_id, to_id, type, note, created_by, created_at)
    SELECT node_id, needs_id, 'blocked_by', note, created_by, created_at FROM public.node_dependencies
    ON CONFLICT (from_id, to_id, type) DO NOTHING;
  END IF;
  IF to_regclass('public.node_links') IS NOT NULL THEN
    INSERT INTO public.node_relations (from_id, to_id, type, note, created_by, created_at)
    SELECT from_id, to_id, 'also_serves', note, created_by, created_at FROM public.node_links
    ON CONFLICT (from_id, to_id, type) DO NOTHING;
  END IF;
END $$;

DROP TABLE IF EXISTS public.node_dependencies;
DROP TABLE IF EXISTS public.node_links;
ALTER TABLE public.nodes DROP COLUMN IF EXISTS claimed_by;
ALTER TABLE public.nodes DROP COLUMN IF EXISTS claimed_at;
