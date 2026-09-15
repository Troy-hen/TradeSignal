create table if not exists public.customer_profiles (
  company_id uuid primary key references public.companies(id) on delete cascade,
  what_do_you_sell text not null,
  ideal_customer text,
  exclusions text,
  where_do_you_sell text,
  normalized_profile jsonb not null default '{}'::jsonb,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.customer_profiles enable row level security;

drop policy if exists customer_profiles_select_member on public.customer_profiles;
create policy customer_profiles_select_member on public.customer_profiles
  for select using (public.is_company_member(company_id));

drop policy if exists customer_profiles_write_admin on public.customer_profiles;
create policy customer_profiles_write_admin on public.customer_profiles
  for all using (public.is_company_admin(company_id)) with check (public.is_company_admin(company_id));

drop trigger if exists customer_profiles_updated_at on public.customer_profiles;
create trigger customer_profiles_updated_at
  before update on public.customer_profiles
  for each row execute function public.set_updated_at();
