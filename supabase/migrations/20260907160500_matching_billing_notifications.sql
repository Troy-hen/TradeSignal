-- lead_matches is the tenant fan-out: written only by triggers/service-role,
-- never client INSERT — it's the row that gates access to the shared
-- planning data, so it cannot be client-writable or the gate is meaningless.
create table public.lead_matches (
  id                                 uuid primary key default gen_random_uuid(),
  application_trade_opportunity_id   uuid not null references public.application_trade_opportunities(id) on delete cascade,
  company_id                          uuid not null references public.companies(id),
  territory_claim_id                    uuid not null references public.territory_claims(id),
  matched_at                              timestamptz not null default now(),
  notified_at                              timestamptz,
  notification_channel                       text,
  viewed_at                                    timestamptz,
  created_at                                     timestamptz not null default now(),
  unique (application_trade_opportunity_id, company_id)
);
create index lead_matches_company_idx on public.lead_matches (company_id, matched_at desc);
create index lead_matches_opportunity_idx on public.lead_matches (application_trade_opportunity_id);
create index lead_matches_notify_queue_idx on public.lead_matches (notified_at) where notified_at is null;

-- CRM-lite and the ROI data source. Opportunity state (New/Saved/Contacted/
-- Quoted/Won/Lost) is derived as "latest action_type per lead_match", not a
-- separate mutable status column, so history is preserved automatically.
create type public.lead_action_type as enum ('viewed', 'saved', 'contacted', 'quoted', 'won', 'lost');

create table public.lead_actions (
  id                  uuid primary key default gen_random_uuid(),
  lead_match_id       uuid not null references public.lead_matches(id) on delete cascade,
  company_id          uuid not null references public.companies(id),
  action_type         public.lead_action_type not null,
  contract_value_gbp  numeric,
  note                text,
  created_by          uuid references public.profiles(id),
  created_at          timestamptz not null default now()
);
create index lead_actions_lead_match_idx on public.lead_actions (lead_match_id);
create index lead_actions_company_idx on public.lead_actions (company_id, created_at desc);

-- One Stripe Subscription per territory claim (deliberate MVP simplification —
-- see README). Never client-writable; only the Stripe webhook (service-role)
-- ever touches this table.
create type public.subscription_status as enum
  ('trialing', 'active', 'past_due', 'canceled', 'unpaid', 'incomplete', 'incomplete_expired');

create table public.subscriptions (
  id                     uuid primary key default gen_random_uuid(),
  company_id             uuid not null references public.companies(id),
  territory_claim_id      uuid not null unique references public.territory_claims(id),
  stripe_customer_id       text not null,
  stripe_subscription_id    text not null unique,
  stripe_price_id            text,
  status                       public.subscription_status not null,
  current_period_start           timestamptz,
  current_period_end               timestamptz,
  cancel_at_period_end                boolean not null default false,
  canceled_at                           timestamptz,
  created_at                             timestamptz not null default now(),
  updated_at                              timestamptz not null default now()
);
create index subscriptions_company_idx on public.subscriptions (company_id);

create table public.notification_preferences (
  id                       uuid primary key default gen_random_uuid(),
  company_id               uuid not null references public.companies(id) on delete cascade,
  user_id                   uuid references public.profiles(id) on delete cascade,
  channel_email               boolean not null default true,
  digest_frequency               text not null default 'daily' check (digest_frequency in ('instant', 'daily', 'weekly')),
  instant_alert_min_score           numeric(5,2) not null default 90,
  digest_min_score                    numeric(5,2) not null default 0,
  approval_alerts_enabled               boolean not null default true,
  created_at                              timestamptz not null default now(),
  updated_at                                timestamptz not null default now()
);
create unique index notification_preferences_company_default_idx on public.notification_preferences (company_id) where user_id is null;
create unique index notification_preferences_company_user_idx on public.notification_preferences (company_id, user_id) where user_id is not null;

create table public.notification_log (
  id                   uuid primary key default gen_random_uuid(),
  lead_match_id         uuid references public.lead_matches(id),
  company_id             uuid references public.companies(id),
  user_id                  uuid references public.profiles(id),
  notification_type          text not null,
  provider_message_id           text,
  status                           text not null default 'queued' check (status in ('queued', 'sent', 'failed')),
  subject                            text,
  sent_at                              timestamptz,
  error_message                         text,
  created_at                              timestamptz not null default now()
);
create index notification_log_lead_match_idx on public.notification_log (lead_match_id);
create index notification_log_company_idx on public.notification_log (company_id, created_at desc);
