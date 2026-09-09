create or replace function public.queue_public_market_signal_fetch(p_url text)
returns bigint
language plpgsql
security definer
set search_path = public, net
as $$
declare
  v_host text;
  v_id bigint;
begin
  v_host := lower(substring(p_url from '^https://([^/]+)'));
  if v_host is null or v_host not in (
    'www.find-tender.service.gov.uk',
    'www.contractsfinder.service.gov.uk',
    'api.sell2wales.gov.wales',
    'api.publiccontractsscotland.gov.uk'
  ) then
    raise exception 'market_signal_fetch_host_not_allowed';
  end if;

  select net.http_get(
    url := p_url,
    headers := jsonb_build_object('Accept','application/json')
  ) into v_id;
  return v_id;
end;
$$;

create or replace function public.read_public_market_signal_fetch(p_request_id bigint)
returns table (
  status_code integer,
  content text,
  timed_out boolean,
  error_msg text
)
language sql
security definer
set search_path = public, net
as $$
  select r.status_code, r.content, r.timed_out, r.error_msg
  from net._http_response r
  where r.id = p_request_id;
$$;

revoke all on function public.queue_public_market_signal_fetch(text) from public, anon, authenticated;
revoke all on function public.read_public_market_signal_fetch(bigint) from public, anon, authenticated;
grant execute on function public.queue_public_market_signal_fetch(text) to service_role;
grant execute on function public.read_public_market_signal_fetch(bigint) to service_role;
