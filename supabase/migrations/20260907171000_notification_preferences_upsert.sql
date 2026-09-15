-- notification_preferences' company-default row is uniqued by a PARTIAL
-- index (company_id) WHERE user_id IS NULL, which a plain
-- `ON CONFLICT (company_id)` cannot target — Postgres needs the matching
-- WHERE clause to infer a partial unique index. security definer so the
-- admin check happens here explicitly, since this bypasses the table's own
-- RLS policies.
create or replace function public.upsert_company_notification_preferences(
  p_company_id uuid,
  p_channel_email boolean,
  p_digest_frequency text,
  p_instant_alert_min_score numeric,
  p_digest_min_score numeric,
  p_approval_alerts_enabled boolean
)
returns public.notification_preferences
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.notification_preferences;
begin
  if not public.is_company_admin(p_company_id) then
    raise exception 'not_authorized';
  end if;

  insert into public.notification_preferences (
    company_id, user_id, channel_email, digest_frequency,
    instant_alert_min_score, digest_min_score, approval_alerts_enabled
  ) values (
    p_company_id, null, p_channel_email, p_digest_frequency,
    p_instant_alert_min_score, p_digest_min_score, p_approval_alerts_enabled
  )
  on conflict (company_id) where user_id is null
  do update set
    channel_email = excluded.channel_email,
    digest_frequency = excluded.digest_frequency,
    instant_alert_min_score = excluded.instant_alert_min_score,
    digest_min_score = excluded.digest_min_score,
    approval_alerts_enabled = excluded.approval_alerts_enabled,
    updated_at = now()
  returning * into v_row;

  return v_row;
end;
$$;
revoke all on function public.upsert_company_notification_preferences(uuid, boolean, text, numeric, numeric, boolean) from public;
grant execute on function public.upsert_company_notification_preferences(uuid, boolean, text, numeric, numeric, boolean) to authenticated;
