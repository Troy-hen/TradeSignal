create or replace function public.get_owned_market_signal(p_match_id uuid)
returns table (
  market_signal_trade_match_id uuid, signal_id uuid, signal_type text, title text, summary text,
  location_text text, postcode_district text, trade_name text, trade_slug text,
  project_value_low numeric, project_value_high numeric, estimated_trade_value_low numeric,
  estimated_trade_value_high numeric, fit_score numeric, opportunity_bucket text, match_reasons text[],
  recommended_action text, procurement_stage text, notice_type text, buyer_name text, buyer_identifier text,
  supplier_name text, deadline_at timestamptz, contract_start_date date, contract_end_date date,
  cpv_codes text[], contact jsonb, source text, source_url text, external_ocid text,
  published_at timestamptz, current_action text
)
language plpgsql stable security definer set search_path=public as $$
declare v_company_id uuid;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  select cm.company_id into v_company_id from public.company_memberships cm
  where cm.user_id=auth.uid() and cm.status='active' order by cm.created_at limit 1;
  if v_company_id is null then return; end if;
  return query
  select mt.id, ms.id, ms.signal_type, ms.title, ms.summary, ms.location_text, ms.postcode_district,
         tc.name, tc.slug, ms.estimated_project_value_low, ms.estimated_project_value_high,
         mt.estimated_trade_value_low, mt.estimated_trade_value_high, mt.fit_score, mt.opportunity_bucket,
         mt.match_reasons, mt.recommended_action, coalesce(ms.procurement_stage,ms.notice_type), ms.notice_type,
         ms.buyer_name, ms.buyer_identifier, ms.supplier_name, ms.deadline_at, ms.contract_start_date,
         ms.contract_end_date, ms.cpv_codes, ms.contact, ms.source, ms.source_url, ms.external_ocid,
         ms.published_at, coalesce(st.current_action,'new')
  from public.market_signal_trade_matches mt
  join public.market_signals ms on ms.id=mt.signal_id
  join public.trade_categories tc on tc.id=mt.trade_category_id
  join public.territories tr on tr.postcode_district=ms.postcode_district and tr.trade_category_id=mt.trade_category_id and tr.is_active
  join public.territory_claims cl on cl.territory_id=tr.id and cl.company_id=v_company_id and cl.status='active'
  left join public.market_signal_company_states st on st.market_signal_trade_match_id=mt.id and st.company_id=v_company_id
  where mt.id=p_match_id and mt.is_active and ms.is_active limit 1;
end; $$;
revoke all on function public.get_owned_market_signal(uuid) from public,anon;
grant execute on function public.get_owned_market_signal(uuid) to authenticated;

create or replace function public.set_market_signal_action(p_match_id uuid,p_action text,p_contract_value_gbp numeric default null,p_note text default null)
returns void language plpgsql security definer set search_path=public as $$
declare v_company_id uuid; v_now timestamptz:=now();
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if p_action not in ('new','saved','contacted','quoted','won','lost','bid_planned','bid_submitted','awarded') then raise exception 'invalid_action'; end if;
  select cm.company_id into v_company_id from public.company_memberships cm where cm.user_id=auth.uid() and cm.status='active' order by cm.created_at limit 1;
  if v_company_id is null then raise exception 'company_required'; end if;
  if not exists(select 1 from public.market_signal_trade_matches mt join public.market_signals ms on ms.id=mt.signal_id join public.territories tr on tr.postcode_district=ms.postcode_district and tr.trade_category_id=mt.trade_category_id and tr.is_active join public.territory_claims cl on cl.territory_id=tr.id where mt.id=p_match_id and cl.company_id=v_company_id and cl.status='active') then raise exception 'not_entitled'; end if;
  insert into public.market_signal_company_states(company_id,market_signal_trade_match_id,current_action,contract_value_gbp,note,first_viewed_at,contacted_at,quoted_at,won_at,lost_at,updated_at)
  values(v_company_id,p_match_id,p_action,p_contract_value_gbp,nullif(btrim(p_note),''),case when p_action='new' then v_now else null end,case when p_action='contacted' then v_now else null end,case when p_action='quoted' then v_now else null end,case when p_action in ('won','awarded') then v_now else null end,case when p_action='lost' then v_now else null end,v_now)
  on conflict(company_id,market_signal_trade_match_id) do update set current_action=excluded.current_action,contract_value_gbp=coalesce(excluded.contract_value_gbp,public.market_signal_company_states.contract_value_gbp),note=coalesce(excluded.note,public.market_signal_company_states.note),first_viewed_at=coalesce(public.market_signal_company_states.first_viewed_at,excluded.first_viewed_at),contacted_at=coalesce(excluded.contacted_at,public.market_signal_company_states.contacted_at),quoted_at=coalesce(excluded.quoted_at,public.market_signal_company_states.quoted_at),won_at=coalesce(excluded.won_at,public.market_signal_company_states.won_at),lost_at=coalesce(excluded.lost_at,public.market_signal_company_states.lost_at),updated_at=v_now;
end; $$;
revoke all on function public.set_market_signal_action(uuid,text,numeric,text) from public,anon;
grant execute on function public.set_market_signal_action(uuid,text,numeric,text) to authenticated;
