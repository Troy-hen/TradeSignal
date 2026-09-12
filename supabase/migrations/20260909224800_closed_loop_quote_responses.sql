create table if not exists public.outreach_response_links (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  opportunity_id uuid not null references public.application_trade_opportunities(id) on delete cascade,
  outreach_delivery_id uuid references public.outreach_deliveries(id) on delete set null,
  channel text not null check (channel in ('letter','email')),
  audience_type text not null check (audience_type in ('homeowner','professional','business','unknown')),
  token_hash text not null unique,
  status text not null default 'active' check (status in ('active','responded','opted_out','expired','revoked')),
  first_opened_at timestamptz,
  last_opened_at timestamptz,
  open_count integer not null default 0,
  expires_at timestamptz not null default (now() + interval '180 days'),
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists outreach_response_links_delivery_active_idx on public.outreach_response_links(outreach_delivery_id) where outreach_delivery_id is not null and status = 'active';
create index if not exists outreach_response_links_company_opportunity_idx on public.outreach_response_links(company_id, opportunity_id, created_at desc);

create table if not exists public.outreach_response_events (
  id uuid primary key default gen_random_uuid(),
  response_link_id uuid not null references public.outreach_response_links(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  opportunity_id uuid not null references public.application_trade_opportunities(id) on delete cascade,
  event_type text not null check (event_type in ('page_viewed','call_clicked','quote_started','quote_requested','not_interested')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists outreach_response_events_link_idx on public.outreach_response_events(response_link_id, created_at desc);
create index if not exists outreach_response_events_opportunity_idx on public.outreach_response_events(company_id, opportunity_id, created_at desc);

create table if not exists public.quote_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  opportunity_id uuid not null references public.application_trade_opportunities(id) on delete cascade,
  lead_match_id uuid references public.lead_matches(id) on delete set null,
  response_link_id uuid not null references public.outreach_response_links(id) on delete cascade,
  audience_type text not null check (audience_type in ('homeowner','professional','business','unknown')),
  name text not null,
  email text,
  phone text,
  preferred_contact_method text not null check (preferred_contact_method in ('phone','email','either')),
  message text,
  status text not null default 'new' check (status in ('new','contacted','quote_scheduled','quoted','won','lost','closed')),
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (email is not null or phone is not null)
);
create index if not exists quote_requests_company_idx on public.quote_requests(company_id, submitted_at desc);
create index if not exists quote_requests_opportunity_idx on public.quote_requests(company_id, opportunity_id, submitted_at desc);

create table if not exists public.contact_permissions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  opportunity_id uuid not null references public.application_trade_opportunities(id) on delete cascade,
  quote_request_id uuid not null references public.quote_requests(id) on delete cascade,
  response_link_id uuid not null references public.outreach_response_links(id) on delete cascade,
  permission_type text not null default 'project_contact' check (permission_type in ('project_contact','marketing')),
  channels text[] not null default '{}'::text[],
  permission_text_version text not null,
  permission_text text not null,
  source text not null default 'quote_link',
  granted_at timestamptz not null default now(),
  withdrawn_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists contact_permissions_quote_idx on public.contact_permissions(quote_request_id);

create table if not exists public.contact_suppressions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  opportunity_id uuid references public.application_trade_opportunities(id) on delete cascade,
  response_link_id uuid references public.outreach_response_links(id) on delete set null,
  scope text not null default 'company_opportunity' check (scope in ('company_opportunity','company_address','platform_address')),
  reason text not null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);
create index if not exists contact_suppressions_company_opportunity_idx on public.contact_suppressions(company_id, opportunity_id, created_at desc);

alter table public.outreach_response_links enable row level security;
alter table public.outreach_response_events enable row level security;
alter table public.quote_requests enable row level security;
alter table public.contact_permissions enable row level security;
alter table public.contact_suppressions enable row level security;

create policy "members can read own quote response links" on public.outreach_response_links for select to authenticated using (public.is_company_member(company_id));
create policy "members can read own response events" on public.outreach_response_events for select to authenticated using (public.is_company_member(company_id));
create policy "members can read own quote requests" on public.quote_requests for select to authenticated using (public.is_company_member(company_id));
create policy "members can read own contact permissions" on public.contact_permissions for select to authenticated using (public.is_company_member(company_id));
create policy "members can read own suppressions" on public.contact_suppressions for select to authenticated using (public.is_company_member(company_id));

revoke insert, update, delete on public.outreach_response_links from authenticated;
revoke insert, update, delete on public.outreach_response_events from authenticated;
revoke insert, update, delete on public.quote_requests from authenticated;
revoke insert, update, delete on public.contact_permissions from authenticated;
revoke insert, update, delete on public.contact_suppressions from authenticated;

grant select on public.outreach_response_links to authenticated;
grant select on public.outreach_response_events to authenticated;
grant select on public.quote_requests to authenticated;
grant select on public.contact_permissions to authenticated;
grant select on public.contact_suppressions to authenticated;
