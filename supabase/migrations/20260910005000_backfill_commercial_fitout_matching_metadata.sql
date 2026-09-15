-- Existing classified planning rows are deliberately left stable. New and explicitly
-- reprocessed applications will use the v2-commercial prompt; this avoids burning
-- AI credits on a bulk reclassification while the classification cron is paused.
update public.planning_applications
set updated_at = updated_at
where false;
