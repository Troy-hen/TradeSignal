-- Keep postcode-district reference data aligned with the real planning feed.
-- These rows are derived from imported planning applications only; no mock
-- opportunities or synthetic districts are created.
with source as (
  select
    upper(trim(pa.postcode_district)) as id,
    regexp_replace(upper(trim(pa.postcode_district)), '[0-9].*$', '') as postcode_area,
    avg(pa.latitude) filter (where pa.latitude is not null) as latitude,
    avg(pa.longitude) filter (where pa.longitude is not null) as longitude
  from public.planning_applications pa
  where nullif(trim(pa.postcode_district), '') is not null
  group by upper(trim(pa.postcode_district))
)
insert into public.postcode_districts (
  id, postcode_area, country, centroid
)
select
  source.id,
  source.postcode_area,
  'UK',
  case
    when source.latitude is not null and source.longitude is not null
      then st_setsrid(st_makepoint(source.longitude, source.latitude), 4326)::geography
    else null
  end
from source
where source.id ~ '^[A-Z]{1,2}[0-9]'
on conflict (id) do update set
  centroid = coalesce(public.postcode_districts.centroid, excluded.centroid),
  country = coalesce(public.postcode_districts.country, excluded.country);

create index if not exists planning_applications_postcode_district_idx
  on public.planning_applications (postcode_district);

create index if not exists application_trade_opportunities_active_district_trade_idx
  on public.application_trade_opportunities (postcode_district, trade_category_id)
  where is_active;
