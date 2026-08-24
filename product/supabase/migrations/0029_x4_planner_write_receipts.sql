begin;

create table public.assistant_write_proposals (
  id uuid primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  academic_year_id uuid null references public.academic_years(id) on delete set null,
  capability text not null check (capability = 'PLANNER_CREATE_TASK'),
  status text not null default 'PREVIEW_READY' check (status in ('PREVIEW_READY','REJECTED','EXECUTED','UNDONE')),
  summary text not null check (char_length(summary) between 1 and 600),
  rationale text null check (rationale is null or char_length(rationale) <= 2000),
  evidence_refs text[] not null default '{}',
  effect_preview jsonb not null check (jsonb_typeof(effect_preview) = 'object'),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  payload_fingerprint text not null check (payload_fingerprint ~ '^[0-9a-f]{64}$'),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  confirmed_by uuid null references auth.users(id) on delete restrict,
  confirmed_at timestamptz null,
  executed_at timestamptz null,
  effect_ref uuid null references public.planner_tasks(id) on delete restrict,
  rejected_at timestamptz null,
  undone_at timestamptz null,
  constraint assistant_write_execution_receipt_ck check (
    (status in ('PREVIEW_READY','REJECTED') and effect_ref is null)
    or (status in ('EXECUTED','UNDONE') and effect_ref is not null)
  ),
  constraint assistant_write_confirmation_ck check (
    (status in ('PREVIEW_READY','REJECTED') and confirmed_by is null and confirmed_at is null and executed_at is null)
    or (status in ('EXECUTED','UNDONE') and confirmed_by is not null and confirmed_at is not null and executed_at is not null)
  )
);

create unique index assistant_write_proposals_effect_ref_uq
  on public.assistant_write_proposals(effect_ref)
  where effect_ref is not null;
create index assistant_write_proposals_actor_idx
  on public.assistant_write_proposals(created_by, created_at desc);
create index assistant_write_proposals_workspace_idx
  on public.assistant_write_proposals(workspace_id, created_at desc);

alter table public.assistant_write_proposals enable row level security;

create policy assistant_write_proposals_select_own
on public.assistant_write_proposals
for select to authenticated
using (created_by = auth.uid() and private.is_workspace_member(workspace_id));

revoke all on public.assistant_write_proposals from anon, authenticated;
grant select on public.assistant_write_proposals to authenticated;

create or replace function public.prepare_assistant_planner_create_task(
  target_proposal_id uuid,
  target_workspace_id uuid,
  target_academic_year_id uuid,
  target_title text,
  target_notes text,
  target_priority text,
  target_planned_for date,
  target_due_at timestamptz,
  target_rationale text,
  target_evidence_refs text[],
  target_summary text,
  target_effect_preview jsonb,
  target_payload_fingerprint text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  normalized_title text := btrim(coalesce(target_title, ''));
  normalized_notes text := nullif(btrim(coalesce(target_notes, '')), '');
  normalized_rationale text := nullif(btrim(coalesce(target_rationale, '')), '');
  normalized_summary text := btrim(coalesce(target_summary, ''));
  source_ref text;
begin
  if actor is null then raise exception 'authenticated user required'; end if;
  if target_proposal_id is null then raise exception 'proposal id required'; end if;
  if not private.is_workspace_member(target_workspace_id) then raise exception 'workspace membership required'; end if;

  if target_academic_year_id is not null and not exists (
    select 1 from public.academic_years y
    where y.id = target_academic_year_id and y.workspace_id = target_workspace_id
  ) then
    raise exception 'academic year is outside workspace';
  end if;

  if normalized_title = '' or char_length(normalized_title) > 240 then raise exception 'invalid Planner task title'; end if;
  if normalized_notes is not null and char_length(normalized_notes) > 4000 then raise exception 'Planner task notes too long'; end if;
  if target_priority not in ('LOW','NORMAL','HIGH','URGENT') then raise exception 'invalid Planner task priority'; end if;
  if normalized_rationale is not null and char_length(normalized_rationale) > 2000 then raise exception 'rationale too long'; end if;
  if normalized_summary = '' or char_length(normalized_summary) > 600 then raise exception 'invalid proposal summary'; end if;
  if target_effect_preview is null or jsonb_typeof(target_effect_preview) <> 'object' then raise exception 'effect preview required'; end if;
  if target_payload_fingerprint is null or target_payload_fingerprint !~ '^[0-9a-f]{64}$' then raise exception 'invalid payload fingerprint'; end if;

  source_ref := 'assistant-write:' || target_proposal_id::text;

  insert into public.assistant_write_proposals (
    id,
    workspace_id,
    academic_year_id,
    capability,
    status,
    summary,
    rationale,
    evidence_refs,
    effect_preview,
    payload,
    payload_fingerprint,
    created_by
  ) values (
    target_proposal_id,
    target_workspace_id,
    target_academic_year_id,
    'PLANNER_CREATE_TASK',
    'PREVIEW_READY',
    normalized_summary,
    normalized_rationale,
    coalesce(target_evidence_refs, '{}'),
    target_effect_preview,
    jsonb_build_object(
      'title', normalized_title,
      'notes', normalized_notes,
      'priority', target_priority,
      'plannedFor', target_planned_for,
      'dueAt', target_due_at,
      'sourceKind', 'SYSTEM',
      'sourceRef', source_ref
    ),
    target_payload_fingerprint,
    actor
  );

  return target_proposal_id;
end;
$$;

create or replace function public.execute_assistant_planner_create_task(target_proposal_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  proposal public.assistant_write_proposals%rowtype;
  task_id uuid;
  task_title text;
  task_notes text;
  task_priority text;
  task_planned_for date;
  task_due_at timestamptz;
  task_source_ref text;
begin
  if actor is null then raise exception 'authenticated user required'; end if;

  select * into proposal
  from public.assistant_write_proposals
  where id = target_proposal_id and created_by = actor
  for update;

  if proposal.id is null then raise exception 'proposal not found'; end if;
  if not private.is_workspace_member(proposal.workspace_id) then raise exception 'workspace membership required'; end if;
  if proposal.capability <> 'PLANNER_CREATE_TASK' then raise exception 'capability not allowed'; end if;
  if proposal.status <> 'PREVIEW_READY' then raise exception 'proposal is not awaiting confirmation'; end if;

  task_title := nullif(btrim(coalesce(proposal.payload->>'title', '')), '');
  task_notes := nullif(btrim(coalesce(proposal.payload->>'notes', '')), '');
  task_priority := coalesce(proposal.payload->>'priority', 'NORMAL');
  task_source_ref := 'assistant-write:' || proposal.id::text;

  if proposal.payload->>'plannedFor' is not null then
    task_planned_for := (proposal.payload->>'plannedFor')::date;
  end if;
  if proposal.payload->>'dueAt' is not null then
    task_due_at := (proposal.payload->>'dueAt')::timestamptz;
  end if;

  if task_title is null or char_length(task_title) > 240 then raise exception 'stored proposal title invalid'; end if;
  if task_notes is not null and char_length(task_notes) > 4000 then raise exception 'stored proposal notes invalid'; end if;
  if task_priority not in ('LOW','NORMAL','HIGH','URGENT') then raise exception 'stored proposal priority invalid'; end if;

  insert into public.planner_tasks (
    workspace_id,
    academic_year_id,
    title,
    notes,
    status,
    priority,
    due_at,
    planned_for,
    source_kind,
    source_ref,
    created_by
  ) values (
    proposal.workspace_id,
    proposal.academic_year_id,
    task_title,
    task_notes,
    'OPEN',
    task_priority,
    task_due_at,
    task_planned_for,
    'SYSTEM',
    task_source_ref,
    actor
  ) returning id into task_id;

  update public.assistant_write_proposals
  set status = 'EXECUTED',
      confirmed_by = actor,
      confirmed_at = now(),
      executed_at = now(),
      effect_ref = task_id
  where id = proposal.id;

  return task_id;
end;
$$;

create or replace function public.reject_assistant_write_proposal(target_proposal_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  updated_id uuid;
begin
  if actor is null then raise exception 'authenticated user required'; end if;

  update public.assistant_write_proposals
  set status = 'REJECTED', rejected_at = now()
  where id = target_proposal_id
    and created_by = actor
    and status = 'PREVIEW_READY'
    and private.is_workspace_member(workspace_id)
  returning id into updated_id;

  if updated_id is null then raise exception 'proposal not available for rejection'; end if;
  return updated_id;
end;
$$;

create or replace function public.undo_assistant_planner_create_task(target_proposal_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  proposal public.assistant_write_proposals%rowtype;
  task_status text;
  task_source_ref text;
begin
  if actor is null then raise exception 'authenticated user required'; end if;

  select * into proposal
  from public.assistant_write_proposals
  where id = target_proposal_id and created_by = actor
  for update;

  if proposal.id is null then raise exception 'proposal not found'; end if;
  if not private.is_workspace_member(proposal.workspace_id) then raise exception 'workspace membership required'; end if;
  if proposal.status <> 'EXECUTED' or proposal.effect_ref is null then raise exception 'proposal has no reversible executed effect'; end if;

  select status, source_ref into task_status, task_source_ref
  from public.planner_tasks
  where id = proposal.effect_ref
    and workspace_id = proposal.workspace_id
    and created_by = actor
  for update;

  if task_status is null then raise exception 'created Planner task not found'; end if;
  if task_source_ref <> 'assistant-write:' || proposal.id::text then raise exception 'Planner task provenance mismatch'; end if;
  if task_status not in ('OPEN','WAITING') then raise exception 'Planner task can no longer be undone safely'; end if;

  update public.planner_tasks
  set status = 'CANCELLED', completed_at = null
  where id = proposal.effect_ref;

  update public.assistant_write_proposals
  set status = 'UNDONE', undone_at = now()
  where id = proposal.id;

  return proposal.effect_ref;
end;
$$;

revoke all on function public.prepare_assistant_planner_create_task(uuid,uuid,uuid,text,text,text,date,timestamptz,text,text[],text,jsonb,text) from public, anon;
revoke all on function public.execute_assistant_planner_create_task(uuid) from public, anon;
revoke all on function public.reject_assistant_write_proposal(uuid) from public, anon;
revoke all on function public.undo_assistant_planner_create_task(uuid) from public, anon;

grant execute on function public.prepare_assistant_planner_create_task(uuid,uuid,uuid,text,text,text,date,timestamptz,text,text[],text,jsonb,text) to authenticated;
grant execute on function public.execute_assistant_planner_create_task(uuid) to authenticated;
grant execute on function public.reject_assistant_write_proposal(uuid) to authenticated;
grant execute on function public.undo_assistant_planner_create_task(uuid) to authenticated;

comment on table public.assistant_write_proposals is 'X4 human-confirmed write previews and effect receipts. Direct writes are revoked; all transitions pass through authenticated RPC boundaries.';
comment on function public.prepare_assistant_planner_create_task(uuid,uuid,uuid,text,text,text,date,timestamptz,text,text[],text,jsonb,text) is 'Creates a persisted PREVIEW_READY receipt for the single X4A capability PLANNER_CREATE_TASK. It does not create a Planner task.';
comment on function public.execute_assistant_planner_create_task(uuid) is 'Atomic human-confirmation boundary for X4A: creates exactly one internal Planner task and records who confirmed and the resulting task id.';
comment on function public.undo_assistant_planner_create_task(uuid) is 'Reverses an X4A-created Planner task only while it remains OPEN or WAITING, preserving history by setting it CANCELLED.';

commit;
