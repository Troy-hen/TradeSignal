-- Server-side allow-list for non-billing demo accounts.
-- This is intentionally not user-readable or user-writable: checkout may
-- consult it with the service role, but clients cannot promote themselves.

create table if not exists public.demo_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.demo_accounts enable row level security;

revoke all on table public.demo_accounts from public, anon, authenticated;
grant select, insert, delete on table public.demo_accounts to service_role;

comment on table public.demo_accounts is
  'Server-managed allow-list of accounts permitted to activate demo coverage without Stripe.';
