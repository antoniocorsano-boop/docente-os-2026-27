-- T2-C — Hard boundary for the MIM cache synchronizer.
-- External callers never receive database write authority. The Edge Function
-- authenticates the Render synchronizer and then uses service_role internally.

-- Remove the experimental token-bearing SECURITY DEFINER RPCs that were applied
-- to the beta while the architecture was being evaluated.
drop function if exists public.mim_textbook_sync_scope(text);
drop function if exists public.mim_textbook_sync_replace(text, text, jsonb, jsonb, jsonb);

create table if not exists public.mim_textbook_sync_credentials (
  singleton boolean primary key default true check (singleton is true),
  token_sha256 text not null check (token_sha256 ~ '^[0-9a-f]{64}$'),
  rotated_at timestamptz not null default now()
);

alter table public.mim_textbook_sync_credentials enable row level security;
revoke all on public.mim_textbook_sync_credentials from anon, authenticated;
grant select on public.mim_textbook_sync_credentials to service_role;

-- Internal read model used only by the Edge Function. It deliberately projects
-- no user id, display name or other teacher identity.
create or replace function public.mim_textbook_cache_scope()
returns table (
  institute_code text,
  academic_year_code text,
  grade text,
  section_code text,
  discipline_name text
)
language sql
stable
security invoker
set search_path = public
as $$
  select distinct
    upper(regexp_replace(btrim(tws.school_code), '[^A-Za-z0-9]', '', 'g')) as institute_code,
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
    and ta.status = 'CONFIRMED'
  order by 1, 2, 3, 4, 5;
$$;

revoke all on function public.mim_textbook_cache_scope() from public, anon, authenticated;
grant execute on function public.mim_textbook_cache_scope() to service_role;

-- Activation remains transactional in Postgres, but it has no external
-- credential and is executable only by service_role after Edge authentication.
create or replace function public.mim_textbook_cache_activate(p_run_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_year text;
  v_status text;
  v_school_count integer;
  v_adoption_count integer;
begin
  select academic_year_code, status
    into v_year, v_status
    from public.mim_textbook_sync_runs
   where id = p_run_id
   for update;

  if v_year is null then
    raise exception 'Unknown MIM sync run';
  end if;
  if v_status <> 'PREPARING' then
    raise exception 'MIM sync run is not PREPARING';
  end if;

  select count(*) into v_school_count
    from public.mim_school_scope_cache
   where run_id = p_run_id
     and academic_year_code = v_year;

  if v_school_count = 0 then
    raise exception 'MIM sync run has no verified school scope';
  end if;

  select count(*) into v_adoption_count
    from public.mim_textbook_adoption_cache
   where run_id = p_run_id
     and academic_year_code = v_year;

  update public.mim_textbook_sync_runs
     set status = 'RETIRED'
   where academic_year_code = v_year
     and status = 'ACTIVE'
     and id <> p_run_id;

  update public.mim_textbook_sync_runs
     set status = 'ACTIVE',
         activated_at = now(),
         school_record_count = v_school_count,
         adoption_record_count = v_adoption_count
   where id = p_run_id;
end;
$$;

revoke all on function public.mim_textbook_cache_activate(uuid) from public, anon, authenticated;
grant execute on function public.mim_textbook_cache_activate(uuid) to service_role;

grant select, insert, update, delete on public.mim_textbook_sync_runs to service_role;
grant select, insert, update, delete on public.mim_school_scope_cache to service_role;
grant select, insert, update, delete on public.mim_textbook_adoption_cache to service_role;

comment on table public.mim_textbook_sync_credentials is
  'Stores only the SHA-256 verifier for the dedicated MIM synchronizer credential. The raw credential is never stored here.';
comment on function public.mim_textbook_cache_scope() is
  'Service-role-only projection of active confirmed Cattedra scope for MIM synchronization; emits no teacher identity.';
comment on function public.mim_textbook_cache_activate(uuid) is
  'Service-role-only transactional activation of one fully staged MIM cache generation.';
