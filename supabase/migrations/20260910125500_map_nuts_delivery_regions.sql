-- Find a Tender commonly supplies UK NUTS/ITL region codes (for example
-- UKH for East of England) instead of display names. Map the regional prefix
-- before comparing a public-work delivery area with an owned postcode patch.
create or replace function public.normalise_market_signal_region(p_region text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when upper(btrim(coalesce(p_region, ''))) like 'UKC%' then 'north east england'
    when upper(btrim(coalesce(p_region, ''))) like 'UKD%' then 'north west england'
    when upper(btrim(coalesce(p_region, ''))) like 'UKE%' then 'yorkshire and the humber'
    when upper(btrim(coalesce(p_region, ''))) like 'UKF%' then 'east midlands'
    when upper(btrim(coalesce(p_region, ''))) like 'UKG%' then 'west midlands'
    when upper(btrim(coalesce(p_region, ''))) like 'UKH%' then 'east of england'
    when upper(btrim(coalesce(p_region, ''))) like 'UKI%' then 'london'
    when upper(btrim(coalesce(p_region, ''))) like 'UKJ%' then 'south east england'
    when upper(btrim(coalesce(p_region, ''))) like 'UKK%' then 'south west england'
    when upper(btrim(coalesce(p_region, ''))) like 'UKL%' then 'wales'
    when upper(btrim(coalesce(p_region, ''))) like 'UKM%' then 'scotland'
    when upper(btrim(coalesce(p_region, ''))) like 'UKN%' then 'northern ireland'
    when lower(btrim(coalesce(p_region, ''))) = 'north west' then 'north west england'
    when lower(btrim(coalesce(p_region, ''))) = 'north east' then 'north east england'
    when lower(btrim(coalesce(p_region, ''))) = 'south east' then 'south east england'
    when lower(btrim(coalesce(p_region, ''))) = 'south west' then 'south west england'
    else lower(btrim(coalesce(p_region, '')))
  end
$$;
