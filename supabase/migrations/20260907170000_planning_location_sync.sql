-- planning_applications.location (geography) has no automatic source: the
-- ingestion pipeline writes plain latitude/longitude columns (trivial from
-- JS), so this trigger derives the geography point from them, keeping the
-- existing GIST index actually useful without requiring ingestion code to
-- construct PostGIS literals itself.

create or replace function public.sync_planning_application_location()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.latitude is not null and new.longitude is not null then
    new.location = st_setsrid(st_makepoint(new.longitude, new.latitude), 4326)::geography;
  else
    new.location = null;
  end if;
  return new;
end;
$$;

create trigger trg_sync_planning_application_location
  before insert or update of latitude, longitude on public.planning_applications
  for each row
  execute function public.sync_planning_application_location();
