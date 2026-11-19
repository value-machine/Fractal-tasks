-- Point At: keep requirements in the order they were given.
-- Requirements saved in one call can share a created_at, so ordering by it was not stable.
-- position is the index in the list the agent sent. Additive and replay-safe.

ALTER TABLE public.node_requirements
  ADD COLUMN IF NOT EXISTS position smallint NOT NULL DEFAULT 0;
