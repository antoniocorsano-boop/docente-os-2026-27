create table if not exists public.teacher_workspace_settings (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  teacher_display_name text not null default '' check (char_length(teacher_display_name) <= 160),
  school_name text not null default '' check (char_length(school_name) <= 240),
  school_code text null check (school_code is null or char_length(school_code) <= 40),
  school_city text null check (school_city is null or char_length(school_city) <= 120),
  school_type text not null default 'Scuola secondaria di primo grado' check (char_length(school_type) between 1 and 160),
  daily_period_count integer not null default 6 check (daily_period_count between 4 and 10),
  school_day_start time not null default time '08:00',
  default_period_minutes integer not null default 60 check (default_period_minutes between 30 and 120),
  teaching_weekdays smallint[] not null default array[1,2,3,4,5,6]::smallint[] check (
    cardinality(teaching_weekdays) between 1 and 6
    and teaching_weekdays <@ array[1,2,3,4,5,6]::smallint[]
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint teacher_workspace_settings_context_uq unique (workspace_id, academic_year_id, user_id)
);

create table if not exists public.teaching_disciplines (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  is_active boolean not null default true,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists teaching_disciplines_context_name_uq
  on public.teaching_disciplines(workspace_id, academic_year_id, lower(btrim(name)));
create index if not exists idx_teacher_workspace_settings_user_context
  on public.teacher_workspace_settings(user_id, workspace_id, academic_year_id);
create index if not exists idx_teaching_disciplines_context
  on public.teaching_disciplines(workspace_id, academic_year_id, is_active, name);
create index if not exists idx_teacher_settings_workspace_id on public.teacher_workspace_settings(workspace_id);
create index if not exists idx_teacher_settings_academic_year_id on public.teacher_workspace_settings(academic_year_id);
create index if not exists idx_teaching_disciplines_workspace_id on public.teaching_disciplines(workspace_id);
create index if not exists idx_teaching_disciplines_academic_year_id on public.teaching_disciplines(academic_year_id);
create index if not exists idx_teaching_disciplines_created_by on public.teaching_disciplines(created_by);

create or replace function private.enforce_teacher_workspace_settings_invariants()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  year_workspace_id uuid;
begin
  if tg_op = 'UPDATE' then
    if new.workspace_id <> old.workspace_id
      or new.academic_year_id <> old.academic_year_id
      or new.user_id <> old.user_id then
      raise exception 'teacher settings identity is immutable';
    end if;
    new.created_at := old.created_at;
  end if;

  select ay.workspace_id into year_workspace_id
  from public.academic_years ay
  where ay.id = new.academic_year_id;

  if year_workspace_id is null or year_workspace_id <> new.workspace_id then
    raise exception 'teacher settings academic year is outside workspace';
  end if;

  new.teacher_display_name := btrim(new.teacher_display_name);
  new.school_name := btrim(new.school_name);
  new.school_code := nullif(btrim(coalesce(new.school_code, '')), '');
  new.school_city := nullif(btrim(coalesce(new.school_city, '')), '');
  new.school_type := btrim(new.school_type);
  new.updated_at := now();
  return new;
end;
$$;

create trigger teacher_workspace_settings_enforce_invariants
before insert or update on public.teacher_workspace_settings
for each row execute function private.enforce_teacher_workspace_settings_invariants();

create or replace function private.enforce_teaching_discipline_invariants()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  year_workspace_id uuid;
begin
  if tg_op = 'UPDATE' then
    if new.workspace_id <> old.workspace_id
      or new.academic_year_id <> old.academic_year_id
      or new.created_by <> old.created_by then
      raise exception 'teaching discipline identity is immutable';
    end if;
    new.created_at := old.created_at;
  end if;

  select ay.workspace_id into year_workspace_id
  from public.academic_years ay
  where ay.id = new.academic_year_id;

  if year_workspace_id is null or year_workspace_id <> new.workspace_id then
    raise exception 'teaching discipline academic year is outside workspace';
  end if;

  new.name := btrim(new.name);
  new.updated_at := now();
  return new;
end;
$$;

create trigger teaching_disciplines_enforce_invariants
before insert or update on public.teaching_disciplines
for each row execute function private.enforce_teaching_discipline_invariants();

alter table public.teacher_workspace_settings enable row level security;
alter table public.teaching_disciplines enable row level security;

create policy teacher_settings_select_self
  on public.teacher_workspace_settings for select to authenticated
  using (user_id = (select auth.uid()) and private.is_workspace_member(workspace_id));
create policy teacher_settings_insert_self
  on public.teacher_workspace_settings for insert to authenticated
  with check (user_id = (select auth.uid()) and private.is_workspace_member(workspace_id));
create policy teacher_settings_update_self
  on public.teacher_workspace_settings for update to authenticated
  using (user_id = (select auth.uid()) and private.is_workspace_member(workspace_id))
  with check (user_id = (select auth.uid()) and private.is_workspace_member(workspace_id));

create policy teaching_disciplines_select_member
  on public.teaching_disciplines for select to authenticated
  using (private.is_workspace_member(workspace_id));
create policy teaching_disciplines_insert_member
  on public.teaching_disciplines for insert to authenticated
  with check (private.is_workspace_member(workspace_id) and created_by = (select auth.uid()));
create policy teaching_disciplines_update_member
  on public.teaching_disciplines for update to authenticated
  using (private.is_workspace_member(workspace_id))
  with check (private.is_workspace_member(workspace_id));

grant select, insert, update on public.teacher_workspace_settings to authenticated;
grant select, insert, update on public.teaching_disciplines to authenticated;
revoke all on public.teacher_workspace_settings from anon;
revoke all on public.teaching_disciplines from anon;

comment on table public.teacher_workspace_settings is 'Teacher and institution personalization for one user/workspace/academic year; source defaults for timetable configuration.';
comment on table public.teaching_disciplines is 'Canonical teaching discipline registry for one workspace and academic year.';