-- Safe, authenticated territory preview of provider-backed planning activity.
-- This deliberately omits addresses, applicant details, planning references and
-- provider ids. It lets a demo user verify the Plota feed and AI queue without
-- bypassing the paid lead-match gate used by the full opportunity view.

create or replace function public.browse_territory_activity(
  p_postcode_district text,
  p_trade_category_id uuid,
  p_limit int default 12
)
returns table (
  id uuid,
  provider text,
  authority_name text,
  application_type text,
  proposal_description text,
  planning_status public.planning_application_status,
  status_raw text,
  received_date date,
  classification_status text,
  project_type text,
  classification_summary text,
  ai_confidence numeric,
  matched_to_trade boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    pa.id,
    pa.provider,
    pa.local_planning_authority,
    pa.application_type,
    pa.proposal_description,
    pa.status,
    pa.status_raw,
    pa.received_date,
    coalesce(ac.classification_status::text, 'pending'),
    ac.project_type,
    ac.summary,
    ac.ai_confidence,
    exists (
      select 1
      from public.application_trade_opportunities ato
      where ato.planning_application_id = pa.id
        and ato.trade_category_id = p_trade_category_id
        and ato.is_active
    )
  from public.planning_applications pa
  left join public.application_classifications ac
    on ac.planning_application_id = pa.id
  where pa.postcode_district = upper(trim(p_postcode_district))
  order by pa.received_date desc nulls last, pa.last_seen_at desc
  limit least(greatest(coalesce(p_limit, 12), 1), 25)
$$;

revoke all on function public.browse_territory_activity(text, uuid, int) from public;
grant execute on function public.browse_territory_activity(text, uuid, int) to authenticated;

-- N2 is a valid London postcode district used by the territory explorer.
-- Keep this additive so already-applied seed migrations remain safe.
insert into public.postcode_districts (id, postcode_area, town, region, country, center)
values ('N2', 'N', 'London', 'London', 'England', null)
on conflict (id) do nothing;
