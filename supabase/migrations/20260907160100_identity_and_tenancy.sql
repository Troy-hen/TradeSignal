-- Identity & tenancy: profiles (1:1 shadow of auth.users), companies (the tenant),
-- company_memberships (company-scoped roles — a user may belong to more than one
-- company, so this is deliberately NOT a single global role on profiles), and
-- admin_users (platform-admin grants, kept as a table rather than a JWT claim so
-- revocation is instant and the grant itself is auditable).

create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  phone       text,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.companies (
  id                      uuid primary key default gen_random_uuid(),
  trading_name            text not null,
  legal_name              text,
  companies_house_number  text,
  website                 text,
  phone                   text,
  billing_email           text not null,
  address_line1           text,
  address_line2           text,
  city                    text,
  postcode                text,
  logo_url                text,
  stripe_customer_id      text unique,
  verified                boolean not null default false,
  deleted_at              timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create type public.company_member_role as enum ('owner', 'admin', 'member');
create type public.company_member_status as enum ('invited', 'active', 'removed');

create table public.company_memberships (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid not null references public.companies(id) on delete cascade,
  user_id        uuid references public.profiles(id) on delete cascade,
  invited_email  text,
  role           public.company_member_role not null default 'member',
  status         public.company_member_status not null default 'active',
  invited_at     timestamptz,
  joined_at      timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (company_id, user_id)
);
create index company_memberships_user_id_active_idx on public.company_memberships (user_id) where status = 'active';

create table public.admin_users (
  profile_id  uuid primary key references public.profiles(id),
  granted_by  uuid references public.profiles(id),
  granted_at  timestamptz not null default now(),
  notes       text
);

-- Signup trigger: creates the profile row automatically. Never inserted by the client.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
