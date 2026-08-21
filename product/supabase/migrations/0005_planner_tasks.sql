create table if not exists public.planner_tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  academic_year_id uuid null references public.academic_years(id) on delete set null,
  title text not null check (char_length(btrim(title)) between 1 and 240),
  notes text null,
  status text not null default 'OPEN' check (status in ('OPEN','WAITING','DONE','CANCELLED')),
  priority text not null default 'NORMAL' check (priority in ('LOW','NORMAL','HIGH','URGENT')),
  due_at timestamptz null,
  planned_for date null,
  source_kind text not null default 'MANUAL' check (source_kind in ('MANUAL','COMMUNICATION','CALENDAR','TEACHING','DOCUMENT','SYSTEM')),
  source_ref text null,
  created_by uuid not null references auth.users(id) on delete restrict,
  completed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint planner_tasks_done_completion_ck check (
    (status = 'DONE' and completed_at is not null)
    or (status <> 'DONE' and completed_at is null)
  )
);

create index if not exists idx_planner_tasks_workspace_status
  on public.planner_tasks(workspace_id, status);

create index if not exists idx_planner_tasks_workspace_due
  on public.planner_tasks(workspace_id, due_at)
  where due_at is not null;

create index if not exists idx_planner_tasks_workspace_planned
  on public.planner_tasks(workspace_id, planned_for)
  where planned_for is not null;

alter table public.planner_tasks enable row level security;

create policy planner_tasks_select_member
  on public.planner_tasks
  for select
  to authenticated
  using (private.is_workspace_member(workspace_id));

create policy planner_tasks_insert_member
  on public.planner_tasks
  for insert
  to authenticated
  with check (
    private.is_workspace_member(workspace_id)
    and created_by = (select auth.uid())
    and (
      academic_year_id is null
      or exists (
        select 1
        from public.academic_years ay
        where ay.id = academic_year_id
          and ay.workspace_id = planner_tasks.workspace_id
      )
    )
  );

create policy planner_tasks_update_member
  on public.planner_tasks
  for update
  to authenticated
  using (private.is_workspace_member(workspace_id))
  with check (
    private.is_workspace_member(workspace_id)
    and (
      academic_year_id is null
      or exists (
        select 1
        from public.academic_years ay
        where ay.id = academic_year_id
          and ay.workspace_id = planner_tasks.workspace_id
      )
    )
  );

grant select, insert, update on public.planner_tasks to authenticated;
revoke all on public.planner_tasks from anon;
