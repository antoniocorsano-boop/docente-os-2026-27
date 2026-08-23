create table if not exists public.experience_feedback (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  academic_year_id uuid null references public.academic_years(id) on delete set null,
  surface text not null check (char_length(surface) between 1 and 80),
  journey text not null check (char_length(journey) between 1 and 80),
  task_intent text not null check (task_intent in ('ACT_NOW','PREPARE','TEACH','RECORD','REVIEW','EXPLORE')),
  context_ref jsonb not null default '{}'::jsonb check (jsonb_typeof(context_ref) = 'object'),
  satisfaction smallint not null check (satisfaction between 1 and 5),
  comment text null check (comment is null or char_length(comment) <= 1500),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists idx_experience_feedback_workspace_created
  on public.experience_feedback(workspace_id, created_at desc);

create or replace function private.enforce_experience_feedback_invariants()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if auth.uid() is null or new.created_by <> auth.uid() then
    raise exception 'experience feedback created_by must match authenticated user';
  end if;

  if new.academic_year_id is not null and not exists (
    select 1
    from public.academic_years ay
    where ay.id = new.academic_year_id
      and ay.workspace_id = new.workspace_id
  ) then
    raise exception 'experience feedback academic year must belong to workspace';
  end if;

  return new;
end;
$$;

create trigger experience_feedback_enforce_invariants
before insert on public.experience_feedback
for each row execute function private.enforce_experience_feedback_invariants();

alter table public.experience_feedback enable row level security;

create policy experience_feedback_insert_member
  on public.experience_feedback
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
          and ay.workspace_id = experience_feedback.workspace_id
      )
    )
  );

grant insert on public.experience_feedback to authenticated;
revoke all on public.experience_feedback from anon;

comment on table public.experience_feedback is
  'Immutable contextual product-experience feedback captured at the end of a user task. Not for student or sensitive personal data.';
