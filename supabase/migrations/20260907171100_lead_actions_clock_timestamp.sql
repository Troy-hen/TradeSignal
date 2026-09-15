-- lead_actions.created_at defaulted to now(), which is STABLE within a
-- transaction (returns transaction start time, not wall-clock time) —
-- multiple actions recorded in the same transaction got identical
-- timestamps, making lead_match_current_state's "latest action"
-- (ORDER BY created_at DESC LIMIT 1) non-deterministic. clock_timestamp()
-- returns the actual time at each call, so sequential inserts always sort
-- correctly even within one transaction. Caught by a live test, not
-- theoretical: this is exactly the audit-trail-ordering bug the "latest
-- action per lead_match" design depends on getting right.
alter table public.lead_actions alter column created_at set default clock_timestamp();
