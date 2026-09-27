-- Municipalities (Census county subdivisions, 2023 cartographic file) join the ACS levels. The 129 units other than
-- Pittsburgh are bundled with the app in full; Supabase keeps a copy so every level reads the same way.
alter table public.geo_units drop constraint if exists geo_units_level_check;
alter table public.geo_units add constraint geo_units_level_check
  check (level in ('tract', 'bg', 'zcta', 'muni', 'county', 'city'));
alter table public.acs_values drop constraint if exists acs_values_level_check;
alter table public.acs_values add constraint acs_values_level_check
  check (level in ('tract', 'bg', 'zcta', 'muni', 'county', 'city'));
-- Legal type of a municipality: borough, township, city or municipality (null for other levels).
alter table public.geo_units add column if not exists kind text;
