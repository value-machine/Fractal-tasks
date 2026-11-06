-- Point At: "needs first" dependencies between nodes.
-- A node can record that another node must be closed (done or overtaken) before it is ready,
-- e.g. "ask the centre" needs "draft the proposal". Dependencies never change the split-from
-- tree; they only decide when a leaf counts as ready in the role views.
--
-- Access model: same as the tree (RLS on, no policies, no API-role privileges); only the
-- point-at Edge Function reads and writes. Cycles are refused by the function before insert.
-- Additive and replay-safe.

CREATE TABLE IF NOT EXISTS public.node_dependencies (
  node_id uuid NOT NULL REFERENCES public.nodes (id) ON DELETE CASCADE,
  needs_id uuid NOT NULL REFERENCES public.nodes (id) ON DELETE CASCADE,
  note text,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (node_id, needs_id),
  CHECK (node_id <> needs_id)
);

-- Reverse lookup ("needed by"); the primary key covers node_id lookups.
CREATE INDEX IF NOT EXISTS node_dependencies_needs_idx ON public.node_dependencies (needs_id);

ALTER TABLE public.node_dependencies ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.node_dependencies FROM anon, authenticated;
