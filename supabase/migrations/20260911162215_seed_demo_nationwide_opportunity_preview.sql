insert into public.opportunity_customer_matches (
  opportunity_id,
  company_id,
  match_score,
  match_reasons,
  status,
  matched_at
)
select
  o.id,
  demo.company_id,
  greatest(0::numeric, least(100::numeric, coalesce(o.score, 0::numeric))),
  jsonb_build_object(
    'source', 'demo_nationwide_preview',
    'reason', 'B2B-visible opportunity included for demo exploration'
  ),
  'new',
  now()
from public.opportunities o
join (
  select distinct cm.company_id
  from public.demo_accounts da
  join public.company_memberships cm
    on cm.user_id = da.user_id
   and cm.status = 'active'
) demo on true
where o.b2b_eligible
  and o.customer_visible
on conflict (opportunity_id, company_id) do nothing;
