-- T2-C — Versioned MIM textbook Open Data cache.
-- The interactive product reads only this filtered index; source CSV acquisition
-- is performed out of band by a narrow token-authorized synchronizer.

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

create or replace function public.mim_textbook_sync_scope(p_token text)
returns table (
  school_code text,
  academic_year_code text,
  grade text,
  section_code text,
  discipline_name text
)
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if encode(digest(coalesce(p_token, ''), 'sha256'), 'hex') <> 'b2002b6b964e4d6225469500360cf56ec7995084946d9a383c5e804491bc73ce' then
    raise exception 'MIM sync authorization failed';
  end if;

  return query
  select distinct
    upper(regexp_replace(btrim(tws.school_code), '[^A-Za-z0-9]', '', 'g')) as school_code,
    (extract(year from ay.starts_on)::integer::text || lpad((extract(year from ay.ends_on)::integer % 100)::text, 2, '0')) as academic_year_code,
    aps.grade,
    upper(btrim(aps.section_code)) as section_code,
    btrim(td.name) as discipline_name
  from public.teacher_workspace_settings tws
  join public.academic_years ay
    on ay.id = tws.academic_year_id
   and ay.workspace_id = tws.workspace_id
  join public.teaching_assignments ta
    on ta.workspace_id = tws.workspace_id
   and ta.academic_year_id = tws.academic_year_id
  join public.annual_plan_sections aps
    on aps.id = ta.section_id
   and aps.workspace_id = ta.workspace_id
   and aps.academic_year_id = ta.academic_year_id
  join public.teaching_disciplines td
    on td.id = ta.discipline_id
   and td.workspace_id = ta.workspace_id
   and td.academic_year_id = ta.academic_year_id
  where tws.school_code is not null
    and btrim(tws.school_code) <> ''
    and td.is_active is true
    and ay.is_active is true
  order by 1, 2, 3, 4, 5;
end;
$$;

create or replace function public.mim_textbook_sync_replace(
  p_token text,
  p_academic_year_code text,
  p_source_manifest jsonb,
  p_school_records jsonb,
  p_adoption_records jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_run_id uuid;
  v_school_count integer;
  v_adoption_count integer;
begin
  if encode(digest(coalesce(p_token, ''), 'sha256'), 'hex') <> 'b2002b6b964e4d6225469500360cf56ec7995084946d9a383c5e804491bc73ce' then
    raise exception 'MIM sync authorization failed';
  end if;

  if p_academic_year_code !~ '^20[0-9]{4}$' then
    raise exception 'Invalid MIM academic year';
  end if;
  if jsonb_typeof(coalesce(p_source_manifest, '{}'::jsonb)) <> 'object' then
    raise exception 'Invalid MIM source manifest';
  end if;
  if jsonb_typeof(coalesce(p_school_records, '[]'::jsonb)) <> 'array'
     or jsonb_typeof(coalesce(p_adoption_records, '[]'::jsonb)) <> 'array' then
    raise exception 'Invalid MIM sync payload';
  end if;

  v_school_count := jsonb_array_length(coalesce(p_school_records, '[]'::jsonb));
  v_adoption_count := jsonb_array_length(coalesce(p_adoption_records, '[]'::jsonb));
  if v_school_count > 10000 or v_adoption_count > 50000 then
    raise exception 'MIM sync payload exceeds bounded cache limits';
  end if;

  insert into public.mim_textbook_sync_runs (
    academic_year_code, status, source_manifest, school_record_count, adoption_record_count
  ) values (
    p_academic_year_code, 'PREPARING', coalesce(p_source_manifest, '{}'::jsonb), v_school_count, v_adoption_count
  ) returning id into v_run_id;

  insert into public.mim_school_scope_cache (
    run_id, academic_year_code, institute_code, school_code, province
  )
  select
    v_run_id,
    p_academic_year_code,
    upper(regexp_replace(btrim(r.institute_code), '[^A-Za-z0-9]', '', 'g')),
    upper(regexp_replace(btrim(r.school_code), '[^A-Za-z0-9]', '', 'g')),
    nullif(btrim(r.province), '')
  from jsonb_to_recordset(coalesce(p_school_records, '[]'::jsonb)) as r(
    institute_code text,
    school_code text,
    province text
  )
  where r.institute_code is not null
    and r.school_code is not null;

  insert into public.mim_textbook_adoption_cache (
    run_id, academic_year_code, source_dataset, school_code, grade_number,
    section_code, school_grade_type, combination, discipline, isbn13,
    authors, title, subtitle, volume, publisher, price,
    new_adoption, to_purchase, recommended, source_subject
  )
  select
    v_run_id,
    p_academic_year_code,
    btrim(r.source_dataset),
    upper(regexp_replace(btrim(r.school_code), '[^A-Za-z0-9]', '', 'g')),
    r.grade_number,
    upper(btrim(r.section_code)),
    nullif(btrim(r.school_grade_type), ''),
    nullif(btrim(r.combination), ''),
    btrim(r.discipline),
    regexp_replace(coalesce(r.isbn13, ''), '[^0-9]', '', 'g'),
    nullif(btrim(r.authors), ''),
    btrim(r.title),
    nullif(btrim(r.subtitle), ''),
    nullif(btrim(r.volume), ''),
    btrim(r.publisher),
    nullif(btrim(r.price), ''),
    nullif(btrim(r.new_adoption), ''),
    nullif(btrim(r.to_purchase), ''),
    nullif(btrim(r.recommended), ''),
    btrim(r.source_subject)
  from jsonb_to_recordset(coalesce(p_adoption_records, '[]'::jsonb)) as r(
    source_dataset text,
    school_code text,
    grade_number smallint,
    section_code text,
    school_grade_type text,
    combination text,
    discipline text,
    isbn13 text,
    authors text,
    title text,
    subtitle text,
    volume text,
    publisher text,
    price text,
    new_adoption text,
    to_purchase text,
    recommended text,
    source_subject text
  )
  where r.school_code is not null
    and r.grade_number is not null
    and r.section_code is not null
    and r.discipline is not null
    and r.isbn13 is not null
    and r.title is not null
    and r.publisher is not null
    and r.source_dataset is not null
    and r.source_subject is not null;

  update public.mim_textbook_sync_runs
     set status = 'RETIRED'
   where academic_year_code = p_academic_year_code
     and status = 'ACTIVE';

  update public.mim_textbook_sync_runs
     set status = 'ACTIVE',
         activated_at = now(),
         school_record_count = (select count(*) from public.mim_school_scope_cache where run_id = v_run_id),
         adoption_record_count = (select count(*) from public.mim_textbook_adoption_cache where run_id = v_run_id)
   where id = v_run_id;

  return v_run_id;
end;
$$;

revoke all on function public.mim_textbook_sync_scope(text) from public;
revoke all on function public.mim_textbook_sync_replace(text, text, jsonb, jsonb, jsonb) from public;
grant execute on function public.mim_textbook_sync_scope(text) to anon, authenticated;
grant execute on function public.mim_textbook_sync_replace(text, text, jsonb, jsonb, jsonb) to anon, authenticated;

comment on table public.mim_textbook_sync_runs is
  'Versioned receipts for filtered MIM Open Data textbook cache generations. One ACTIVE generation per academic year.';
comment on table public.mim_school_scope_cache is
  'Public MIM institute-to-plesso mappings captured for a cache generation; contains no teacher identity.';
comment on table public.mim_textbook_adoption_cache is
  'Filtered public MIM textbook-adoption rows needed by active Docente OS teaching contexts; not teacher-confirmed adoptions.';
