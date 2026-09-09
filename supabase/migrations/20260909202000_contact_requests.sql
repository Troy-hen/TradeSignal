create table if not exists public.contact_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  company_name text,
  request_type text not null check (request_type in ('territory', 'account', 'billing', 'data', 'partnership', 'other')),
  postcode_district text,
  message text not null,
  status text not null default 'new' check (status in ('new', 'in_progress', 'resolved', 'spam')),
  created_at timestamptz not null default now(),
  constraint contact_requests_name_length check (char_length(trim(name)) between 2 and 120),
  constraint contact_requests_email_length check (char_length(trim(email)) between 3 and 320),
  constraint contact_requests_message_length check (char_length(trim(message)) between 10 and 4000)
);

create index if not exists contact_requests_created_at_idx
  on public.contact_requests (created_at desc);

alter table public.contact_requests enable row level security;

drop policy if exists "contact_requests_insert_public" on public.contact_requests;
create policy "contact_requests_insert_public"
  on public.contact_requests
  for insert
  to anon, authenticated
  with check (
    char_length(trim(name)) between 2 and 120
    and char_length(trim(email)) between 3 and 320
    and position('@' in email) > 1
    and char_length(trim(message)) between 10 and 4000
  );

revoke all on table public.contact_requests from public;
grant insert on table public.contact_requests to anon, authenticated;
