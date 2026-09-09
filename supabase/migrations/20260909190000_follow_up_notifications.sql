-- A follow-up is email-notified once, then remains visible in the in-app inbox
-- until the user completes or cancels it.
alter table public.lead_follow_ups
  add column if not exists notified_at timestamptz;

create index if not exists lead_follow_ups_due_notification_idx
  on public.lead_follow_ups (due_at)
  where status = 'open' and notified_at is null;
