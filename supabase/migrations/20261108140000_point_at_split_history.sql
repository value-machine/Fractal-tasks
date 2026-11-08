-- Point At: keep every split's hypothesis.
-- A node can be split more than once (re-planning, adding children, adopting roots). The node's
-- split_* columns hold only the latest split; this table keeps each one, so a hypothesis is never
-- lost when the node is split again (PROCESS.md 6: the split's hypothesis is tested by results).
--
-- Access model: same as the tree (RLS on, no policies, no API-role privileges); only the
-- point-at Edge Function reads and writes. Additive and replay-safe.

CREATE TABLE IF NOT EXISTS public.node_splits (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  node_id uuid NOT NULL REFERENCES public.nodes (id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('split', 'adopt')),
  hypothesis text NOT NULL,
  prediction text,
  assumptions text,
  -- The children this split added (new nodes, or adopted roots).
  child_ids uuid[] NOT NULL DEFAULT '{}',
  created_by text,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS node_splits_node_idx ON public.node_splits (node_id, created_at);

ALTER TABLE public.node_splits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.node_splits FROM anon, authenticated;

-- Backfill: nodes split before this table existed keep their latest split as one history row.
-- Earlier hypotheses of nodes split more than once were already overwritten and survive only in
-- node_events. Skips nodes that already have history, so it is safe to re-run.
INSERT INTO public.node_splits (node_id, kind, hypothesis, prediction, assumptions, child_ids, created_by, created_at)
SELECT n.id,
       CASE WHEN (SELECT e.body FROM public.node_events e
                   WHERE e.node_id = n.id AND e.type = 'split' ORDER BY e.created_at DESC, e.id DESC LIMIT 1)
                 LIKE 'Adopted %' THEN 'adopt' ELSE 'split' END,
       n.split_hypothesis, n.split_prediction, n.split_assumptions,
       coalesce(array(SELECT c.id FROM public.nodes c WHERE c.parent_id = n.id ORDER BY c.created_at), '{}'),
       (SELECT e.actor FROM public.node_events e
         WHERE e.node_id = n.id AND e.type = 'split' ORDER BY e.created_at DESC, e.id DESC LIMIT 1),
       n.split_at
FROM public.nodes n
WHERE n.split_at IS NOT NULL
  AND n.split_hypothesis IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.node_splits s WHERE s.node_id = n.id);
