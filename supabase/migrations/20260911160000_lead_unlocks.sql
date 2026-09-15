-- Individual opportunity unlocks are deliberately separate from geographic
-- coverage. Coverage controls which relevant teasers enter a customer's feed;
-- this table records the optional £20 purchase that reveals a complete lead.

create table if not exists public.lead_unlocks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  application_trade_opportunity_id uuid references public.application_trade_opportunities(id) on delete cascade,
  market_signal_trade_match_id uuid,
  lead_match_id uuid references public.lead_matches(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  amount_pence integer not null default 2000 check (amount_pence = 2000),
  currency text not null default 'gbp' check (currency = 'gbp'),
  status text not null default 'pending' check (status in ('pending', 'paid', 'expired', 'refunded', 'failed')),
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  unlocked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lead_unlocks_one_target check (
    (application_trade_opportunity_id is not null and market_signal_trade_match_id is null)
    or (application_trade_opportunity_id is null and market_signal_trade_match_id is not null)
  )
);

create unique index if not exists lead_unlocks_company_opportunity_idx
  on public.lead_unlocks(company_id, application_trade_opportunity_id)
  where application_trade_opportunity_id is not null;

create unique index if not exists lead_unlocks_company_market_signal_idx
  on public.lead_unlocks(company_id, market_signal_trade_match_id)
  where market_signal_trade_match_id is not null;

create index if not exists lead_unlocks_company_status_idx
  on public.lead_unlocks(company_id, status, created_at desc);

alter table public.lead_unlocks enable row level security;

drop policy if exists lead_unlocks_select_member on public.lead_unlocks;
create policy lead_unlocks_select_member on public.lead_unlocks
  for select using (public.is_company_member(company_id));

drop trigger if exists lead_unlocks_updated_at on public.lead_unlocks;
create trigger lead_unlocks_updated_at
  before update on public.lead_unlocks
  for each row execute function public.set_updated_at();

comment on table public.lead_unlocks is 'One-time £20 customer unlocks; geographic coverage and lead purchase remain separate commercial concepts.';
