-- Point At: a human leaf can say what follows once it is done (owner decision 2026-11-24:
-- everything happens in the loop, no timers). When the leaf is reported done, the function
-- creates that follow-up as a new task beside it, and tasks that were blocked by the leaf wait
-- for the follow-up instead: "the message was sent" is not "the answer came in".
-- Additive and replay-safe; the visible_nodes view lists the new column.

ALTER TABLE public.nodes ADD COLUMN IF NOT EXISTS leaf_follow_up text
  CHECK (leaf_follow_up IS NULL OR char_length(btrim(leaf_follow_up)) BETWEEN 3 AND 300);

CREATE OR REPLACE VIEW public.visible_nodes WITH (security_invoker = true) AS
SELECT id, parent_id, title, done_check, next_action, status, leaf_type, leaf_who, leaf_what,
       leaf_how, split_hypothesis, split_prediction, split_assumptions, split_at, labels,
       verification_level, overtaken_note, unclear_reason, created_by, created_at, updated_at,
       embedding, search, duration_minutes, owner_user_id, visibility, leaf_follow_up
FROM public.nodes
WHERE visibility = 'public'
   OR owner_user_id::text = nullif(current_setting('point_at.viewer', true), '');

REVOKE ALL ON public.visible_nodes FROM anon, authenticated;
