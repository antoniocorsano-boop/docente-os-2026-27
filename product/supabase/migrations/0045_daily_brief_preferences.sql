create table if not exists public.daily_brief_preferences (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  enabled boolean not null default false,
  local_time time not null default time '07:00',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint daily_brief_preferences_context_uq unique (workspace_id, academic_year_id, user_id)
);

create index if not exists idx_daily_brief_preferences_due
  on public.daily_brief_preferences(enabled, local_time)
  where enabled = true;

create or replace function private.enforce_daily_brief_preference_invariants()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  year_workspace_id uuid;
begin
  if new.user_id <> auth.uid() then
    raise exception 'daily brief preference must belong to current user';
  end if;

  select ay.workspace_id into year_workspace_id
  from public.academic_years ay
  where ay.id = new.academic_year_id;

  if year_workspace_id is null or year_workspace_id <> new.workspace_id then
    raise exception 'daily brief academic year is outside workspace';
  end if;

  if tg_op = 'UPDATE' then
    if new.workspace_id <> old.workspace_id
      or new.academic_year_id <> old.academic_year_id
      or new.user_id <> old.user_id then
      raise exception 'daily brief preference identity is immutable';
    end if;
    new.created_at := old.created_at;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger daily_brief_preferences_enforce_invariants
before insert or update on public.daily_brief_preferences
for each row execute function private.enforce_daily_brief_preference_invariants();

alter table public.daily_brief_preferences enable row level security;

create policy daily_brief_preferences_select_self
  on public.daily_brief_preferences for select to authenticated
  using (user_id = (select auth.uid()) and private.is_workspace_member(workspace_id));

create policy daily_brief_preferences_insert_self
  on public.daily_brief_preferences for insert to authenticated
  with check (user_id = (select auth.uid()) and private.is_workspace_member(workspace_id));

create policy daily_brief_preferences_update_self
  on public.daily_brief_preferences for update to authenticated
  using (user_id = (select auth.uid()) and private.is_workspace_member(workspace_id))
  with check (user_id = (select auth.uid()) and private.is_workspace_member(workspace_id));

create policy daily_brief_preferences_delete_self
  on public.daily_brief_preferences for delete to authenticated
  using (user_id = (select auth.uid()) and private.is_workspace_member(workspace_id));

grant select, insert, update, delete on public.daily_brief_preferences to authenticated;
revoke all on public.daily_brief_preferences from anon;

comment on table public.daily_brief_preferences is
  'Teacher-controlled local-time preference for the daily brief. Delivery channels consume this preference but do not own daily brief content.';
