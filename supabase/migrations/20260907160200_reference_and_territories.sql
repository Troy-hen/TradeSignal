-- Reference data (trade_categories, postcode_districts) and the territory
-- inventory/claim model. trade_categories is deliberately just a table so new
-- trades can be added later without a code change.

create table public.trade_categories (
  id                            uuid primary key default gen_random_uuid(),
  slug                          text not null unique,
  name                          text not null,
  description                  text,
  icon                          text,
  default_monthly_price_pence  integer not null check (default_monthly_price_pence > 0),
  ai_detection_hints            jsonb,
  display_order                 integer not null default 0,
  is_active                     boolean not null default true,
  created_at                    timestamptz not null default now(),
  updated_at                    timestamptz not null default now()
);

create table public.company_trade_profiles (
  id                     uuid primary key default gen_random_uuid(),
  company_id             uuid not null references public.companies(id) on delete cascade,
  trade_category_id      uuid not null references public.trade_categories(id),
  years_experience       integer,
  certifications         text[],
  service_radius_miles   integer,
  is_primary_trade       boolean not null default false,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  unique (company_id, trade_category_id)
);

-- Seeded once upfront from a public ONS/postcode dataset. Deliberate natural-key
-- exception to the UUID-PK convention used everywhere else (see README).
create table public.postcode_districts (
  id                  text primary key,
  postcode_area       text not null,
  post_town           text,
  region              text,
  country             text,
  centroid            geography(Point, 4326),
  household_estimate  integer,
  created_at          timestamptz not null default now()
);
create index postcode_districts_centroid_idx on public.postcode_districts using gist (centroid);

-- The sellable inventory unit: postcode district x trade. Rows are created
-- lazily on first claim attempt (see reserve_territory), not pre-generated for
-- every district x trade combination.
create table public.territories (
  id                    uuid primary key default gen_random_uuid(),
  postcode_district     text not null references public.postcode_districts(id),
  trade_category_id     uuid not null references public.trade_categories(id),
  monthly_price_pence   integer not null check (monthly_price_pence > 0),
  currency              text not null default 'GBP',
  is_active             boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (postcode_district, trade_category_id)
);
create index territories_district_trade_idx on public.territories (postcode_district, trade_category_id);
create index territories_trade_category_idx on public.territories (trade_category_id);

create type public.territory_claim_status as enum ('reserved', 'active', 'suspended', 'expired', 'cancelled');

create table public.territory_claims (
  id                          uuid primary key default gen_random_uuid(),
  territory_id                uuid not null references public.territories(id),
  company_id                  uuid not null references public.companies(id),
  status                      public.territory_claim_status not null default 'reserved',
  reserved_at                 timestamptz not null default now(),
  reserved_expires_at         timestamptz,
  activated_at                timestamptz,
  suspended_at                timestamptz,
  cancelled_at                timestamptz,
  cancellation_reason         text,
  stripe_checkout_session_id  text,
  stripe_subscription_id      text,
  created_by                  uuid references public.profiles(id),
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

-- THE database-level exclusivity guarantee: at most one reserved/active/suspended
-- claim per territory at a time. Postgres enforces this at INSERT time itself, so
-- two concurrent checkouts racing for the same territory cannot both succeed —
-- the second always fails with 23505 unique_violation, regardless of timing.
create unique index territory_claims_locking_idx
  on public.territory_claims (territory_id)
  where status in ('reserved', 'active', 'suspended');

create index territory_claims_company_id_idx on public.territory_claims (company_id);
create index territory_claims_reserved_idx on public.territory_claims (status) where status = 'reserved';
create index territory_claims_stripe_sub_idx on public.territory_claims (stripe_subscription_id) where stripe_subscription_id is not null;

-- Backs the "Notify Me If Available" CTA on a sold territory card.
create table public.territory_waitlist (
  id                 uuid primary key default gen_random_uuid(),
  postcode_district  text not null,
  trade_category_id  uuid not null references public.trade_categories(id),
  company_id         uuid not null references public.companies(id),
  notified_at        timestamptz,
  created_at         timestamptz not null default now(),
  unique (postcode_district, trade_category_id, company_id)
);
