create or replace function public.check_territory_availability(
  p_postcode_district text,
  p_trade_slug text
)
returns table (
  applications_last_30d integer,
  high_priority_count integer,
  estimated_construction_activity_gbp numeric,
  estimated_trade_value_gbp numeric,
  territory_status text,
  monthly_price_pence integer
)
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_district text := upper(trim(p_postcode_district));
  v_trade_id uuid;
  v_raw_ip text;
  v_identifier text;
  v_recent_count int;
begin
  begin
    v_raw_ip := split_part(
      coalesce(current_setting('request.headers', true)::json ->> 'x-forwarded-for', 'unknown'),
      ',',
      1
    );
  exception when others then
    v_raw_ip := 'unknown';
  end;

  v_identifier := encode(
    extensions.digest(trim(v_raw_ip) || 'tradesignal_rate_limit_salt_v1', 'sha256'),
    'hex'
  );

  select count(*) into v_recent_count
  from public.rate_limit_events
  where scope = 'public_territory_checker'
    and identifier = v_identifier
    and created_at > now() - interval '1 minute';

  if v_recent_count >= 20 then
    raise exception 'rate_limited';
  end if;

  insert into public.rate_limit_events (scope, identifier)
  values ('public_territory_checker', v_identifier);

  if not exists (
    select 1
    from public.postcode_districts
    where id = v_district
  ) then
    raise exception 'unknown_postcode_district';
  end if;

  select id into v_trade_id
  from public.trade_categories
  where slug = p_trade_slug
    and is_active;

  if v_trade_id is null then
    raise exception 'unknown_trade';
  end if;

  return query
  select
    count(*) filter (where pa.received_date >= current_date - interval '30 days')::int,
    count(*) filter (where ato.opportunity_bucket = 'hot')::int,
    coalesce(sum(ac.estimated_total_project_value_high) filter (where pa.received_date >= current_date - interval '30 days'), 0),
    coalesce(sum(ato.estimated_trade_value_high) filter (where pa.received_date >= current_date - interval '30 days'), 0),
    coalesce(
      (
        select tc.status::text
        from public.territory_claims tc
        join public.territories t on t.id = tc.territory_id
        where t.postcode_district = v_district
          and t.trade_category_id = v_trade_id
          and tc.status in ('reserved', 'active', 'suspended')
        limit 1
      ),
      'available'
    ),
    coalesce(
      (
        select t.monthly_price_pence
        from public.territories t
        where t.postcode_district = v_district
          and t.trade_category_id = v_trade_id
      ),
      (
        select default_monthly_price_pence
        from public.trade_categories
        where id = v_trade_id
      )
    )
  from public.application_trade_opportunities ato
  join public.planning_applications pa on pa.id = ato.planning_application_id
  join public.application_classifications ac on ac.id = ato.application_classification_id
  where ato.postcode_district = v_district
    and ato.trade_category_id = v_trade_id
    and ato.is_active;
end;
$function$;
