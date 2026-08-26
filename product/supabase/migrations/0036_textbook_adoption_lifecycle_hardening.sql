alter table public.textbook_adoptions
  drop constraint if exists textbook_adoptions_source_kind_check;

alter table public.textbook_adoptions
  drop constraint if exists textbook_adoptions_source_kind_ck;

alter table public.textbook_adoptions
  add constraint textbook_adoptions_source_kind_ck
  check (source_kind in ('MANUAL', 'MIM_OPEN_DATA', 'ISBN_LOOKUP'));

alter table public.textbook_adoptions
  alter column source_kind drop default;

create or replace function private.enforce_textbook_adoption_invariants()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  assignment_workspace_id uuid;
  assignment_year_id uuid;
  textbook_workspace_id uuid;
  textbook_year_id uuid;
begin
  if tg_op = 'INSERT' then
    if new.status <> 'PROPOSED' then
      raise exception 'textbook adoption must be inserted as PROPOSED';
    end if;
    if new.source_kind = 'MANUAL' then
      raise exception 'manual textbook metadata entry is not admitted';
    end if;
    new.confirmed_by := null;
    new.confirmed_at := null;
  else
    if new.workspace_id <> old.workspace_id
      or new.academic_year_id <> old.academic_year_id
      or new.teaching_assignment_id <> old.teaching_assignment_id
      or new.textbook_id <> old.textbook_id
      or new.usage_kind <> old.usage_kind
      or new.created_by <> old.created_by then
      raise exception 'textbook adoption identity is immutable';
    end if;
    new.created_at := old.created_at;

    if old.status = 'CONFIRMED' and new.status <> 'CONFIRMED' then
      raise exception 'confirmed textbook adoption cannot return to PROPOSED';
    end if;

    if old.status = 'PROPOSED' and new.status = 'PROPOSED' then
      new.confirmed_by := null;
      new.confirmed_at := null;
    elsif old.status = 'PROPOSED' and new.status = 'CONFIRMED' then
      if new.confirmed_by is null or new.confirmed_at is null then
        raise exception 'confirmation requires actor and timestamp';
      end if;
    end if;
  end if;

  select ta.workspace_id, ta.academic_year_id
    into assignment_workspace_id, assignment_year_id
  from public.teaching_assignments ta
  where ta.id = new.teaching_assignment_id;

  select t.workspace_id, t.academic_year_id
    into textbook_workspace_id, textbook_year_id
  from public.textbooks t
  where t.id = new.textbook_id;

  if assignment_workspace_id is null
    or assignment_workspace_id <> new.workspace_id
    or assignment_year_id <> new.academic_year_id then
    raise exception 'textbook adoption assignment is outside context';
  end if;

  if textbook_workspace_id is null
    or textbook_workspace_id <> new.workspace_id
    or textbook_year_id <> new.academic_year_id then
    raise exception 'textbook adoption book is outside context';
  end if;

  new.source_ref := nullif(btrim(coalesce(new.source_ref, '')), '');
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.confirm_textbook_adoption(target_adoption_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  target_workspace_id uuid;
begin
  if caller_id is null then
    raise exception 'authenticated user required';
  end if;

  select ta.workspace_id
    into target_workspace_id
  from public.textbook_adoptions ta
  where ta.id = target_adoption_id;

  if target_workspace_id is null then
    raise exception 'textbook adoption not found';
  end if;

  if not private.is_workspace_member(target_workspace_id) then
    raise exception 'textbook adoption is outside caller workspace';
  end if;

  update public.textbook_adoptions
  set
    status = 'CONFIRMED',
    confirmed_by = caller_id,
    confirmed_at = now()
  where id = target_adoption_id
    and status = 'PROPOSED';

  if not found then
    raise exception 'textbook adoption is not pending confirmation';
  end if;
end;
$$;

revoke update on public.textbook_adoptions from authenticated;
revoke all on function public.confirm_textbook_adoption(uuid) from public;
revoke all on function public.confirm_textbook_adoption(uuid) from anon;
grant execute on function public.confirm_textbook_adoption(uuid) to authenticated;

comment on function public.confirm_textbook_adoption(uuid) is
  'Explicit human confirmation boundary for textbook adoption proposals. Direct confirmed inserts and reverse transitions are rejected.';
