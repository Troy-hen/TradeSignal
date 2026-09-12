-- Keep the individual lead purchase limit separate from geographic reach.
-- vertical_key is populated at checkout from the matched supplier category.
alter table public.lead_unlocks
  add column if not exists vertical_key text;

create index if not exists lead_unlocks_company_vertical_status_idx
  on public.lead_unlocks(company_id, vertical_key, status, created_at desc);

update public.lead_unlocks as lu
set vertical_key = tc.slug
from public.application_trade_opportunities as ato
join public.trade_categories as tc on tc.id = ato.trade_category_id
where lu.application_trade_opportunity_id = ato.id
  and lu.vertical_key is null;

update public.lead_unlocks as lu
set vertical_key = tc.slug
from public.market_signal_trade_matches as mstm
join public.trade_categories as tc on tc.id = mstm.trade_category_id
where lu.market_signal_trade_match_id = mstm.id
  and lu.vertical_key is null;

comment on column public.lead_unlocks.vertical_key is
  'Normalised supplier category key used for the account-level three-unlock limit.';
