alter table public.outreach_deliveries
  add column if not exists audience_type text,
  add column if not exists strategy_key text,
  add column if not exists template_key text,
  add column if not exists template_version text;

create table if not exists public.assistant_daily_briefs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  brief_date date not null,
  snapshot jsonb not null default '{}'::jsonb,
  summary text not null,
  action_items jsonb not null default '[]'::jsonb,
  model text,
  generated_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, brief_date)
);

alter table public.assistant_daily_briefs enable row level security;
drop policy if exists "members can read own daily briefs" on public.assistant_daily_briefs;
create policy "members can read own daily briefs" on public.assistant_daily_briefs
for select to authenticated using (public.is_company_member(company_id));
revoke insert, update, delete on public.assistant_daily_briefs from authenticated;
grant select on public.assistant_daily_briefs to authenticated;

create table if not exists public.territory_market_events (
  id uuid primary key default gen_random_uuid(),
  territory_id uuid not null references public.territories(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  trade_category_id uuid not null references public.trade_categories(id) on delete cascade,
  postcode_district text not null,
  event_type text not null check (event_type in ('claimed','released')),
  source_claim_id uuid not null references public.territory_claims(id) on delete cascade,
  occurred_at timestamptz not null default now(),
  unique(source_claim_id,event_type)
);
create index if not exists territory_market_events_recent_idx on public.territory_market_events(occurred_at desc,trade_category_id,postcode_district);
alter table public.territory_market_events enable row level security;
revoke all on public.territory_market_events from anon, authenticated;

create or replace function public.capture_territory_market_event()
returns trigger
language plpgsql
security definer
set search_path='public'
as $$
declare
  v_trade uuid;
  v_district text;
begin
  select t.trade_category_id,t.postcode_district into v_trade,v_district from public.territories t where t.id=new.territory_id;
  if v_trade is null then return new; end if;

  if new.status::text='active' and (tg_op='INSERT' or old.status::text<>'active') then
    insert into public.territory_market_events(territory_id,company_id,trade_category_id,postcode_district,event_type,source_claim_id,occurred_at)
    values(new.territory_id,new.company_id,v_trade,v_district,'claimed',new.id,coalesce(new.activated_at,now()))
    on conflict(source_claim_id,event_type) do nothing;
  elsif tg_op='UPDATE' and old.status::text in ('active','suspended') and new.status::text in ('expired','cancelled') then
    insert into public.territory_market_events(territory_id,company_id,trade_category_id,postcode_district,event_type,source_claim_id,occurred_at)
    values(new.territory_id,new.company_id,v_trade,v_district,'released',new.id,coalesce(new.cancelled_at,now()))
    on conflict(source_claim_id,event_type) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists territory_claim_market_event_trigger on public.territory_claims;
create trigger territory_claim_market_event_trigger
after insert or update of status on public.territory_claims
for each row execute function public.capture_territory_market_event();

create or replace function public.browse_recent_territory_market_events(p_limit integer default 5)
returns table(event_id uuid,event_type text,postcode_district text,trade_name text,trade_slug text,occurred_at timestamptz)
language plpgsql
stable
security definer
set search_path='public'
as $$
declare
  v_company_id uuid;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  select cm.company_id into v_company_id from public.company_memberships cm where cm.user_id=auth.uid() and cm.status='active' order by cm.created_at limit 1;
  if v_company_id is null then raise exception 'company_required'; end if;

  return query
  with owned as (
    select distinct t.trade_category_id,pd.region
    from public.territory_claims tc
    join public.territories t on t.id=tc.territory_id
    left join public.postcode_districts pd on pd.id=t.postcode_district
    where tc.company_id=v_company_id and tc.status in ('active','suspended')
  )
  select e.id,e.event_type,e.postcode_district,tr.name,tr.slug,e.occurred_at
  from public.territory_market_events e
  join public.trade_categories tr on tr.id=e.trade_category_id
  left join public.postcode_districts epd on epd.id=e.postcode_district
  where e.company_id<>v_company_id
    and e.occurred_at>=now()-interval '7 days'
    and exists(select 1 from owned o where o.trade_category_id=e.trade_category_id and (o.region is null or epd.region=o.region))
  order by e.occurred_at desc
  limit greatest(1,least(coalesce(p_limit,5),10));
end;
$$;

create or replace function public.get_conversion_learning_benchmarks(p_min_platform_sample integer default 10)
returns table(scope text,trade_name text,source_type text,channel text,audience_type text,sample_size bigint,opened_count bigint,response_count bigint,quote_count bigint,won_count bigint,response_rate numeric,quote_rate numeric,win_rate numeric,won_value_gbp numeric)
language plpgsql
stable
security definer
set search_path='public'
as $$
declare
  v_company_id uuid;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  select cm.company_id into v_company_id from public.company_memberships cm where cm.user_id=auth.uid() and cm.status='active' order by cm.created_at limit 1;
  if v_company_id is null then raise exception 'company_required'; end if;

  return query
  with observations as (
    select d.id as delivery_id,d.company_id,
      coalesce(pt.name,mt.name,'Unknown trade') as trade_name,
      case when d.opportunity_id is not null then 'planning' else coalesce(ms.signal_type,'market_signal') end as source_type,
      d.channel,coalesce(d.audience_type,rl.audience_type,'unknown') as audience_type,
      coalesce(rl.open_count,0)>0 as opened,
      qr.id is not null as responded,
      qr.status in ('quoted','won') as quoted,
      qr.status='won' as won,
      coalesce(pstate.contract_value_gbp,mstate.contract_value_gbp,0) as won_value
    from public.outreach_deliveries d
    left join public.outreach_response_links rl on rl.outreach_delivery_id=d.id
    left join public.quote_requests qr on qr.response_link_id=rl.id
    left join public.application_trade_opportunities po on po.id=d.opportunity_id
    left join public.trade_categories pt on pt.id=po.trade_category_id
    left join public.market_signal_trade_matches mm on mm.id=d.market_signal_trade_match_id
    left join public.market_signals ms on ms.id=mm.signal_id
    left join public.trade_categories mt on mt.id=mm.trade_category_id
    left join lateral (
      select la.contract_value_gbp from public.lead_matches lm join public.lead_actions la on la.lead_match_id=lm.id
      where lm.company_id=d.company_id and lm.application_trade_opportunity_id=d.opportunity_id and la.action_type='won'
      order by la.created_at desc limit 1
    ) pstate on true
    left join public.market_signal_company_states mstate on mstate.company_id=d.company_id and mstate.market_signal_trade_match_id=d.market_signal_trade_match_id and mstate.current_action='won'
    where d.status in ('sent','delivered')
  ), grouped as (
    select company_id,trade_name,source_type,channel,audience_type,
      count(distinct delivery_id) sample_size,
      count(distinct delivery_id) filter(where opened) opened_count,
      count(distinct delivery_id) filter(where responded) response_count,
      count(distinct delivery_id) filter(where quoted) quote_count,
      count(distinct delivery_id) filter(where won) won_count,
      sum(won_value) filter(where won) won_value_gbp
    from observations group by company_id,trade_name,source_type,channel,audience_type
  ), company_rows as (
    select 'company'::text scope,g.trade_name,g.source_type,g.channel,g.audience_type,g.sample_size,g.opened_count,g.response_count,g.quote_count,g.won_count,
      round(g.response_count::numeric/nullif(g.sample_size,0),4) response_rate,
      round(g.quote_count::numeric/nullif(g.sample_size,0),4) quote_rate,
      round(g.won_count::numeric/nullif(g.sample_size,0),4) win_rate,
      coalesce(g.won_value_gbp,0)::numeric won_value_gbp
    from grouped g where g.company_id=v_company_id
  ), platform_rows as (
    select 'platform'::text scope,g.trade_name,g.source_type,g.channel,g.audience_type,
      sum(g.sample_size)::bigint sample_size,sum(g.opened_count)::bigint opened_count,sum(g.response_count)::bigint response_count,sum(g.quote_count)::bigint quote_count,sum(g.won_count)::bigint won_count,
      round(sum(g.response_count)::numeric/nullif(sum(g.sample_size),0),4) response_rate,
      round(sum(g.quote_count)::numeric/nullif(sum(g.sample_size),0),4) quote_rate,
      round(sum(g.won_count)::numeric/nullif(sum(g.sample_size),0),4) win_rate,
      coalesce(sum(g.won_value_gbp),0)::numeric won_value_gbp
    from grouped g group by g.trade_name,g.source_type,g.channel,g.audience_type
    having sum(g.sample_size)>=greatest(5,coalesce(p_min_platform_sample,10))
  )
  select * from company_rows union all select * from platform_rows
  order by scope,sample_size desc;
end;
$$;

revoke all on function public.browse_recent_territory_market_events(integer) from public, anon;
grant execute on function public.browse_recent_territory_market_events(integer) to authenticated;
revoke all on function public.get_conversion_learning_benchmarks(integer) from public, anon;
grant execute on function public.get_conversion_learning_benchmarks(integer) to authenticated;
