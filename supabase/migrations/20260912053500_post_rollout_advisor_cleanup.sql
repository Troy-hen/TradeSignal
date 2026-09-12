-- The feed and company indexes covered the same ordered key set. Keep the
-- original company-scoped index and remove the redundant copy.
drop index if exists public.graph_opportunity_matches_feed_idx;
