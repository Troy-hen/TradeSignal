create or replace function public.enrich_notification_lead_match()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_district text;
  v_trade_name text;
  v_match_id uuid;
  v_count integer;
begin
  if new.lead_match_id is not null or new.company_id is null then
    return new;
  end if;

  if new.notification_type = 'new_lead_instant' then
    v_district := substring(coalesce(new.subject, '') from 'in ([A-Z]{1,2}[0-9][0-9A-Z]?)$');
    if v_district is not null then
      select count(*), min(lm.id)
      into v_count, v_match_id
      from public.lead_matches lm
      join public.application_trade_opportunities ato on ato.id = lm.application_trade_opportunity_id
      where lm.company_id = new.company_id
        and ato.postcode_district = v_district
        and lm.notification_channel = 'email'
        and lm.notified_at >= now() - interval '30 seconds';
      if v_count = 1 then new.lead_match_id := v_match_id; end if;
    end if;
  elsif new.notification_type = 'approval_alert' then
    v_district := substring(coalesce(new.subject, '') from 'approved — ([A-Z]{1,2}[0-9][0-9A-Z]?)');
    v_trade_name := substring(coalesce(new.subject, '') from '\(([^()]*)\)$');
    if v_district is not null and v_trade_name is not null then
      select count(*), min(lm.id)
      into v_count, v_match_id
      from public.lead_matches lm
      join public.application_trade_opportunities ato on ato.id = lm.application_trade_opportunity_id
      join public.trade_categories tc on tc.id = ato.trade_category_id
      where lm.company_id = new.company_id
        and ato.postcode_district = v_district
        and lower(tc.name) = lower(v_trade_name)
        and ato.is_active = true;
      if v_count = 1 then new.lead_match_id := v_match_id; end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists enrich_notification_lead_match_trigger on public.notification_log;
create trigger enrich_notification_lead_match_trigger
before insert on public.notification_log
for each row execute function public.enrich_notification_lead_match();
