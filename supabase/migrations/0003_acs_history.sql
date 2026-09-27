-- ACS 5-year history, end years 2014-2024, for every unit of every level (scripts/09_build_acs_history.py).
-- The app bundles 14 variables for the city subset and every municipality; this table serves the rest online.
create table if not exists public.acs_history (
  level text not null check (level in ('tract', 'zcta', 'muni', 'county', 'city')),
  geoid text not null,
  year  smallint not null,
  var   text not null references public.acs_variables (id),
  est   double precision,
  moe   double precision,
  cv    double precision,
  primary key (level, geoid, year, var)
);
create index if not exists acs_history_level_var_year on public.acs_history (level, var, year);
alter table public.acs_history enable row level security;
drop policy if exists "public read acs_history" on public.acs_history;
create policy "public read acs_history" on public.acs_history for select to anon, authenticated using (true);
