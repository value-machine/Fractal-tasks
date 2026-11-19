-- Point At: the "overtakes" relation and hyperlinks on tasks.
--
-- 1. overtakes: "from overtakes to" means that once `from` is done, `to` is no longer needed
--    (building a house on a plot overtakes the plant care there). The function closes `to` and
--    its open subtasks as overtaken when `from` is reported done (owner decision 2026-11-20).
--
-- 2. node_hyperlinks: the context a task needs, as links only (a document, a page, a result an
--    agent wrote elsewhere). Point At stores no files (owner decision 2026-11-20).
--
-- Access model: same as the tree (RLS on, no policies, no API-role privileges). Additive and
-- replay-safe.

ALTER TABLE public.node_relations DROP CONSTRAINT IF EXISTS node_relations_type_check;
ALTER TABLE public.node_relations ADD CONSTRAINT node_relations_type_check
  CHECK (type IN ('blocked_by', 'also_serves', 'alternative_to', 'replaces', 'duplicate_of',
                  'related_to', 'overtakes'));

CREATE TABLE IF NOT EXISTS public.node_hyperlinks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id uuid NOT NULL REFERENCES public.nodes (id) ON DELETE CASCADE,
  url text NOT NULL CHECK (url ~* '^https?://' AND char_length(url) <= 2000),
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 120),
  position smallint NOT NULL DEFAULT 0,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS node_hyperlinks_node_idx ON public.node_hyperlinks (node_id, position);

ALTER TABLE public.node_hyperlinks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.node_hyperlinks FROM anon, authenticated;
