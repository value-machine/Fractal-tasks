-- Point At: private goals (owner decision 2026-11-23: public by default).
--
-- A goal can be private: then it and everything split from it is visible only to its owner and
-- the owner's own agents. Every node records the tree owner (the account that created the root)
-- and the tree's visibility; children copy both from their parent.
--
-- Reads go through the visible_nodes view. It shows public nodes plus the private nodes of the
-- viewer named in the transaction-local setting point_at.viewer (set by the point-at function
-- per request). When the setting is missing, only public nodes are visible: a code path that
-- forgets to set it fails closed.
--
-- Access model unchanged: RLS on, no policies, no API-role privileges; only the point-at
-- function reads and writes. Additive and replay-safe; existing goals stay public.

ALTER TABLE public.nodes
  ADD COLUMN IF NOT EXISTS owner_user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'public'
    CHECK (visibility IN ('public', 'private'));

ALTER TABLE public.nodes DROP CONSTRAINT IF EXISTS private_has_owner;
ALTER TABLE public.nodes ADD CONSTRAINT private_has_owner
  CHECK (visibility = 'public' OR owner_user_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS nodes_private_owner_idx
  ON public.nodes (owner_user_id) WHERE visibility = 'private';

-- The columns are listed (not *) so the view's shape is explicit; add new node columns here too.
CREATE OR REPLACE VIEW public.visible_nodes WITH (security_invoker = true) AS
SELECT id, parent_id, title, done_check, next_action, status, leaf_type, leaf_who, leaf_what,
       leaf_how, split_hypothesis, split_prediction, split_assumptions, split_at, labels,
       verification_level, overtaken_note, unclear_reason, created_by, created_at, updated_at,
       embedding, search, duration_minutes, owner_user_id, visibility
FROM public.nodes
WHERE visibility = 'public'
   OR owner_user_id::text = nullif(current_setting('point_at.viewer', true), '');

REVOKE ALL ON public.visible_nodes FROM anon, authenticated;

-- A claim points at the person's sign-in account, not at a contributors row: people who only
-- used agent login have no contributors row, and their claims lost their owner.
ALTER TABLE public.node_assignments DROP CONSTRAINT IF EXISTS node_assignments_user_id_fkey;
ALTER TABLE public.node_assignments ADD CONSTRAINT node_assignments_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE SET NULL;
