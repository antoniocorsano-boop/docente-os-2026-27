-- T2-C — Versioned MIM textbook Open Data cache.
-- The interactive product reads only this filtered index; source CSV acquisition
-- is performed out of band by a dedicated Edge Function boundary and synchronizer.

create table if not exists public.mim_textbook_sync_runs (
  id uuid primary key default gen_random_uuid(),
  academic_year_code text not null check (academic_year_code ~ '^20[0-9]{4}$'),
  status text not null check (status in ('PREPARING', 'ACTIVE', 'RETIRED', 'FAILED')),
  source_manifest jsonb not null default '{}'::jsonb check (jsonb_typeof(source_manifest) = 'object'),
  school_record_count integer not null default 0 check (school_record_count >= 0),
  adoption_record_count integer not null default 0 check (adoption_record_count >= 0),
  started_at timestamptz not null default now(),
  activated_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists mim_textbook_sync_runs_one_active_year
  on public.mim_textbook_sync_runs (academic_year_code)
  where status = 'ACTIVE';

create index if not exists mim_textbook_sync_runs_year_status_idx
  on public.mim_textbook_sync_runs (academic_year_code, status, activated_at desc);

create table if not exists public.mim_school_scope_cache (
  run_id uuid not null references public.mim_textbook_sync_runs(id) on delete cascade,
  academic_year_code text not null check (academic_year_code ~ '^20[0-9]{4}$'),
  institute_code text not null check (institute_code ~ '^[A-Z0-9]{6,12}$'),
  school_code text not null check (school_code ~ '^[A-Z0-9]{6,12}$'),
  province text,
  primary key (run_id, institute_code, school_code)
);

create index if not exists mim_school_scope_cache_lookup_idx
  on public.mim_school_scope_cache (run_id, institute_code, school_code);

create table if not exists public.mim_textbook_adoption_cache (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.mim_textbook_sync_runs(id) on delete cascade,
  academic_year_code text not null check (academic_year_code ~ '^20[0-9]{4}$'),
  source_dataset text not null check (char_length(source_dataset) between 1 and 80),
  school_code text not null check (school_code ~ '^[A-Z0-9]{6,12}$'),
  grade_number smallint not null check (grade_number between 1 and 8),
  section_code text not null check (char_length(section_code) between 1 and 12),
  school_grade_type text,
  combination text,
  discipline text not null check (char_length(btrim(discipline)) between 1 and 240),
  isbn13 text not null check (isbn13 ~ '^[0-9]{13}$'),
  authors text,
  title text not null check (char_length(btrim(title)) between 1 and 600),
  subtitle text,
  volume text,
  publisher text not null check (char_length(btrim(publisher)) between 1 and 300),
  price text,
  new_adoption text,
  to_purchase text,
  recommended text,
  source_subject text not null check (char_length(source_subject) between 1 and 1000)
);

create unique index if not exists mim_textbook_adoption_cache_identity_idx
  on public.mim_textbook_adoption_cache
    (run_id, school_code, grade_number, section_code, isbn13, discipline, source_subject);

create index if not exists mim_textbook_adoption_cache_lookup_idx
  on public.mim_textbook_adoption_cache
    (run_id, school_code, grade_number, section_code);

alter table public.mim_textbook_sync_runs enable row level security;
alter table public.mim_school_scope_cache enable row level security;
alter table public.mim_textbook_adoption_cache enable row level security;

revoke all on public.mim_textbook_sync_runs from anon, authenticated;
revoke all on public.mim_school_scope_cache from anon, authenticated;
revoke all on public.mim_textbook_adoption_cache from anon, authenticated;

grant select on public.mim_textbook_sync_runs to authenticated;
grant select on public.mim_school_scope_cache to authenticated;
grant select on public.mim_textbook_adoption_cache to authenticated;

create policy mim_textbook_sync_runs_authenticated_read
  on public.mim_textbook_sync_runs
  for select to authenticated
  using (true);

create policy mim_school_scope_cache_authenticated_read
  on public.mim_school_scope_cache
  for select to authenticated
  using (true);

create policy mim_textbook_adoption_cache_authenticated_read
  on public.mim_textbook_adoption_cache
  for select to authenticated
  using (true);

comment on table public.mim_textbook_sync_runs is
  'Versioned receipts for filtered MIM Open Data textbook cache generations. One ACTIVE generation per academic year.';
comment on table public.mim_school_scope_cache is
  'Public MIM institute-to-plesso mappings captured for a cache generation; contains no teacher identity.';
comment on table public.mim_textbook_adoption_cache is
  'Filtered public MIM textbook-adoption rows needed by active Docente OS teaching contexts; not teacher-confirmed adoptions.';
