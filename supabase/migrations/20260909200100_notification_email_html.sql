-- Retain the rendered transactional email so an authenticated customer can
-- inspect the exact message represented by an inbox event.
alter table public.notification_log
  add column if not exists email_html text;
