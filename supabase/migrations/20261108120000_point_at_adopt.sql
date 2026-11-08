-- Point At: adopting roots.
-- Later investigation can show that a root goal is part of a bigger one. The adopt step makes
-- that root a child of another node, recorded as a new split with its own hypothesis.
--
-- The split-from relation stays fixed otherwise: a node that has a parent can never move.
-- The only parent change allowed is a root (parent_id null) gaining a parent, and only when the
-- new parent is not inside the root's own subtree, so the tree can never contain a loop.
-- Reparenting is serialized with a transaction-level advisory lock, so two adoptions running at
-- the same moment cannot together create a loop that neither check sees.
-- Additive and replay-safe (CREATE OR REPLACE; the trigger from the tree migration is reused).

CREATE OR REPLACE FUNCTION public.nodes_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.parent_id IS DISTINCT FROM OLD.parent_id THEN
    IF OLD.parent_id IS NOT NULL OR NEW.parent_id IS NULL THEN
      RAISE EXCEPTION 'parent_id cannot be changed once a node exists; only a root can be adopted';
    END IF;
    PERFORM pg_advisory_xact_lock(hashtext('point_at_reparent'));
    IF EXISTS (
      WITH RECURSIVE up AS (
        SELECT n.id, n.parent_id FROM public.nodes n WHERE n.id = NEW.parent_id
        UNION
        SELECT p.id, p.parent_id FROM public.nodes p JOIN up ON p.id = up.parent_id
      )
      SELECT 1 FROM up WHERE up.id = NEW.id
    ) THEN
      RAISE EXCEPTION 'adopting this root under that node would make a loop';
    END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END
$$;

REVOKE ALL ON FUNCTION public.nodes_guard() FROM PUBLIC;

-- Adoption is logged on the adopted node as its own event type.
ALTER TABLE public.node_events DROP CONSTRAINT IF EXISTS node_events_type_check;
ALTER TABLE public.node_events ADD CONSTRAINT node_events_type_check
  CHECK (type IN ('created', 'split', 'claimed', 'released', 'report',
                  'unclear', 'review', 'overtaken', 'note', 'link', 'adopted'));
