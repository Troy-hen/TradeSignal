-- notification_log had no way to carry per-notification context beyond
-- lead_match_id — fine for new-lead notifications, but territory_available
-- (queued by trg_notify_territory_waitlist) needs to know WHICH
-- district+trade to link to, and had nowhere to put it. Discovered while
-- building notify-leads (Task 10), which is the first real consumer.
alter table public.notification_log add column metadata jsonb;

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

    insert into public.notification_log (company_id, notification_type, status, metadata)
    select w.company_id, 'territory_available', 'queued',
           jsonb_build_object('postcode_district', v_district, 'trade_category_id', v_trade_id)
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
