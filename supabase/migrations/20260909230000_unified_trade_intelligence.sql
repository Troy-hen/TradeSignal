alter table public.market_signals
  add column if not exists procurement_stage text,
  add column if not exists notice_type text,
  add column if not exists external_ocid text,
  add column if not exists buyer_name text,
  add column if not exists buyer_identifier text,
  add column if not exists supplier_name text,
  add column if not exists deadline_at timestamptz,
  add column if not exists contract_start_date date,
  add column if not exists contract_end_date date,
  add column if not exists cpv_codes text[] not null default '{}',
  add column if not exists delivery_postcodes text[] not null default '{}',
  add column if not exists delivery_regions text[] not null default '{}',
  add column if not exists contact jsonb not null default '{}'::jsonb,
  add column if not exists value_currency text not null default 'GBP',
  add column if not exists source_updated_at timestamptz,
  add column if not exists location_confidence text not null default 'unresolved';

alter table public.market_signal_trade_matches
  add column if not exists opportunity_bucket text,
  add column if not exists match_reasons text[] not null default '{}',
  add column if not exists match_method text not null default 'rules',
  add column if not exists scored_at timestamptz,
  add column if not exists is_active boolean not null default true;

create index if not exists market_signals_current_lookup_idx
  on public.market_signals(postcode_district, signal_type, published_at desc)
  where is_active;
create index if not exists market_signals_deadline_idx
  on public.market_signals(deadline_at) where is_active;
create index if not exists market_signals_ocid_idx
  on public.market_signals(external_ocid) where external_ocid is not null;
create index if not exists market_signal_trade_matches_active_idx
  on public.market_signal_trade_matches(trade_category_id, signal_id, fit_score desc)
  where is_active;

create table if not exists public.market_signal_company_states (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  market_signal_trade_match_id uuid not null references public.market_signal_trade_matches(id) on delete cascade,
  current_action text not null default 'new' check (current_action in ('new','saved','contacted','quoted','won','lost','bid_planned','bid_submitted','awarded')),
  contract_value_gbp numeric,
  note text,
  first_viewed_at timestamptz,
  contacted_at timestamptz,
  quoted_at timestamptz,
  won_at timestamptz,
  lost_at timestamptz,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(company_id, market_signal_trade_match_id)
);
create index if not exists market_signal_company_states_company_idx on public.market_signal_company_states(company_id, updated_at desc);
alter table public.market_signal_company_states enable row level security;
drop policy if exists "members can read own market signal state" on public.market_signal_company_states;
create policy "members can read own market signal state" on public.market_signal_company_states for select to authenticated using (public.is_company_member(company_id));
drop policy if exists "members can create own market signal state" on public.market_signal_company_states;
create policy "members can create own market signal state" on public.market_signal_company_states for insert to authenticated with check (public.is_company_member(company_id));
drop policy if exists "members can update own market signal state" on public.market_signal_company_states;
create policy "members can update own market signal state" on public.market_signal_company_states for update to authenticated using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));

alter table public.outreach_deliveries add column if not exists market_signal_trade_match_id uuid references public.market_signal_trade_matches(id) on delete cascade;
alter table public.outreach_response_links add column if not exists market_signal_trade_match_id uuid references public.market_signal_trade_matches(id) on delete cascade;
alter table public.quote_requests add column if not exists market_signal_trade_match_id uuid references public.market_signal_trade_matches(id) on delete cascade;
alter table public.opportunity_activity_events add column if not exists market_signal_trade_match_id uuid references public.market_signal_trade_matches(id) on delete cascade;

alter table public.outreach_deliveries alter column opportunity_id drop not null;
alter table public.outreach_response_links alter column opportunity_id drop not null;
alter table public.quote_requests alter column opportunity_id drop not null;
alter table public.opportunity_activity_events alter column opportunity_id drop not null;

do $$ begin
  if not exists (select 1 from pg_constraint where conname='outreach_deliveries_one_target_check') then
    alter table public.outreach_deliveries add constraint outreach_deliveries_one_target_check check (num_nonnulls(opportunity_id, market_signal_trade_match_id)=1);
  end if;
  if not exists (select 1 from pg_constraint where conname='outreach_response_links_one_target_check') then
    alter table public.outreach_response_links add constraint outreach_response_links_one_target_check check (num_nonnulls(opportunity_id, market_signal_trade_match_id)=1);
  end if;
  if not exists (select 1 from pg_constraint where conname='quote_requests_one_target_check') then
    alter table public.quote_requests add constraint quote_requests_one_target_check check (num_nonnulls(opportunity_id, market_signal_trade_match_id)=1);
  end if;
  if not exists (select 1 from pg_constraint where conname='opportunity_activity_events_one_target_check') then
    alter table public.opportunity_activity_events add constraint opportunity_activity_events_one_target_check check (num_nonnulls(opportunity_id, market_signal_trade_match_id)=1);
  end if;
end $$;

create index if not exists outreach_deliveries_market_signal_idx on public.outreach_deliveries(company_id, market_signal_trade_match_id, created_at desc) where market_signal_trade_match_id is not null;
create index if not exists outreach_response_links_market_signal_idx on public.outreach_response_links(company_id, market_signal_trade_match_id, created_at desc) where market_signal_trade_match_id is not null;
create index if not exists quote_requests_market_signal_idx on public.quote_requests(company_id, market_signal_trade_match_id, submitted_at desc) where market_signal_trade_match_id is not null;
create index if not exists activity_events_market_signal_idx on public.opportunity_activity_events(company_id, market_signal_trade_match_id, occurred_at desc) where market_signal_trade_match_id is not null;

create or replace function public.market_signal_is_current(p_type text, p_published timestamptz, p_deadline timestamptz)
returns boolean language sql stable set search_path=public as $$
  select case
    when p_type in ('tender','public_pipeline') then coalesce(p_deadline >= now() - interval '1 day', p_published >= now() - interval '180 days')
    when p_type='contract_award' then p_published >= now() - interval '180 days'
    when p_type='commercial_development' then p_published >= now() - interval '365 days'
    else p_published >= now() - interval '180 days'
  end;
$$;

create or replace function public.browse_territory_trade_intelligence(p_postcode_district text, p_trade_slug text)
returns table (
  postcode_district text,
  trade_name text,
  trade_slug text,
  planning_count bigint,
  tender_count bigint,
  public_pipeline_count bigint,
  contract_award_count bigint,
  commercial_development_count bigint,
  total_opportunity_count bigint,
  estimated_trade_value_gbp numeric,
  owns_territory boolean
)
language plpgsql stable security definer set search_path=public as $$
declare
  v_company_id uuid;
  v_trade_id uuid;
  v_trade_name text;
  v_district text := upper(btrim(p_postcode_district));
  v_owns boolean := false;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  select cm.company_id into v_company_id from public.company_memberships cm where cm.user_id=auth.uid() and cm.status='active' order by cm.created_at limit 1;
  if v_company_id is null then raise exception 'company_required'; end if;
  select tc.id, tc.name into v_trade_id, v_trade_name from public.trade_categories tc where tc.slug=p_trade_slug and tc.is_active;
  if v_trade_id is null then return; end if;
  select exists(
    select 1 from public.territory_claims cl
    join public.territories tr on tr.id=cl.territory_id
    where cl.company_id=v_company_id and cl.status='active' and tr.postcode_district=v_district and tr.trade_category_id=v_trade_id
  ) into v_owns;

  return query
  with p as (
    select count(*)::bigint as n, coalesce(sum(coalesce(o.estimated_trade_value_high,o.estimated_trade_value_low,0)),0)::numeric as value
    from public.application_trade_opportunities o
    where o.is_active and o.postcode_district=v_district and o.trade_category_id=v_trade_id
  ), m as (
    select
      count(*) filter(where ms.signal_type='tender')::bigint as tenders,
      count(*) filter(where ms.signal_type='public_pipeline')::bigint as pipelines,
      count(*) filter(where ms.signal_type='contract_award')::bigint as awards,
      count(*) filter(where ms.signal_type='commercial_development')::bigint as commercial,
      count(*)::bigint as n,
      coalesce(sum(coalesce(mt.estimated_trade_value_high,mt.estimated_trade_value_low,0)),0)::numeric as value
    from public.market_signal_trade_matches mt
    join public.market_signals ms on ms.id=mt.signal_id
    where mt.is_active and ms.is_active and mt.trade_category_id=v_trade_id and ms.postcode_district=v_district
      and public.market_signal_is_current(ms.signal_type,ms.published_at,ms.deadline_at)
      and coalesce(mt.fit_score,0)>=50
  )
  select v_district, v_trade_name, p_trade_slug, p.n, m.tenders, m.pipelines, m.awards, m.commercial,
         (p.n+m.n)::bigint, (p.value+m.value)::numeric, v_owns
  from p,m;
end; $$;
revoke all on function public.browse_territory_trade_intelligence(text,text) from public,anon;
grant execute on function public.browse_territory_trade_intelligence(text,text) to authenticated;

create or replace function public.browse_territory_trade_signal_feed(p_postcode_district text, p_trade_slug text, p_limit integer default 20)
returns table (
  source_kind text,
  source_record_id uuid,
  headline text,
  stage text,
  estimated_trade_value_low numeric,
  estimated_trade_value_high numeric,
  published_at timestamptz,
  deadline_at timestamptz,
  buyer_name text,
  summary text,
  recommended_action text,
  access_level text,
  source_url text,
  score numeric,
  opportunity_bucket text
)
language plpgsql stable security definer set search_path=public as $$
declare
  v_company_id uuid;
  v_trade_id uuid;
  v_district text := upper(btrim(p_postcode_district));
  v_owns boolean := false;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  select cm.company_id into v_company_id from public.company_memberships cm where cm.user_id=auth.uid() and cm.status='active' order by cm.created_at limit 1;
  select tc.id into v_trade_id from public.trade_categories tc where tc.slug=p_trade_slug and tc.is_active;
  if v_company_id is null or v_trade_id is null then return; end if;
  select exists(
    select 1 from public.territory_claims cl join public.territories tr on tr.id=cl.territory_id
    where cl.company_id=v_company_id and cl.status='active' and tr.postcode_district=v_district and tr.trade_category_id=v_trade_id
  ) into v_owns;

  return query
  with all_items as (
    select
      'planning'::text as source_kind,
      o.id as source_record_id,
      case when v_owns then coalesce(ac.project_type,'Planning opportunity') else 'Planning opportunity' end::text as headline,
      pa.status::text as stage,
      o.estimated_trade_value_low,
      o.estimated_trade_value_high,
      coalesce(pa.received_date::timestamptz,pa.created_at) as published_at,
      pa.decision_due_date::timestamptz as deadline_at,
      case when v_owns then coalesce(pa.agent_company,pa.applicant_name) else null end::text as buyer_name,
      case when v_owns then ac.summary else null end::text as summary,
      case when v_owns then o.recommended_action else null end::text as recommended_action,
      case when v_owns then 'full' else 'teaser' end::text as access_level,
      case when v_owns then pa.source_url else null end::text as source_url,
      case when v_owns then o.opportunity_score else null end::numeric as score,
      case when v_owns then o.opportunity_bucket::text else null end::text as opportunity_bucket,
      1 as sort_group
    from public.application_trade_opportunities o
    join public.planning_applications pa on pa.id=o.planning_application_id
    join public.application_classifications ac on ac.id=o.application_classification_id
    where o.is_active and o.postcode_district=v_district and o.trade_category_id=v_trade_id

    union all

    select
      ms.signal_type,
      mt.id,
      case when v_owns then ms.title else case ms.signal_type when 'tender' then 'Public tender opportunity' when 'public_pipeline' then 'Upcoming public-sector project' when 'contract_award' then 'Recent contract award' when 'commercial_development' then 'Commercial development opportunity' else 'Trade opportunity' end end,
      coalesce(ms.procurement_stage,ms.notice_type,ms.signal_type),
      mt.estimated_trade_value_low,
      mt.estimated_trade_value_high,
      ms.published_at,
      ms.deadline_at,
      case when v_owns then ms.buyer_name else null end,
      case when v_owns then ms.summary else null end,
      case when v_owns then mt.recommended_action else null end,
      case when v_owns then 'full' else 'teaser' end,
      case when v_owns then ms.source_url else null end,
      case when v_owns then mt.fit_score else null end,
      case when v_owns then mt.opportunity_bucket else null end,
      0 as sort_group
    from public.market_signal_trade_matches mt
    join public.market_signals ms on ms.id=mt.signal_id
    where mt.is_active and ms.is_active and mt.trade_category_id=v_trade_id and ms.postcode_district=v_district
      and public.market_signal_is_current(ms.signal_type,ms.published_at,ms.deadline_at)
      and coalesce(mt.fit_score,0)>=50
  )
  select i.source_kind,i.source_record_id,i.headline,i.stage,i.estimated_trade_value_low,i.estimated_trade_value_high,
         i.published_at,i.deadline_at,i.buyer_name,i.summary,i.recommended_action,i.access_level,i.source_url,i.score,i.opportunity_bucket
  from all_items i
  order by i.sort_group asc, coalesce(i.score,0) desc, i.published_at desc nulls last
  limit greatest(1,least(coalesce(p_limit,20),100));
end; $$;
revoke all on function public.browse_territory_trade_signal_feed(text,text,integer) from public,anon;
grant execute on function public.browse_territory_trade_signal_feed(text,text,integer) to authenticated;

create or replace function public.browse_owned_market_signals(p_limit integer default 100)
returns table (
  market_signal_trade_match_id uuid,
  signal_type text,
  title text,
  postcode_district text,
  trade_name text,
  trade_slug text,
  procurement_stage text,
  buyer_name text,
  estimated_trade_value_low numeric,
  estimated_trade_value_high numeric,
  deadline_at timestamptz,
  published_at timestamptz,
  fit_score numeric,
  opportunity_bucket text,
  recommended_action text,
  source_url text,
  current_action text
)
language plpgsql stable security definer set search_path=public as $$
declare v_company_id uuid;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  select cm.company_id into v_company_id from public.company_memberships cm where cm.user_id=auth.uid() and cm.status='active' order by cm.created_at limit 1;
  if v_company_id is null then return; end if;
  return query
  select mt.id,ms.signal_type,ms.title,ms.postcode_district,tc.name,tc.slug,coalesce(ms.procurement_stage,ms.notice_type),ms.buyer_name,
         mt.estimated_trade_value_low,mt.estimated_trade_value_high,ms.deadline_at,ms.published_at,mt.fit_score,mt.opportunity_bucket,mt.recommended_action,ms.source_url,
         coalesce(st.current_action,'new')
  from public.market_signal_trade_matches mt
  join public.market_signals ms on ms.id=mt.signal_id
  join public.trade_categories tc on tc.id=mt.trade_category_id
  join public.territories tr on tr.postcode_district=ms.postcode_district and tr.trade_category_id=mt.trade_category_id and tr.is_active
  join public.territory_claims cl on cl.territory_id=tr.id and cl.company_id=v_company_id and cl.status='active'
  left join public.market_signal_company_states st on st.market_signal_trade_match_id=mt.id and st.company_id=v_company_id
  where mt.is_active and ms.is_active and coalesce(mt.fit_score,0)>=50 and public.market_signal_is_current(ms.signal_type,ms.published_at,ms.deadline_at)
  order by coalesce(mt.fit_score,0) desc, ms.deadline_at asc nulls last, ms.published_at desc nulls last
  limit greatest(1,least(coalesce(p_limit,100),500));
end; $$;
revoke all on function public.browse_owned_market_signals(integer) from public,anon;
grant execute on function public.browse_owned_market_signals(integer) to authenticated;

create or replace function public.search_market_trade_signals(p_location text, p_trade_slug text default null, p_signal_type text default null, p_limit integer default 20)
returns table (
  market_signal_trade_match_id uuid,
  signal_type text,
  title text,
  postcode_district text,
  post_town text,
  trade_name text,
  trade_slug text,
  procurement_stage text,
  buyer_name text,
  estimated_trade_value_low numeric,
  estimated_trade_value_high numeric,
  deadline_at timestamptz,
  access_level text,
  recommended_action text,
  source_url text,
  fit_score numeric,
  total_matches bigint
)
language plpgsql stable security definer set search_path=public as $$
declare v_company_id uuid; v_location text:=lower(btrim(coalesce(p_location,'')));
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if v_location='' then raise exception 'location_required'; end if;
  select cm.company_id into v_company_id from public.company_memberships cm where cm.user_id=auth.uid() and cm.status='active' order by cm.created_at limit 1;
  if v_company_id is null then return; end if;
  return query
  with rows as (
    select mt.id,ms.signal_type,ms.title,ms.postcode_district,pd.post_town,tc.name as trade_name,tc.slug as trade_slug,
           coalesce(ms.procurement_stage,ms.notice_type) as procurement_stage,ms.buyer_name,mt.estimated_trade_value_low,mt.estimated_trade_value_high,
           ms.deadline_at,mt.recommended_action,ms.source_url,mt.fit_score,
           exists(select 1 from public.territories tr join public.territory_claims cl on cl.territory_id=tr.id where tr.postcode_district=ms.postcode_district and tr.trade_category_id=mt.trade_category_id and cl.company_id=v_company_id and cl.status='active') as owned
    from public.market_signal_trade_matches mt
    join public.market_signals ms on ms.id=mt.signal_id
    join public.trade_categories tc on tc.id=mt.trade_category_id
    left join public.postcode_districts pd on pd.id=ms.postcode_district
    where mt.is_active and ms.is_active and coalesce(mt.fit_score,0)>=50
      and public.market_signal_is_current(ms.signal_type,ms.published_at,ms.deadline_at)
      and (p_trade_slug is null or tc.slug=p_trade_slug)
      and (p_signal_type is null or ms.signal_type=p_signal_type)
      and (lower(coalesce(ms.postcode_district,''))=v_location or lower(coalesce(pd.post_town,'')) like '%'||v_location||'%' or lower(coalesce(pd.region,'')) like '%'||v_location||'%' or lower(coalesce(ms.location_text,'')) like '%'||v_location||'%')
  ), counted as (select r.*,count(*) over() as total_matches from rows r)
  select c.id,c.signal_type,
         case when c.owned then c.title else case c.signal_type when 'tender' then 'Public tender opportunity' when 'public_pipeline' then 'Upcoming public-sector project' when 'contract_award' then 'Recent contract award' when 'commercial_development' then 'Commercial development opportunity' else 'Trade opportunity' end end,
         c.postcode_district,c.post_town,c.trade_name,c.trade_slug,c.procurement_stage,
         case when c.owned then c.buyer_name else null end,c.estimated_trade_value_low,c.estimated_trade_value_high,c.deadline_at,
         case when c.owned then 'full' else 'teaser' end,
         case when c.owned then c.recommended_action else null end,
         case when c.owned then c.source_url else null end,
         case when c.owned then c.fit_score else null end,c.total_matches
  from counted c order by coalesce(c.fit_score,0) desc,c.deadline_at asc nulls last limit greatest(1,least(coalesce(p_limit,20),100));
end; $$;
revoke all on function public.search_market_trade_signals(text,text,text,integer) from public,anon;
grant execute on function public.search_market_trade_signals(text,text,text,integer) to authenticated;
