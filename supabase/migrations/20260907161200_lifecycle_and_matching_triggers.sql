-- Lifecycle history (status changes are events, never destructive) and the
-- lead-matching fan-out, both implemented as DB triggers so they fire
-- regardless of which code path touches the underlying row.

create or replace function public.trg_log_application_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.planning_application_updates (
    planning_application_id, change_type, previous_status, new_status, source_event_at
  ) values (
    new.id, 'status_change', old.status, new.status, now()
  );
  return new;
end;
$$;

create trigger trg_log_status_change
  after update of status on public.planning_applications
  for each row
  when (old.status is distinct from new.status)
  execute function public.trg_log_application_status_change();

-- Forward fan-out: a new/reprocessed opportunity matches every company that
-- currently holds an active claim on that district+trade. Inline on the same
-- transaction as the opportunity upsert so there is never a window where an
-- opportunity exists unmatched.
create or replace function public.trg_fanout_lead_matches()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_active then
    insert into public.lead_matches (application_trade_opportunity_id, company_id, territory_claim_id)
    select new.id, tc.company_id, tc.id
    from public.territories t
    join public.territory_claims tc on tc.territory_id = t.id and tc.status = 'active'
    where t.postcode_district = new.postcode_district
      and t.trade_category_id = new.trade_category_id
    on conflict (application_trade_opportunity_id, company_id) do nothing;
  end if;
  return new;
end;
$$;

create trigger trg_fanout_lead_matches_on_opportunity
  after insert or update on public.application_trade_opportunities
  for each row execute function public.trg_fanout_lead_matches();

-- Reverse fan-out: a newly-activated territory claim backfills the last
-- ~60-90 days of matching opportunities, so a new subscriber doesn't stare at
-- an empty dashboard waiting for the next fresh application.
create or replace function public.trg_backfill_lead_matches_for_new_claim()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_district text;
  v_trade_id uuid;
begin
  select postcode_district, trade_category_id into v_district, v_trade_id
  from public.territories where id = new.territory_id;

  insert into public.lead_matches (application_trade_opportunity_id, company_id, territory_claim_id)
  select ato.id, new.company_id, new.id
  from public.application_trade_opportunities ato
  join public.planning_applications pa on pa.id = ato.planning_application_id
  where ato.postcode_district = v_district
    and ato.trade_category_id = v_trade_id
    and ato.is_active
    and pa.received_date >= current_date - interval '90 days'
  on conflict (application_trade_opportunity_id, company_id) do nothing;

  return new;
end;
$$;

create trigger trg_backfill_lead_matches_on_claim_activation
  after update of status on public.territory_claims
  for each row
  when (new.status = 'active' and old.status is distinct from 'active')
  execute function public.trg_backfill_lead_matches_for_new_claim();

-- "Notify Me If Available": when a territory frees up, queue a notification
-- for every waiting company against that district+trade.
create or replace function public.trg_notify_territory_waitlist()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_district text;
  v_trade_id uuid;
begin
  if new.status in ('cancelled', 'expired') and old.status is distinct from new.status then
    select postcode_district, trade_category_id into v_district, v_trade_id
    from public.territories where id = new.territory_id;

    insert into public.notification_log (company_id, notification_type, status)
    select w.company_id, 'territory_available', 'queued'
    from public.territory_waitlist w
    where w.postcode_district = v_district
      and w.trade_category_id = v_trade_id
      and w.notified_at is null;

    update public.territory_waitlist
    set notified_at = now()
    where postcode_district = v_district and trade_category_id = v_trade_id and notified_at is null;
  end if;
  return new;
end;
$$;

create trigger trg_notify_territory_waitlist_on_release
  after update of status on public.territory_claims
  for each row execute function public.trg_notify_territory_waitlist();
