-- Baseline county and county-equivalent mappings for the seeded postcode catalog.
-- These areas remain inactive until the complete national ONSPD-derived mapping
-- is loaded and reviewed. Cross-county districts are deliberately excluded.
insert into public.coverage_areas (slug, name, area_type, discount_percent, is_active)
values
  ('norfolk', 'Norfolk', 'county', 20, false),
  ('suffolk', 'Suffolk', 'county', 20, false),
  ('cambridgeshire', 'Cambridgeshire', 'county', 20, false),
  ('essex', 'Essex', 'county', 20, false),
  ('greater-london', 'Greater London', 'county', 20, false),
  ('west-midlands', 'West Midlands', 'county', 20, false),
  ('greater-manchester', 'Greater Manchester', 'county', 20, false),
  ('merseyside', 'Merseyside', 'county', 20, false),
  ('lancashire', 'Lancashire', 'county', 20, false),
  ('west-yorkshire', 'West Yorkshire', 'county', 20, false),
  ('south-yorkshire', 'South Yorkshire', 'county', 20, false),
  ('east-riding-of-yorkshire', 'East Riding of Yorkshire', 'county', 20, false),
  ('tyne-and-wear', 'Tyne and Wear', 'county', 20, false),
  ('bristol', 'Bristol', 'county', 20, false),
  ('devon', 'Devon', 'county', 20, false),
  ('bath-and-north-east-somerset', 'Bath and North East Somerset', 'county', 20, false),
  ('oxfordshire', 'Oxfordshire', 'county', 20, false),
  ('berkshire', 'Berkshire', 'county', 20, false),
  ('surrey', 'Surrey', 'county', 20, false),
  ('east-sussex', 'East Sussex', 'county', 20, false),
  ('kent', 'Kent', 'county', 20, false),
  ('hampshire', 'Hampshire', 'county', 20, false),
  ('leicestershire', 'Leicestershire', 'county', 20, false),
  ('nottinghamshire', 'Nottinghamshire', 'county', 20, false),
  ('derbyshire', 'Derbyshire', 'county', 20, false),
  ('northamptonshire', 'Northamptonshire', 'county', 20, false),
  ('city-of-edinburgh', 'City of Edinburgh', 'county', 20, false),
  ('glasgow-city', 'Glasgow City', 'county', 20, false),
  ('cardiff', 'Cardiff', 'county', 20, false),
  ('swansea', 'Swansea', 'county', 20, false)
on conflict (slug) do update
set name = excluded.name,
    area_type = excluded.area_type,
    discount_percent = excluded.discount_percent,
    updated_at = now();

with mapping(area_slug, postcode_district) as (
  values
    ('norfolk', 'NR1'), ('norfolk', 'NR2'), ('norfolk', 'NR3'), ('norfolk', 'NR4'),
    ('norfolk', 'NR14'), ('norfolk', 'NR15'), ('norfolk', 'NR16'),
    ('suffolk', 'IP1'), ('suffolk', 'IP2'), ('suffolk', 'IP4'), ('suffolk', 'IP32'),
    ('cambridgeshire', 'CB1'), ('cambridgeshire', 'CB4'),
    ('essex', 'CO1'),
    ('greater-london', 'E1'), ('greater-london', 'N1'), ('greater-london', 'N2'),
    ('greater-london', 'SW11'), ('greater-london', 'SE15'), ('greater-london', 'W4'),
    ('greater-london', 'EN5'), ('greater-london', 'RM1'), ('greater-london', 'BR1'),
    ('west-midlands', 'B1'), ('west-midlands', 'B29'), ('west-midlands', 'CV1'), ('west-midlands', 'WS1'),
    ('greater-manchester', 'M1'), ('greater-manchester', 'M20'),
    ('merseyside', 'L1'),
    ('lancashire', 'PR1'),
    ('west-yorkshire', 'LS1'), ('west-yorkshire', 'LS10'),
    ('south-yorkshire', 'S1'),
    ('east-riding-of-yorkshire', 'HU1'),
    ('tyne-and-wear', 'NE1'),
    ('bristol', 'BS1'),
    ('devon', 'EX1'), ('devon', 'PL1'),
    ('bath-and-north-east-somerset', 'BA1'),
    ('oxfordshire', 'OX1'),
    ('berkshire', 'RG1'),
    ('surrey', 'GU1'),
    ('east-sussex', 'BN1'),
    ('kent', 'ME1'), ('kent', 'CT1'),
    ('hampshire', 'SO14'), ('hampshire', 'PO1'),
    ('leicestershire', 'LE1'),
    ('nottinghamshire', 'NG1'),
    ('derbyshire', 'DE1'),
    ('northamptonshire', 'NN1'),
    ('city-of-edinburgh', 'EH1'),
    ('glasgow-city', 'G1'),
    ('cardiff', 'CF10'),
    ('swansea', 'SA1')
)
insert into public.coverage_area_postcodes (coverage_area_id, postcode_district)
select ca.id, mapping.postcode_district
from mapping
join public.coverage_areas ca on ca.slug = mapping.area_slug
join public.postcode_districts pd on pd.id = mapping.postcode_district
on conflict do nothing;
