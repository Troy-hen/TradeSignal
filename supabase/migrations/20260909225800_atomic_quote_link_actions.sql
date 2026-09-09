create or replace function public.submit_quote_link_response(
  p_token_hash text,
  p_name text,
  p_email text,
  p_phone text,
  p_preferred_contact_method text,
  p_message text,
  p_permission_text_version text,
  p_permission_text text
)
returns table (
  quote_request_id uuid,
  company_id uuid,
  opportunity_id uuid,
  lead_match_id uuid,
  audience_type text,
  already_submitted boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link public.outreach_response_links%rowtype;
  v_quote public.quote_requests%rowtype;
  v_lead_match_id uuid;
  v_channels text[] := '{}'::text[];
begin
  select * into v_link from public.outreach_response_links where token_hash = p_token_hash for update;
  if v_link.id is null or v_link.status in ('revoked','expired') or v_link.expires_at <= now() then raise exception 'invalid_or_expired_link'; end if;
  if v_link.status = 'opted_out' then raise exception 'link_opted_out'; end if;

  select * into v_quote from public.quote_requests where response_link_id = v_link.id limit 1;
  if v_quote.id is not null then
    return query select v_quote.id, v_quote.company_id, v_quote.opportunity_id, v_quote.lead_match_id, v_quote.audience_type, true;
    return;
  end if;

  if nullif(btrim(p_name), '') is null then raise exception 'name_required'; end if;
  if nullif(btrim(p_email), '') is null and nullif(btrim(p_phone), '') is null then raise exception 'contact_required'; end if;
  if p_preferred_contact_method not in ('phone','email','either') then raise exception 'invalid_contact_method'; end if;
  if p_preferred_contact_method = 'phone' and nullif(btrim(p_phone), '') is null then raise exception 'phone_required'; end if;
  if p_preferred_contact_method = 'email' and nullif(btrim(p_email), '') is null then raise exception 'email_required'; end if;

  select lm.id into v_lead_match_id from public.lead_matches lm
  where lm.company_id = v_link.company_id and lm.application_trade_opportunity_id = v_link.opportunity_id
  order by lm.created_at desc limit 1;

  insert into public.quote_requests (
    company_id, opportunity_id, lead_match_id, response_link_id, audience_type,
    name, email, phone, preferred_contact_method, message
  ) values (
    v_link.company_id, v_link.opportunity_id, v_lead_match_id, v_link.id, v_link.audience_type,
    btrim(p_name), nullif(btrim(p_email), ''), nullif(btrim(p_phone), ''), p_preferred_contact_method, nullif(btrim(p_message), '')
  ) returning * into v_quote;

  if p_preferred_contact_method in ('email','either') and v_quote.email is not null then v_channels := array_append(v_channels, 'email'); end if;
  if p_preferred_contact_method in ('phone','either') and v_quote.phone is not null then v_channels := array_append(v_channels, 'phone'); end if;

  insert into public.contact_permissions (
    company_id, opportunity_id, quote_request_id, response_link_id,
    permission_type, channels, permission_text_version, permission_text, source
  ) values (
    v_link.company_id, v_link.opportunity_id, v_quote.id, v_link.id,
    'project_contact', v_channels, p_permission_text_version, p_permission_text, 'quote_link'
  );

  insert into public.outreach_response_events (response_link_id, company_id, opportunity_id, event_type, metadata)
  values (v_link.id, v_link.company_id, v_link.opportunity_id, 'quote_requested', jsonb_build_object('preferred_contact_method', p_preferred_contact_method));

  update public.outreach_response_links set status = 'responded', updated_at = now() where id = v_link.id;
  return query select v_quote.id, v_quote.company_id, v_quote.opportunity_id, v_quote.lead_match_id, v_quote.audience_type, false;
end;
$$;

create or replace function public.opt_out_quote_link(p_token_hash text, p_reason text default 'not_interested')
returns table (company_id uuid, opportunity_id uuid, response_link_id uuid, already_opted_out boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link public.outreach_response_links%rowtype;
begin
  select * into v_link from public.outreach_response_links where token_hash = p_token_hash for update;
  if v_link.id is null or v_link.status in ('revoked','expired') or v_link.expires_at <= now() then raise exception 'invalid_or_expired_link'; end if;
  if v_link.status = 'responded' then raise exception 'already_responded'; end if;
  if v_link.status = 'opted_out' then
    return query select v_link.company_id, v_link.opportunity_id, v_link.id, true;
    return;
  end if;

  insert into public.contact_suppressions (company_id, opportunity_id, response_link_id, scope, reason)
  values (v_link.company_id, v_link.opportunity_id, v_link.id, 'company_opportunity', coalesce(nullif(btrim(p_reason), ''), 'not_interested'));
  insert into public.outreach_response_events (response_link_id, company_id, opportunity_id, event_type, metadata)
  values (v_link.id, v_link.company_id, v_link.opportunity_id, 'not_interested', '{}'::jsonb);
  update public.outreach_response_links set status = 'opted_out', updated_at = now() where id = v_link.id;
  return query select v_link.company_id, v_link.opportunity_id, v_link.id, false;
end;
$$;

revoke all on function public.submit_quote_link_response(text,text,text,text,text,text,text,text) from public, anon, authenticated;
revoke all on function public.opt_out_quote_link(text,text) from public, anon, authenticated;
grant execute on function public.submit_quote_link_response(text,text,text,text,text,text,text,text) to service_role;
grant execute on function public.opt_out_quote_link(text,text) to service_role;
