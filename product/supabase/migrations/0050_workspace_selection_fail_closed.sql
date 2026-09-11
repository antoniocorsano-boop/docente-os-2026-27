begin;

create table public.user_workspace_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  current_workspace_id uuid not null references public.workspaces(id) on delete cascade,
  updated_at timestamptz not null default now()
);

alter table public.user_workspace_preferences enable row level security;

create policy user_workspace_preferences_select_self
on public.user_workspace_preferences for select to authenticated
using (user_id = (select auth.uid()));

create policy user_workspace_preferences_insert_self_member
on public.user_workspace_preferences for insert to authenticated
with check (
  user_id = (select auth.uid())
  and private.is_workspace_member(current_workspace_id)
);

create policy user_workspace_preferences_update_self_member
on public.user_workspace_preferences for update to authenticated
using (user_id = (select auth.uid()))
with check (
  user_id = (select auth.uid())
  and private.is_workspace_member(current_workspace_id)
);

create policy user_workspace_preferences_delete_self
on public.user_workspace_preferences for delete to authenticated
using (user_id = (select auth.uid()));

insert into public.user_workspace_preferences(user_id, current_workspace_id)
select distinct on (w.owner_user_id)
  w.owner_user_id,
  w.id
from public.workspaces w
join public.workspace_memberships wm
  on wm.workspace_id = w.id
 and wm.user_id = w.owner_user_id
where w.kind = 'PERSONAL'
order by w.owner_user_id, w.created_at asc
on conflict (user_id) do nothing;

create or replace function public.bootstrap_personal_workspace(workspace_name text default 'Il mio spazio docente')
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  wid uuid;
begin
  if uid is null then
    raise exception 'authentication required';
  end if;

  insert into public.profiles(user_id)
  values (uid)
  on conflict (user_id) do nothing;

  select w.id into wid
  from public.workspaces w
  where w.owner_user_id = uid
    and w.kind = 'PERSONAL'
  order by w.created_at asc
  limit 1;

  if wid is null then
    insert into public.workspaces(kind, name, owner_user_id)
    values ('PERSONAL', coalesce(nullif(trim(workspace_name), ''), 'Il mio spazio docente'), uid)
    returning id into wid;
  end if;

  insert into public.workspace_memberships(workspace_id, user_id, role)
  values (wid, uid, 'OWNER')
  on conflict (workspace_id, user_id) do update set role = 'OWNER';

  insert into public.user_workspace_preferences(user_id, current_workspace_id)
  values (uid, wid)
  on conflict (user_id) do nothing;

  return wid;
end;
$$;

create or replace function public.current_workspace_context()
returns table (
  workspace_id uuid,
  workspace_kind text,
  workspace_name text,
  owner_user_id uuid,
  workspace_role text,
  academic_year_id uuid,
  academic_year_label text,
  academic_year_starts_on date,
  academic_year_ends_on date,
  academic_year_is_active boolean
)
language sql
stable
security invoker
set search_path = ''
as $$
  with actor as (
    select auth.uid() as uid
  ),
  selected_workspace as (
    select candidate.workspace_id
    from (
      select
        pref.current_workspace_id as workspace_id,
        0 as priority,
        pref.updated_at as selected_at
      from public.user_workspace_preferences pref
      join actor on pref.user_id = actor.uid
      join public.workspace_memberships wm
        on wm.workspace_id = pref.current_workspace_id
       and wm.user_id = actor.uid

      union all

      select
        w.id as workspace_id,
        1 as priority,
        w.created_at as selected_at
      from public.workspaces w
      join actor on w.owner_user_id = actor.uid
      join public.workspace_memberships wm
        on wm.workspace_id = w.id
       and wm.user_id = actor.uid
      where w.kind = 'PERSONAL'
    ) candidate
    order by candidate.priority asc, candidate.selected_at asc
    limit 1
  )
  select
    w.id,
    w.kind,
    w.name,
    w.owner_user_id,
    wm.role,
    ay.id,
    ay.label,
    ay.starts_on,
    ay.ends_on,
    ay.is_active
  from selected_workspace selected
  join public.workspaces w on w.id = selected.workspace_id
  join actor on true
  join public.workspace_memberships wm
    on wm.workspace_id = w.id
   and wm.user_id = actor.uid
  left join lateral (
    select a.id, a.label, a.starts_on, a.ends_on, a.is_active
    from public.academic_years a
    where a.workspace_id = w.id
      and a.is_active = true
    order by a.starts_on desc, a.created_at desc
    limit 1
  ) ay on true;
$$;

revoke all on function public.bootstrap_personal_workspace(text) from public;
revoke execute on function public.bootstrap_personal_workspace(text) from anon;
grant execute on function public.bootstrap_personal_workspace(text) to authenticated;

revoke all on function public.current_workspace_context() from public;
revoke execute on function public.current_workspace_context() from anon;
grant execute on function public.current_workspace_context() to authenticated;

commit;
