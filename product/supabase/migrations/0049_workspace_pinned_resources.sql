begin;

alter table public.academic_years
  add constraint academic_years_id_workspace_unique unique (id, workspace_id);

create table public.workspace_pinned_resources (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  academic_year_id uuid not null,
  kind text not null check (kind in ('TODAY','SECTION','PLANNING','DIARY','PROBATION')),
  target_url text not null check (char_length(target_url) between 1 and 2048 and target_url ~ '^(https://|/)'),
  note text null check (note is null or char_length(note) <= 500),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, academic_year_id, kind),
  constraint workspace_pinned_resources_academic_year_fk
    foreign key (academic_year_id, workspace_id)
    references public.academic_years(id, workspace_id)
    on delete cascade
);

create index idx_workspace_pinned_resources_context
  on public.workspace_pinned_resources(workspace_id, academic_year_id, kind);

alter table public.workspace_pinned_resources enable row level security;

create policy workspace_pinned_resources_select_member
on public.workspace_pinned_resources for select to authenticated
using (private.is_workspace_member(workspace_id));

create policy workspace_pinned_resources_insert_member
on public.workspace_pinned_resources for insert to authenticated
with check (
  private.is_workspace_member(workspace_id)
  and created_by = (select auth.uid())
);

create policy workspace_pinned_resources_update_member
on public.workspace_pinned_resources for update to authenticated
using (private.is_workspace_member(workspace_id))
with check (private.is_workspace_member(workspace_id));

create policy workspace_pinned_resources_delete_member
on public.workspace_pinned_resources for delete to authenticated
using (private.is_workspace_member(workspace_id));

create or replace function public.list_workspace_pinned_resources(
  target_workspace_id uuid,
  target_academic_year_id uuid
)
returns setof public.workspace_pinned_resources
language sql
stable
security invoker
set search_path = ''
as $$
  select resource.*
  from public.workspace_pinned_resources resource
  where resource.workspace_id = target_workspace_id
    and resource.academic_year_id = target_academic_year_id
  order by case resource.kind
    when 'TODAY' then 1
    when 'SECTION' then 2
    when 'PLANNING' then 3
    when 'DIARY' then 4
    when 'PROBATION' then 5
    else 99
  end;
$$;

create or replace function public.upsert_workspace_pinned_resource(
  target_workspace_id uuid,
  target_academic_year_id uuid,
  target_kind text,
  target_url text,
  target_note text default null
)
returns public.workspace_pinned_resources
language plpgsql
security invoker
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  result public.workspace_pinned_resources;
begin
  if uid is null then
    raise exception 'authentication required';
  end if;

  if target_kind not in ('TODAY','SECTION','PLANNING','DIARY','PROBATION') then
    raise exception 'unsupported pinned resource kind';
  end if;

  if target_url is null or target_url !~ '^(https://|/)' or char_length(target_url) > 2048 then
    raise exception 'invalid pinned resource target';
  end if;

  if target_note is not null and char_length(target_note) > 500 then
    raise exception 'pinned resource note too long';
  end if;

  insert into public.workspace_pinned_resources(
    workspace_id,
    academic_year_id,
    kind,
    target_url,
    note,
    created_by
  ) values (
    target_workspace_id,
    target_academic_year_id,
    target_kind,
    target_url,
    nullif(trim(target_note), ''),
    uid
  )
  on conflict (workspace_id, academic_year_id, kind)
  do update set
    target_url = excluded.target_url,
    note = excluded.note,
    updated_at = now()
  returning * into result;

  return result;
end;
$$;

create or replace function public.delete_workspace_pinned_resource(
  target_workspace_id uuid,
  target_academic_year_id uuid,
  target_kind text
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  deleted_count integer;
begin
  delete from public.workspace_pinned_resources resource
  where resource.workspace_id = target_workspace_id
    and resource.academic_year_id = target_academic_year_id
    and resource.kind = target_kind;

  get diagnostics deleted_count = row_count;
  return deleted_count > 0;
end;
$$;

revoke all on function public.list_workspace_pinned_resources(uuid, uuid) from public;
revoke all on function public.upsert_workspace_pinned_resource(uuid, uuid, text, text, text) from public;
revoke all on function public.delete_workspace_pinned_resource(uuid, uuid, text) from public;

grant execute on function public.list_workspace_pinned_resources(uuid, uuid) to authenticated;
grant execute on function public.upsert_workspace_pinned_resource(uuid, uuid, text, text, text) to authenticated;
grant execute on function public.delete_workspace_pinned_resource(uuid, uuid, text) to authenticated;

commit;
