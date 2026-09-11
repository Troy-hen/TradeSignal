-- Unified B2B service-need taxonomy.
-- Needs are inferred from evidence and are not customer subscriptions.
-- One canonical opportunity may carry several inferred needs.

create table if not exists public.intelligence_need_rules (
  id uuid primary key default gen_random_uuid(),
  rule_key text not null unique,
  event_type text,
  signal_type text,
  signal_family text,
  need_category_id uuid not null references public.need_categories(id) on delete cascade,
  match_terms text[] not null default '{}'::text[],
  match_weight numeric(6,5) not null default 0.5 check (match_weight >= 0 and match_weight <= 1),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists intelligence_need_rules_match_idx
  on public.intelligence_need_rules(event_type, signal_type, signal_family, is_active);

insert into public.need_categories (market_id, slug, name, description, is_default)
select m.id, v.slug, v.name, v.description, false
from public.opportunity_markets m
join (values
  ('hospitality_openings','epos_payments','EPOS and payments','EPOS, payments and digital ordering infrastructure for a hospitality or customer-facing operation.'),
  ('hospitality_openings','managed_it_services','Managed IT services','Managed IT, cyber and operational technology support for a customer-facing business.'),
  ('hospitality_openings','broadband_connectivity','Broadband and connectivity','Business broadband, Wi-Fi and connectivity for a new or changing premises.'),
  ('hospitality_openings','signage_branding','Signage and branding','External signage, wayfinding, graphics and launch branding.'),
  ('hospitality_openings','commercial_kitchen_equipment','Commercial kitchen and extraction','Commercial kitchen, extraction and food-service equipment.'),
  ('moves_fitouts','office_workplace_furniture','Office and workplace furniture','Office furniture, workplace layout and furniture supply for a move, refit or expansion.'),
  ('moves_fitouts','managed_it_services','Managed IT services','Managed IT, cyber and technology support for a growing or changing organisation.'),
  ('moves_fitouts','broadband_connectivity','Broadband and connectivity','Business broadband, leased connectivity, Wi-Fi and telecoms for a premises.'),
  ('moves_fitouts','signage_branding','Signage and branding','Signage, wayfinding, graphics and environmental branding for a premises change.'),
  ('moves_fitouts','security_access_control','Security and access control','CCTV, access control, alarms and physical security for a commercial site.'),
  ('moves_fitouts','accountancy_finance','Accountancy and finance','Accountancy, tax, bookkeeping or finance support associated with business change.'),
  ('moves_fitouts','commercial_cleaning_facilities','Commercial cleaning and facilities','Cleaning, waste, pest and facilities services for a commercial premises.'),
  ('care_health','managed_it_services','Managed IT services','Managed IT, clinical technology and cyber support for a care or health organisation.'),
  ('care_health','broadband_connectivity','Broadband and connectivity','Business broadband, resilient connectivity and Wi-Fi for a care or health site.'),
  ('care_health','security_access_control','Security and access control','Access, CCTV and safety systems for a care or health site.'),
  ('care_health','office_workplace_furniture','Office and workplace furniture','Workplace, clinical and operational furniture for a care or health site.'),
  ('care_health','accountancy_finance','Accountancy and finance','Accountancy, payroll, tax and finance support for a care or health organisation.'),
  ('care_health','signage_branding','Signage and branding','Wayfinding, compliance and external signage for a care or health site.'),
  ('commercial_energy','solar_ev_charging','Solar and EV charging','Solar, battery, EV charging and related commercial energy infrastructure.'),
  ('commercial_energy','managed_it_services','Managed IT services','Energy monitoring, controls and technology support for a commercial property.'),
  ('growing_businesses','accountancy_finance','Accountancy and finance','Accountancy, tax, bookkeeping, payroll or finance support for a growing business.'),
  ('growing_businesses','managed_it_services','Managed IT services','Managed IT, cyber and technology support for a growing business.'),
  ('growing_businesses','broadband_connectivity','Broadband and connectivity','Business broadband, telecoms and connectivity for growth or a new location.'),
  ('growing_businesses','hr_payroll_recruitment','HR, payroll and recruitment','HR, payroll, recruitment and people operations for a growing business.'),
  ('growing_businesses','epos_payments','EPOS and payments','EPOS, payments and operational software for a growing customer-facing business.'),
  ('growing_businesses','security_access_control','Security and access control','Security, access and monitoring for a growing or expanding business.'),
  ('public_contracts','managed_it_services','Managed IT services','Managed IT, cyber and technology delivery relevant to a public contract.'),
  ('public_contracts','office_workplace_furniture','Office and workplace furniture','Office, workplace and operational furniture relevant to contract delivery.'),
  ('public_contracts','accountancy_finance','Accountancy and finance','Accountancy, finance, audit or commercial support relevant to contract delivery.'),
  ('public_contracts','signage_branding','Signage and branding','Signage, communications and wayfinding relevant to contract delivery.'),
  ('public_contracts','commercial_cleaning_facilities','Commercial cleaning and facilities','Cleaning, facilities, waste or maintenance services relevant to contract delivery.')
) as v(market_slug, slug, name, description) on v.market_slug = m.slug
on conflict (market_id, slug) do update set
  name = excluded.name, description = excluded.description, is_active = true, updated_at = now();

insert into public.supplier_categories (slug, name, description, is_active)
values
  ('epos-payments','EPOS and payments','EPOS, payment processing and digital ordering suppliers.',true),
  ('managed-it-services','Managed IT services','Managed IT, cyber, cloud and technology support suppliers.',true),
  ('broadband-connectivity','Broadband and connectivity','Business broadband, telecoms, Wi-Fi and connectivity suppliers.',true),
  ('accountancy-finance','Accountancy and finance','Accountancy, tax, bookkeeping, payroll and finance suppliers.',true),
  ('office-workplace-furniture','Office and workplace furniture','Office furniture, workplace design and furniture supply.',true),
  ('signage-branding','Signage and branding','Signage, wayfinding, graphics and environmental branding.',true),
  ('security-access-control','Security and access control','CCTV, alarms, access control and physical security.',true),
  ('commercial-cleaning-facilities','Commercial cleaning and facilities','Commercial cleaning, waste, pest and facilities suppliers.',true),
  ('hr-payroll-recruitment','HR, payroll and recruitment','HR, recruitment, payroll and people operations suppliers.',true),
  ('commercial-kitchen-equipment','Commercial kitchen and extraction','Commercial kitchen, extraction and food-service equipment.',true),
  ('solar-ev-charging','Solar and EV charging','Solar, battery, EV charging and commercial energy infrastructure.',true)
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, is_active = true, updated_at = now();

with mapping(supplier_slug, market_slug, need_slug, match_weight) as (
  values
    ('epos-payments','hospitality_openings','epos_payments',0.95),
    ('epos-payments','growing_businesses','epos_payments',0.85),
    ('managed-it-services','hospitality_openings','managed_it_services',0.75),
    ('managed-it-services','moves_fitouts','managed_it_services',0.90),
    ('managed-it-services','care_health','managed_it_services',0.90),
    ('managed-it-services','commercial_energy','managed_it_services',0.65),
    ('managed-it-services','growing_businesses','managed_it_services',0.95),
    ('managed-it-services','public_contracts','managed_it_services',0.90),
    ('broadband-connectivity','hospitality_openings','broadband_connectivity',0.80),
    ('broadband-connectivity','moves_fitouts','broadband_connectivity',0.90),
    ('broadband-connectivity','care_health','broadband_connectivity',0.85),
    ('broadband-connectivity','growing_businesses','broadband_connectivity',0.90),
    ('accountancy-finance','moves_fitouts','accountancy_finance',0.45),
    ('accountancy-finance','care_health','accountancy_finance',0.75),
    ('accountancy-finance','growing_businesses','accountancy_finance',0.95),
    ('accountancy-finance','public_contracts','accountancy_finance',0.80),
    ('office-workplace-furniture','moves_fitouts','office_workplace_furniture',0.95),
    ('office-workplace-furniture','care_health','office_workplace_furniture',0.75),
    ('office-workplace-furniture','public_contracts','office_workplace_furniture',0.80),
    ('signage-branding','hospitality_openings','signage_branding',0.80),
    ('signage-branding','moves_fitouts','signage_branding',0.75),
    ('signage-branding','care_health','signage_branding',0.65),
    ('signage-branding','public_contracts','signage_branding',0.70),
    ('security-access-control','moves_fitouts','security_access_control',0.80),
    ('security-access-control','care_health','security_access_control',0.85),
    ('security-access-control','growing_businesses','security_access_control',0.65),
    ('commercial-cleaning-facilities','moves_fitouts','commercial_cleaning_facilities',0.70),
    ('commercial-cleaning-facilities','public_contracts','commercial_cleaning_facilities',0.85),
    ('hr-payroll-recruitment','growing_businesses','hr_payroll_recruitment',0.95),
    ('commercial-kitchen-equipment','hospitality_openings','commercial_kitchen_equipment',0.95),
    ('solar-ev-charging','commercial_energy','solar_ev_charging',0.95)
)
insert into public.supplier_need_mappings (supplier_category_id, need_category_id, match_weight, match_method)
select sc.id, nc.id, mapping.match_weight, 'signal_need_taxonomy'
from mapping
join public.supplier_categories sc on sc.slug = mapping.supplier_slug
join public.opportunity_markets om on om.slug = mapping.market_slug
join public.need_categories nc on nc.market_id = om.id and nc.slug = mapping.need_slug
on conflict (supplier_category_id, need_category_id) do update set
  match_weight = excluded.match_weight, match_method = excluded.match_method, is_active = true;

insert into public.intelligence_signal_rules (
  rule_key, event_type, signal_type, signal_family, can_qualify_existing_business, minimum_confidence
)
values
  ('planning_activity_b2b','planning_activity','planning_activity','moves_fitouts',true,0.55),
  ('planning_approved_b2b','planning_approved','planning_approved','moves_fitouts',true,0.65),
  ('commercial_planning_activity_b2b','commercial_planning_activity','commercial_planning_activity','moves_fitouts',true,0.60),
  ('new_business_location_b2b','new_business_location','business_move','moves_fitouts',true,0.65),
  ('office_move_detected_b2b','office_move_detected','business_move','moves_fitouts',true,0.70),
  ('premises_opening_b2b','premises_opening','business_opening','business_change',true,0.65),
  ('technology_gap_b2b','technology_gap_detected','technology_gap','growing_businesses',true,0.60),
  ('fsa_venue_registered_b2b','fsa_venue_registered','hospitality_change','hospitality_openings',true,0.65),
  ('fsa_rating_changed_b2b','fsa_rating_changed','hospitality_change','hospitality_openings',true,0.65),
  ('cqc_location_added_b2b','cqc_location_added','care_health_change','care_health',true,0.65),
  ('commercial_epc_created_b2b','commercial_epc_created','commercial_energy_change','commercial_energy',true,0.65),
  ('commercial_retrofit_b2b','commercial_retrofit_signal','commercial_retrofit','commercial_energy',true,0.70),
  ('hiring_velocity_b2b','hiring_velocity_increased','business_growth','growing_businesses',true,0.65),
  ('procurement_notice_b2b','procurement_notice','procurement_intent','public_contracts',true,0.70),
  ('contract_award_b2b','contract_award','procurement_intent','public_contracts',true,0.75)
on conflict (rule_key) do update set
  event_type = excluded.event_type, signal_type = excluded.signal_type,
  signal_family = excluded.signal_family,
  can_qualify_existing_business = excluded.can_qualify_existing_business,
  minimum_confidence = excluded.minimum_confidence, is_active = true, updated_at = now();

with rule_seed(rule_key, event_type, signal_type, signal_family, market_slug, need_slug, match_terms, match_weight) as (
  values
    ('planning_fitout','planning_activity','planning_activity',null,'moves_fitouts','commercial_fit_out','{}'::text[],0.85),
    ('planning_workplace_furniture','planning_activity','planning_activity',null,'moves_fitouts','office_workplace_furniture',array['office','workshop','nursery','shop','retail','commercial','storage','community'],0.72),
    ('planning_managed_it','planning_activity','planning_activity',null,'moves_fitouts','managed_it_services',array['office','workshop','nursery','shop','retail','commercial','storage','community'],0.68),
    ('planning_connectivity','planning_activity','planning_activity',null,'moves_fitouts','broadband_connectivity',array['office','workshop','nursery','shop','retail','commercial','storage','community'],0.68),
    ('planning_signage','planning_activity','planning_activity',null,'moves_fitouts','signage_branding',array['office','workshop','nursery','shop','retail','commercial','storage','community'],0.60),
    ('planning_accountancy','planning_activity','planning_activity',null,'moves_fitouts','accountancy_finance',array['office','workshop','nursery','shop','retail','commercial','storage','community'],0.42),
    ('commercial_hospitality_epos','commercial_planning_activity','commercial_planning_activity',null,'hospitality_openings','epos_payments',array['restaurant','cafe','coffee','pub','bar','takeaway','hotel'],0.92),
    ('commercial_hospitality_kitchen','commercial_planning_activity','commercial_planning_activity',null,'hospitality_openings','commercial_kitchen_equipment',array['restaurant','cafe','coffee','pub','bar','takeaway','hotel'],0.90),
    ('commercial_hospitality_connectivity','commercial_planning_activity','commercial_planning_activity',null,'hospitality_openings','broadband_connectivity',array['restaurant','cafe','coffee','pub','bar','takeaway','hotel'],0.72),
    ('commercial_hospitality_signage','commercial_planning_activity','commercial_planning_activity',null,'hospitality_openings','signage_branding',array['restaurant','cafe','coffee','pub','bar','takeaway','hotel'],0.72),
    ('growth_accountancy','business_growth','business_growth','growing_businesses','growing_businesses','accountancy_finance','{}'::text[],0.92),
    ('growth_managed_it','business_growth','business_growth','growing_businesses','growing_businesses','managed_it_services','{}'::text[],0.82),
    ('growth_connectivity','business_growth','business_growth','growing_businesses','growing_businesses','broadband_connectivity','{}'::text[],0.78),
    ('growth_people_ops','business_growth','business_growth','growing_businesses','growing_businesses','hr_payroll_recruitment','{}'::text[],0.80),
    ('technology_gap_it','technology_gap','technology_gap','growing_businesses','growing_businesses','managed_it_services','{}'::text[],0.95),
    ('technology_gap_connectivity','technology_gap','technology_gap','growing_businesses','growing_businesses','broadband_connectivity','{}'::text[],0.85),
    ('care_managed_it','care_health','care_health_change','care_health','care_health','managed_it_services','{}'::text[],0.82),
    ('care_connectivity','care_health','care_health_change','care_health','care_health','broadband_connectivity','{}'::text[],0.78),
    ('care_security','care_health','care_health_change','care_health','care_health','security_access_control','{}'::text[],0.80),
    ('energy_solar','commercial_energy','commercial_energy_change','commercial_energy','commercial_energy','solar_ev_charging','{}'::text[],0.92),
    ('public_managed_it','procurement','procurement_intent','public_contracts','public_contracts','managed_it_services','{}'::text[],0.82),
    ('public_accountancy','procurement','procurement_intent','public_contracts','public_contracts','accountancy_finance','{}'::text[],0.72),
    ('public_facilities','procurement','procurement_intent','public_contracts','public_contracts','commercial_cleaning_facilities','{}'::text[],0.80)
)
insert into public.intelligence_need_rules (
  rule_key, event_type, signal_type, signal_family, need_category_id, match_terms, match_weight
)
select r.rule_key, r.event_type, r.signal_type, r.signal_family, nc.id, r.match_terms, r.match_weight
from rule_seed r
join public.opportunity_markets om on om.slug = r.market_slug
join public.need_categories nc on nc.market_id = om.id and nc.slug = r.need_slug
on conflict (rule_key) do update set
  event_type = excluded.event_type, signal_type = excluded.signal_type,
  signal_family = excluded.signal_family, need_category_id = excluded.need_category_id,
  match_terms = excluded.match_terms, match_weight = excluded.match_weight,
  is_active = true, updated_at = now();

create or replace function public.apply_intelligence_need_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_context text;
begin
  select lower(concat_ws(' ', o.title, o.why_now, o.likely_requirements::text, s.interpretation::text, ev.factual_data::text))
  into v_context
  from public.opportunities o
  join public.signals s on s.id = new.signal_id
  left join public.signal_evidence se on se.signal_id = s.id
  left join public.events ev on ev.id = se.event_id
  where o.id = new.opportunity_id
  limit 1;

  insert into public.opportunity_needs (opportunity_id, need_category_id, relevance, evidence)
  select new.opportunity_id, r.need_category_id, r.match_weight,
    jsonb_build_object('match_method','intelligence_need_rule','rule_key',r.rule_key,'signal_id',new.signal_id)
  from public.intelligence_need_rules r
  join public.signals s on s.id = new.signal_id
  left join public.signal_evidence se on se.signal_id = s.id
  left join public.events ev on ev.id = se.event_id
  where r.is_active
    and (r.signal_type is null or r.signal_type = s.signal_type)
    and (r.signal_family is null or r.signal_family = s.signal_family)
    and (r.event_type is null or r.event_type = ev.event_type)
    and (coalesce(cardinality(r.match_terms), 0) = 0 or exists (
      select 1 from unnest(r.match_terms) term where v_context like '%' || lower(term) || '%'
    ))
  on conflict (opportunity_id, need_category_id) do update set
    relevance = greatest(public.opportunity_needs.relevance, excluded.relevance),
    evidence = excluded.evidence;
  return new;
end;
$$;

revoke all on function public.apply_intelligence_need_rules() from public, anon, authenticated;
grant execute on function public.apply_intelligence_need_rules() to service_role;

drop trigger if exists zz_intelligence_need_rules on public.opportunity_signals;
create trigger zz_intelligence_need_rules
after insert or update on public.opportunity_signals
for each row execute function public.apply_intelligence_need_rules();

with source_context as (
  select os.opportunity_id, os.signal_id, s.signal_type, s.signal_family,
    string_agg(lower(concat_ws(' ', o.title, o.why_now, o.likely_requirements::text, s.interpretation::text, ev.factual_data::text)), ' ') as context,
    max(ev.event_type) as event_type
  from public.opportunity_signals os
  join public.opportunities o on o.id = os.opportunity_id
  join public.signals s on s.id = os.signal_id
  left join public.signal_evidence se on se.signal_id = s.id
  left join public.events ev on ev.id = se.event_id
  group by os.opportunity_id, os.signal_id, s.signal_type, s.signal_family
)
insert into public.opportunity_needs (opportunity_id, need_category_id, relevance, evidence)
select c.opportunity_id, r.need_category_id, r.match_weight,
  jsonb_build_object('match_method','intelligence_need_rule_backfill','rule_key',r.rule_key,'signal_id',c.signal_id)
from source_context c
join public.intelligence_need_rules r on r.is_active
  and (r.signal_type is null or r.signal_type = c.signal_type)
  and (r.signal_family is null or r.signal_family = c.signal_family)
  and (r.event_type is null or r.event_type = c.event_type)
  and (coalesce(cardinality(r.match_terms), 0) = 0 or exists (
    select 1 from unnest(r.match_terms) term where c.context like '%' || lower(term) || '%'
  ))
on conflict (opportunity_id, need_category_id) do update set
  relevance = greatest(public.opportunity_needs.relevance, excluded.relevance),
  evidence = excluded.evidence;

update public.signals s
set signal_family = r.signal_family, updated_at = now()
from public.intelligence_signal_rules r
where r.is_active and s.signal_family is null and s.signal_type = r.signal_type;

alter table public.intelligence_need_rules enable row level security;
revoke all on table public.intelligence_need_rules from anon, authenticated;
grant all on table public.intelligence_need_rules to service_role;
drop policy if exists b2b_need_rules_admin_read on public.intelligence_need_rules;
create policy b2b_need_rules_admin_read on public.intelligence_need_rules
for select to authenticated using ((select public.is_platform_admin()));

drop trigger if exists intelligence_need_rules_updated_at on public.intelligence_need_rules;
create trigger intelligence_need_rules_updated_at
before update on public.intelligence_need_rules
for each row execute function public.set_updated_at();
