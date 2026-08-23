begin;

create table if not exists public.calendar_days (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  local_date date not null,
  day_kind text not null check (day_kind in ('SCHOOL_DAY','SUSPENSION','HOLIDAY','CLOSURE')),
  label text not null check (char_length(btrim(label)) between 1 and 160),
  note text null check (note is null or char_length(note) <= 1000),
  source_kind text not null default 'MANUAL' check (source_kind in ('MANUAL','INSTITUTION_DOCUMENT','IMPORT')),
  source_ref text null check (source_ref is null or char_length(source_ref) <= 1000),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint calendar_days_workspace_year_date_uq unique (workspace_id, academic_year_id, local_date)
);

create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 200),
  event_kind text not null default 'OTHER' check (event_kind in ('INSTITUTION','MEETING','DEADLINE','TRAINING','OTHER')),
  starts_on date not null,
  ends_on date not null,
  all_day boolean not null default true,
  start_time time null,
  end_time time null,
  note text null check (note is null or char_length(note) <= 2000),
  source_kind text not null default 'MANUAL' check (source_kind in ('MANUAL','INSTITUTION_DOCUMENT','IMPORT')),
  source_ref text null check (source_ref is null or char_length(source_ref) <= 1000),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint calendar_events_dates_ck check (ends_on >= starts_on),
  constraint calendar_events_time_ck check (
    (all_day = true and start_time is null and end_time is null)
    or
    (all_day = false and starts_on = ends_on and start_time is not null and end_time is not null and end_time > start_time)
  )
);

create index if not exists idx_calendar_days_workspace_year_date
  on public.calendar_days(workspace_id, academic_year_id, local_date);
create index if not exists idx_calendar_events_workspace_year_start
  on public.calendar_events(workspace_id, academic_year_id, starts_on, ends_on);
create index if not exists idx_calendar_days_created_by on public.calendar_days(created_by);
create index if not exists idx_calendar_events_created_by on public.calendar_events(created_by);

create or replace function private.enforce_calendar_day_invariants()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  year_workspace uuid;
  year_start date;
  year_end date;
begin
  if tg_op = 'UPDATE' then
    if new.workspace_id <> old.workspace_id
      or new.academic_year_id <> old.academic_year_id
      or new.local_date <> old.local_date
      or new.created_by <> old.created_by then
      raise exception 'calendar day identity is immutable';
    end if;
    new.created_at := old.created_at;
  end if;

  select workspace_id, starts_on, ends_on into year_workspace, year_start, year_end
  from public.academic_years where id = new.academic_year_id;

  if year_workspace is null or year_workspace <> new.workspace_id then
    raise exception 'calendar day academic year is outside workspace';
  end if;
  if new.local_date < year_start or new.local_date > year_end then
    raise exception 'calendar day is outside academic year';
  end if;

  new.label := btrim(new.label);
  new.note := nullif(btrim(coalesce(new.note, '')), '');
  new.source_ref := nullif(btrim(coalesce(new.source_ref, '')), '');
  new.updated_at := now();
  return new;
end;
$$;

create trigger calendar_days_enforce_invariants
before insert or update on public.calendar_days
for each row execute function private.enforce_calendar_day_invariants();

create or replace function private.enforce_calendar_event_invariants()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  year_workspace uuid;
  year_start date;
  year_end date;
begin
  if tg_op = 'UPDATE' then
    if new.workspace_id <> old.workspace_id
      or new.academic_year_id <> old.academic_year_id
      or new.created_by <> old.created_by then
      raise exception 'calendar event context identity is immutable';
    end if;
    new.created_at := old.created_at;
  end if;

  select workspace_id, starts_on, ends_on into year_workspace, year_start, year_end
  from public.academic_years where id = new.academic_year_id;

  if year_workspace is null or year_workspace <> new.workspace_id then
    raise exception 'calendar event academic year is outside workspace';
  end if;
  if new.starts_on < year_start or new.ends_on > year_end then
    raise exception 'calendar event is outside academic year';
  end if;

  new.title := btrim(new.title);
  new.note := nullif(btrim(coalesce(new.note, '')), '');
  new.source_ref := nullif(btrim(coalesce(new.source_ref, '')), '');
  if new.all_day then
    new.start_time := null;
    new.end_time := null;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger calendar_events_enforce_invariants
before insert or update on public.calendar_events
for each row execute function private.enforce_calendar_event_invariants();

alter table public.calendar_days enable row level security;
alter table public.calendar_events enable row level security;

create policy calendar_days_select_member on public.calendar_days
for select to authenticated using (private.is_workspace_member(workspace_id));
create policy calendar_days_insert_member on public.calendar_days
for insert to authenticated with check (private.is_workspace_member(workspace_id) and created_by = (select auth.uid()));
create policy calendar_days_update_member on public.calendar_days
for update to authenticated using (private.is_workspace_member(workspace_id)) with check (private.is_workspace_member(workspace_id));
create policy calendar_days_delete_member on public.calendar_days
for delete to authenticated using (private.is_workspace_member(workspace_id));

create policy calendar_events_select_member on public.calendar_events
for select to authenticated using (private.is_workspace_member(workspace_id));
create policy calendar_events_insert_member on public.calendar_events
for insert to authenticated with check (private.is_workspace_member(workspace_id) and created_by = (select auth.uid()));
create policy calendar_events_update_member on public.calendar_events
for update to authenticated using (private.is_workspace_member(workspace_id)) with check (private.is_workspace_member(workspace_id));
create policy calendar_events_delete_member on public.calendar_events
for delete to authenticated using (private.is_workspace_member(workspace_id));

grant select, insert, update, delete on public.calendar_days to authenticated;
grant select, insert, update, delete on public.calendar_events to authenticated;
revoke all on public.calendar_days from anon;
revoke all on public.calendar_events from anon;

comment on table public.calendar_days is
  'Explicit, source-bound school calendar day classifications. Absence of a row means the day is not yet determined by Calendar.';
comment on table public.calendar_events is
  'Institutional and teacher calendar commitments, independent from recurring timetable slots.';

commit;
