begin;

create table if not exists public.teaching_session_drive_outbox (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references public.teaching_sessions(id) on delete restrict,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  section_id uuid not null references public.annual_plan_sections(id) on delete restrict,
  record_id text not null check (char_length(btrim(record_id)) between 1 and 220),
  projection jsonb not null check (jsonb_typeof(projection) = 'object'),
  status text not null default 'PENDING' check (status in ('PENDING','SYNCED','FAILED')),
  attempts integer not null default 0 check (attempts >= 0),
  last_error text null check (last_error is null or char_length(last_error) <= 1000),
  synced_at timestamptz null,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint teaching_session_drive_outbox_record_uq unique (workspace_id, academic_year_id, record_id)
);

create index if not exists idx_teaching_session_drive_outbox_pending
  on public.teaching_session_drive_outbox(status, created_at)
  where status in ('PENDING','FAILED');

create or replace function private.enforce_teaching_session_drive_outbox()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  session_workspace uuid;
  session_year uuid;
  session_section uuid;
begin
  select workspace_id, academic_year_id, section_id
    into session_workspace, session_year, session_section
  from public.teaching_sessions
  where id = new.session_id;

  if session_workspace is null
    or session_workspace <> new.workspace_id
    or session_year <> new.academic_year_id
    or session_section <> new.section_id then
    raise exception 'Drive diary projection is outside teaching-session context';
  end if;

  if new.projection->>'recordId' <> new.record_id
    or new.projection->>'status' <> 'COMPILATA' then
    raise exception 'Drive diary projection violates the diary contract';
  end if;

  new.record_id := btrim(new.record_id);
  new.created_by := coalesce(auth.uid(), new.created_by);
  new.updated_at := now();
  return new;
end;
$$;

create trigger teaching_session_drive_outbox_enforce
before insert on public.teaching_session_drive_outbox
for each row execute function private.enforce_teaching_session_drive_outbox();

alter table public.teaching_session_drive_outbox enable row level security;

create policy teaching_session_drive_outbox_select_member
  on public.teaching_session_drive_outbox
  for select
  to authenticated
  using (private.is_workspace_member(workspace_id));

create policy teaching_session_drive_outbox_insert_member
  on public.teaching_session_drive_outbox
  for insert
  to authenticated
  with check (
    private.is_workspace_member(workspace_id)
    and created_by = (select auth.uid())
  );

grant select, insert on public.teaching_session_drive_outbox to authenticated;
revoke update, delete on public.teaching_session_drive_outbox from authenticated;
revoke all on public.teaching_session_drive_outbox from anon;

comment on table public.teaching_session_drive_outbox is
  'Durable, non-pupil teaching-session projections ready for the Google Drive diary adapter. The canonical record remains teaching_sessions; Drive is a documentary projection.';

commit;
