with default_scope(market_slug,need_slugs) as (
  values
  ('hospitality_openings',array['web_design_development','ecommerce_development','website_maintenance_hosting','branding_creative','epos_payments','booking_reservation_software','accounting_software','accountancy_finance','broadband_connectivity','signage_branding','commercial_kitchen_equipment','commercial_cleaning_facilities','office_workplace_furniture','security_access_control','commercial_insurance','hospitality_operations']::text[]),
  ('moves_fitouts',array['office_workplace_furniture','office_supplies','office_equipment','relocation_services','commercial_fit_out','interior_design','broadband_connectivity','telecoms_voip','managed_it_services','signage_branding','security_access_control','commercial_cleaning_facilities','building_maintenance','property_management','commercial_insurance','accountancy_finance']::text[]),
  ('care_health',array['web_design_development','booking_reservation_software','healthcare_supplies','medical_dental_equipment','care_operations','managed_it_services','cyber_security','broadband_connectivity','security_access_control','fire_safety','commercial_cleaning_facilities','hr_payroll_recruitment','accountancy_finance','office_workplace_furniture']::text[]),
  ('commercial_energy',array['energy_supply','energy_consulting','energy_efficiency','solar_ev_charging','building_controls_bms','hvac_air_conditioning','electrical','building_maintenance','sustainability_consulting','environmental_services','commercial_finance']::text[]),
  ('growing_businesses',array['web_design_development','ecommerce_development','digital_marketing','crm_software','erp_business_management','accounting_software','hr_payroll_software','project_management_software','cyber_security','cloud_computing','ai_automation','managed_it_services','broadband_connectivity','accountancy_finance','bookkeeping','tax_advisory','payroll_services','commercial_finance','recruitment_executive_search','business_consulting','commercial_insurance','branding_creative']::text[])
),defaults as (
  select format('taxonomy_default_%s_%s',ds.market_slug,u.need_slug) rule_key,ds.market_slug,u.need_slug
  from default_scope ds cross join unnest(ds.need_slugs) u(need_slug)
)
insert into public.intelligence_need_rules(rule_key,market_id,event_type,signal_type,signal_family,need_category_id,match_terms,match_weight,is_active)
select d.rule_key,om.id,null::text,
  case when d.market_slug in ('hospitality_openings','growing_businesses') then 'business_opening' else null::text end,
  case when d.market_slug in ('hospitality_openings','growing_businesses') then 'business_change' else d.market_slug end,
  nc.id,'{}'::text[],0.82,true
from defaults d
join public.opportunity_markets om on om.slug=d.market_slug
join public.need_categories nc on nc.market_id=om.id and nc.slug=d.need_slug
on conflict(rule_key) do update set market_id=excluded.market_id,event_type=excluded.event_type,signal_type=excluded.signal_type,signal_family=excluded.signal_family,need_category_id=excluded.need_category_id,match_terms=excluded.match_terms,match_weight=excluded.match_weight,is_active=true,updated_at=now();