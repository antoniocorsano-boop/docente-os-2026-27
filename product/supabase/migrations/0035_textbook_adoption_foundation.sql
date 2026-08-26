create table if not exists public.textbooks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  isbn13 text not null check (isbn13 ~ '^[0-9]{13}$'),
  title text not null check (char_length(btrim(title)) between 1 and 320),
  subtitle text null check (subtitle is null or char_length(subtitle) <= 320),
  authors text null check (authors is null or char_length(authors) <= 400),
  publisher text not null check (char_length(btrim(publisher)) between 1 and 200),
  edition_label text null check (edition_label is null or char_length(edition_label) <= 160),
  volume_label text null check (volume_label is null or char_length(volume_label) <= 120),
  official_url text null check (official_url is null or char_length(official_url) <= 1000),
  publisher_product_ref text null check (publisher_product_ref is null or char_length(publisher_product_ref) <= 200),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint textbooks_context_isbn_uq unique (workspace_id, academic_year_id, isbn13)
);

create table if not exists public.textbook_adoptions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  teaching_assignment_id uuid not null references public.teaching_assignments(id) on delete cascade,
  textbook_id uuid not null references public.textbooks(id) on delete cascade,
  usage_kind text not null default 'ADOPTED' check (usage_kind in ('ADOPTED', 'RECOMMENDED', 'OTHER')),
  source_kind text not null default 'MANUAL' check (source_kind in ('MANUAL', 'MIM_OPEN_DATA')),
  source_ref text null check (source_ref is null or char_length(source_ref) <= 500),
  source_metadata jsonb not null default '{}'::jsonb,
  status text not null default 'PROPOSED' check (status in ('PROPOSED', 'CONFIRMED')),
  confirmed_by uuid null references auth.users(id) on delete restrict,
  confirmed_at timestamptz null,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint textbook_adoptions_assignment_book_kind_uq unique (teaching_assignment_id, textbook_id, usage_kind),
  constraint textbook_adoptions_confirmation_ck check (
    (status = 'PROPOSED' and confirmed_by is null and confirmed_at is null)
    or (status = 'CONFIRMED' and confirmed_by is not null and confirmed_at is not null)
  )
);

create index if not exists idx_textbooks_context
  on public.textbooks(workspace_id, academic_year_id, publisher, title);
create index if not exists idx_textbook_adoptions_context
  on public.textbook_adoptions(workspace_id, academic_year_id, teaching_assignment_id, status);
create index if not exists idx_textbook_adoptions_textbook
  on public.textbook_adoptions(textbook_id);

create or replace function private.enforce_textbook_invariants()
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
      or new.isbn13 <> old.isbn13
      or new.created_by <> old.created_by then
      raise exception 'textbook identity is immutable';
    end if;
    new.created_at := old.created_at;
  end if;

  select ay.workspace_id into year_workspace_id
  from public.academic_years ay
  where ay.id = new.academic_year_id;
  if year_workspace_id is null or year_workspace_id <> new.workspace_id then
    raise exception 'textbook academic year is outside workspace';
  end if;

  new.title := btrim(new.title);
  new.subtitle := nullif(btrim(coalesce(new.subtitle, '')), '');
  new.authors := nullif(btrim(coalesce(new.authors, '')), '');
  new.publisher := btrim(new.publisher);
  new.edition_label := nullif(btrim(coalesce(new.edition_label, '')), '');
  new.volume_label := nullif(btrim(coalesce(new.volume_label, '')), '');
  new.official_url := nullif(btrim(coalesce(new.official_url, '')), '');
  new.publisher_product_ref := nullif(btrim(coalesce(new.publisher_product_ref, '')), '');
  new.updated_at := now();
  return new;
end;
$$;

create trigger textbooks_enforce_invariants
before insert or update on public.textbooks
for each row execute function private.enforce_textbook_invariants();

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
  if tg_op = 'UPDATE' then
    if new.workspace_id <> old.workspace_id
      or new.academic_year_id <> old.academic_year_id
      or new.teaching_assignment_id <> old.teaching_assignment_id
      or new.textbook_id <> old.textbook_id
      or new.usage_kind <> old.usage_kind
      or new.created_by <> old.created_by then
      raise exception 'textbook adoption identity is immutable';
    end if;
    new.created_at := old.created_at;
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

  if new.status = 'PROPOSED' then
    new.confirmed_by := null;
    new.confirmed_at := null;
  elsif tg_op = 'INSERT' or old.status <> 'CONFIRMED' then
    if new.confirmed_by is null then
      new.confirmed_by := auth.uid();
    end if;
    if new.confirmed_at is null then
      new.confirmed_at := now();
    end if;
  end if;

  new.source_ref := nullif(btrim(coalesce(new.source_ref, '')), '');
  new.updated_at := now();
  return new;
end;
$$;

create trigger textbook_adoptions_enforce_invariants
before insert or update on public.textbook_adoptions
for each row execute function private.enforce_textbook_adoption_invariants();

alter table public.textbooks enable row level security;
alter table public.textbook_adoptions enable row level security;

create policy textbooks_select_member
  on public.textbooks for select to authenticated
  using (private.is_workspace_member(workspace_id));
create policy textbooks_insert_member
  on public.textbooks for insert to authenticated
  with check (private.is_workspace_member(workspace_id) and created_by = (select auth.uid()));
create policy textbooks_update_member
  on public.textbooks for update to authenticated
  using (private.is_workspace_member(workspace_id))
  with check (private.is_workspace_member(workspace_id));

create policy textbook_adoptions_select_member
  on public.textbook_adoptions for select to authenticated
  using (private.is_workspace_member(workspace_id));
create policy textbook_adoptions_insert_member
  on public.textbook_adoptions for insert to authenticated
  with check (private.is_workspace_member(workspace_id) and created_by = (select auth.uid()));
create policy textbook_adoptions_update_member
  on public.textbook_adoptions for update to authenticated
  using (private.is_workspace_member(workspace_id))
  with check (
    private.is_workspace_member(workspace_id)
    and (status <> 'CONFIRMED' or confirmed_by = (select auth.uid()))
  );

grant select, insert, update on public.textbooks to authenticated;
grant select, insert, update on public.textbook_adoptions to authenticated;
revoke all on public.textbooks from anon;
revoke all on public.textbook_adoptions from anon;

comment on table public.textbooks is 'Workspace/year textbook catalog. One ISBN may be reused by multiple teaching assignments without duplication.';
comment on table public.textbook_adoptions is 'Teacher-confirmed relationship between a canonical teaching assignment and a textbook; MIM data remains proposed until explicit confirmation.';
