create or replace function public.apply_intelligence_need_rules()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  v_context text;
  v_market_id uuid;
begin
  select o.market_id,
    lower(concat_ws(' ',o.title,o.why_now,o.likely_requirements::text,s.interpretation::text,ev.factual_data::text))
  into v_market_id,v_context
  from public.opportunities o
  join public.signals s on s.id=new.signal_id
  left join public.signal_evidence se on se.signal_id=s.id
  left join public.events ev on ev.id=se.event_id
  where o.id=new.opportunity_id
  limit 1;

  with matched_rules as (
    select distinct on (r.need_category_id)
      r.need_category_id,r.match_weight,r.rule_key
    from public.intelligence_need_rules r
    join public.signals s on s.id=new.signal_id
    left join public.signal_evidence se on se.signal_id=s.id
    left join public.events ev on ev.id=se.event_id
    where r.is_active
      and (r.market_id is null or r.market_id=v_market_id)
      and (r.signal_type is null or r.signal_type=s.signal_type)
      and (r.signal_family is null or r.signal_family=s.signal_family)
      and (r.event_type is null or r.event_type=ev.event_type)
      and (coalesce(cardinality(r.match_terms),0)=0 or exists(
        select 1 from unnest(r.match_terms) term where v_context like '%'||lower(term)||'%'
      ))
    order by r.need_category_id,r.match_weight desc,r.rule_key
  )
  insert into public.opportunity_needs(opportunity_id,need_category_id,relevance,evidence)
  select new.opportunity_id,mr.need_category_id,mr.match_weight,
    jsonb_build_object('match_method','intelligence_need_rule','rule_key',mr.rule_key,'signal_id',new.signal_id)
  from matched_rules mr
  on conflict(opportunity_id,need_category_id) do update set
    relevance=greatest(public.opportunity_needs.relevance,excluded.relevance),
    evidence=excluded.evidence;
  return new;
end;
$$;

revoke all on function public.apply_intelligence_need_rules() from public,anon,authenticated;
grant execute on function public.apply_intelligence_need_rules() to service_role;

drop trigger if exists zz_intelligence_need_rules on public.opportunity_signals;
create trigger zz_intelligence_need_rules
after insert or update on public.opportunity_signals
for each row execute function public.apply_intelligence_need_rules();

with source_context as (
 select os.opportunity_id,os.signal_id,o.market_id,s.signal_type,s.signal_family,
   string_agg(lower(concat_ws(' ',o.title,o.why_now,o.likely_requirements::text,s.interpretation::text,ev.factual_data::text)),' ') context,
   max(ev.event_type) event_type
 from public.opportunity_signals os
 join public.opportunities o on o.id=os.opportunity_id
 join public.signals s on s.id=os.signal_id
 left join public.signal_evidence se on se.signal_id=s.id
 left join public.events ev on ev.id=se.event_id
 group by os.opportunity_id,os.signal_id,o.market_id,s.signal_type,s.signal_family
), candidate_needs as (
 select c.opportunity_id,c.signal_id,r.need_category_id,r.match_weight,r.rule_key
 from source_context c
 join public.intelligence_need_rules r on r.is_active
  and (r.market_id is null or r.market_id=c.market_id)
  and (r.signal_type is null or r.signal_type=c.signal_type)
  and (r.signal_family is null or r.signal_family=c.signal_family)
  and (r.event_type is null or r.event_type=c.event_type)
  and (coalesce(cardinality(r.match_terms),0)=0 or exists(
    select 1 from unnest(r.match_terms) term where c.context like '%'||lower(term)||'%'
  ))
), matched_needs as (
 select distinct on (opportunity_id,need_category_id)
   opportunity_id,need_category_id,match_weight,rule_key,signal_id
 from candidate_needs
 order by opportunity_id,need_category_id,match_weight desc,signal_id
)
insert into public.opportunity_needs(opportunity_id,need_category_id,relevance,evidence)
select opportunity_id,need_category_id,match_weight,
  jsonb_build_object('match_method','expanded_taxonomy_backfill','rule_key',rule_key,'signal_id',signal_id)
from matched_needs
on conflict(opportunity_id,need_category_id) do update set
 relevance=greatest(public.opportunity_needs.relevance,excluded.relevance),
 evidence=excluded.evidence;