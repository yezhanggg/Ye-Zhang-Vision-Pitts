-- VisionPitts 0001: multi-level ACS browser data (public read) and saved scenarios (anonymous auth, owner-scoped).
-- Writes to acs_* / geo_* / dataset_versions happen only through scripts/08_publish_supabase.py with the secret key.

create table if not exists public.acs_variables (
  id          text primary key,
  label       text not null,
  "group"     text not null,
  unit        text not null check (unit in ('count', 'usd', 'share', 'years', 'age')),
  description text not null default '',
  table_id    text not null,
  sort        integer not null default 0
);
comment on table public.acs_variables is 'Catalogue of ACS 5-year variables shown in the Explore data browser.';

create table if not exists public.geo_units (
  level     text not null check (level in ('tract', 'bg', 'zcta', 'county', 'city')),
  geoid     text not null,
  name      text not null,
  pgh_share double precision,
  tract     text,
  geom      jsonb not null,
  primary key (level, geoid)
);
comment on table public.geo_units is 'Simplified WGS84 GeoJSON geometry per unit (county-wide where available).';

create table if not exists public.acs_values (
  level text not null check (level in ('tract', 'bg', 'zcta', 'county', 'city')),
  geoid text not null,
  var   text not null references public.acs_variables (id) on delete cascade,
  est   double precision,
  moe   double precision,
  cv    double precision,
  primary key (level, geoid, var)
);
create index if not exists acs_values_level_var_idx on public.acs_values (level, var);
comment on table public.acs_values is 'Long format: one row per (level, geoid, variable); est and 90% MOE as published, cv = moe/1.645/est.';

create table if not exists public.dataset_versions (
  id           bigint generated always as identity primary key,
  built_at     timestamptz not null,
  acs_year     integer not null,
  git_sha      text,
  counts       jsonb not null default '{}'::jsonb,
  published_at timestamptz not null default now()
);

alter table public.acs_variables    enable row level security;
alter table public.geo_units        enable row level security;
alter table public.acs_values       enable row level security;
alter table public.dataset_versions enable row level security;

create policy "public read acs_variables"    on public.acs_variables    for select to anon, authenticated using (true);
create policy "public read geo_units"        on public.geo_units        for select to anon, authenticated using (true);
create policy "public read acs_values"       on public.acs_values       for select to anon, authenticated using (true);
create policy "public read dataset_versions" on public.dataset_versions for select to anon, authenticated using (true);
-- No insert/update/delete policies: only the secret (service) key can write.

-- Saved scenarios: not wired in the UI yet. Requires Anonymous sign-ins enabled in Auth.
create table if not exists public.scenarios (
  id              uuid primary key default gen_random_uuid(),
  slug            text unique default substr(replace(gen_random_uuid()::text, '-', ''), 1, 10),
  owner           uuid not null default auth.uid(),
  name            text not null,
  author          text,
  note            text,
  scoring_version text not null,
  weights         jsonb not null,
  fit_matrix      jsonb,
  toggles         jsonb,
  summary         jsonb,
  is_public       boolean not null default false,
  created_at      timestamptz not null default now()
);
create index if not exists scenarios_owner_idx  on public.scenarios (owner);
create index if not exists scenarios_public_idx on public.scenarios (is_public, created_at desc);

alter table public.scenarios enable row level security;
create policy "read public or own scenarios" on public.scenarios for select to anon, authenticated
  using (is_public or owner = auth.uid());
create policy "insert own scenarios" on public.scenarios for insert to authenticated
  with check (owner = auth.uid());
create policy "update own scenarios" on public.scenarios for update to authenticated
  using (owner = auth.uid()) with check (owner = auth.uid());
create policy "delete own scenarios" on public.scenarios for delete to authenticated
  using (owner = auth.uid());

alter publication supabase_realtime add table public.scenarios;
