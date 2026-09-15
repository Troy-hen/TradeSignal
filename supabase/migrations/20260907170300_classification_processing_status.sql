-- New status so claim_classification_batch() can durably mark rows as
-- claimed (not just lock them for the duration of one SELECT), preventing
-- two overlapping classify-planning-application invocations from
-- double-processing the same row. Added in its own migration: Postgres
-- can't use a new enum value in the same transaction that adds it.
alter type public.classification_status add value 'processing';
