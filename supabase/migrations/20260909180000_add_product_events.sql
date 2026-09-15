-- First-party product funnel events for measuring discovery, teaser and conversion journeys.
-- The client never supplies arbitrary company ownership: RLS requires the
-- authenticated user to be an active member of the referenced company.

create table if not exists public.product_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  user_id uuid,
  event_name text not null,
  route text,
  source text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists product_events_company_created_idx
  on public.product_events(company_id, created_at desc);

create index if not exists product_events_name_created_idx
  on public.product_events(event_name, created_at desc);

alter table public.product_events enable row level security;

create policy "company members can insert product events"
on public.product_events
for insert
to authenticated
with check (
  company_id is not null
  and public.is_company_member(company_id)
  and (user_id is null or user_id = (select auth.uid()))
);

create policy "platform admins can read product events"
on public.product_events
for select
to authenticated
using (public.is_platform_admin());

revoke update, delete on public.product_events from authenticated;
