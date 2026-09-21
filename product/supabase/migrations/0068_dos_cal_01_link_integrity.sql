begin;

update public.knowledge_units as ku
set validation_status = 'AUTO'
where ku.validation_status = 'REVIEWED'
  and exists (
    select 1
    from public.knowledge_links as kl
    where kl.workspace_id = ku.workspace_id
      and kl.unit_id = ku.id
      and kl.relation_type = 'CREATED_CALENDAR_EVENT'
      and kl.target_type = 'CALENDAR_EVENT'
      and not exists (
        select 1
        from public.calendar_events as ce
        where ce.workspace_id = kl.workspace_id
          and ce.id::text = kl.target_ref
          and ce.source_knowledge_unit_id = kl.unit_id
      )
  );

delete from public.knowledge_links as kl
where kl.relation_type = 'CREATED_CALENDAR_EVENT'
  and kl.target_type = 'CALENDAR_EVENT'
  and kl.unit_id is not null
  and not exists (
    select 1
    from public.calendar_events as ce
    where ce.workspace_id = kl.workspace_id
      and ce.id::text = kl.target_ref
      and ce.source_knowledge_unit_id = kl.unit_id
  );

with ranked as (
  select id,
    row_number() over (
      partition by workspace_id, unit_id, relation_type, target_type
      order by created_at, id
    ) as rn
  from public.knowledge_links
  where relation_type = 'CREATED_CALENDAR_EVENT'
    and target_type = 'CALENDAR_EVENT'
    and unit_id is not null
)
delete from public.knowledge_links as kl
using ranked
where kl.id = ranked.id
  and ranked.rn > 1;

create unique index if not exists uq_knowledge_links_calendar_event_unit
  on public.knowledge_links(workspace_id, unit_id, relation_type, target_type)
  where unit_id is not null
    and relation_type = 'CREATED_CALENDAR_EVENT'
    and target_type = 'CALENDAR_EVENT';

create or replace function private.enforce_calendar_event_knowledge_source()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  source_workspace_id uuid;
  source_unit_type text;
  source_academic_year_id uuid;
begin
  new.location := nullif(btrim(coalesce(new.location, '')), '');

  if tg_op = 'UPDATE' and new.source_knowledge_unit_id is distinct from old.source_knowledge_unit_id then
    raise exception 'calendar event knowledge source is immutable';
  end if;

  if new.source_knowledge_unit_id is null then
    return new;
  end if;

  select ku.workspace_id, ku.unit_type, ka.academic_year_id
    into source_workspace_id, source_unit_type, source_academic_year_id
  from public.knowledge_units as ku
  join public.knowledge_documents as kd on kd.id = ku.document_id
  join public.knowledge_assets as ka on ka.id = kd.asset_id
  where ku.id = new.source_knowledge_unit_id;

  if source_workspace_id is null or source_workspace_id <> new.workspace_id then
    raise exception 'calendar event knowledge source is outside workspace';
  end if;

  if source_unit_type <> 'DEADLINE' then
    raise exception 'calendar event knowledge source must be a deadline proposal';
  end if;

  if source_academic_year_id is null or source_academic_year_id <> new.academic_year_id then
    raise exception 'calendar event knowledge source must belong to the same academic year';
  end if;

  if new.source_kind <> 'INSTITUTION_DOCUMENT' then
    raise exception 'knowledge-derived calendar event must preserve institutional document provenance';
  end if;

  return new;
end;
$$;

create or replace function private.cleanup_calendar_event_knowledge_source()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.source_knowledge_unit_id is null then
    return old;
  end if;

  delete from public.knowledge_links
  where workspace_id = old.workspace_id
    and unit_id = old.source_knowledge_unit_id
    and relation_type = 'CREATED_CALENDAR_EVENT'
    and target_type = 'CALENDAR_EVENT'
    and target_ref = old.id::text;

  update public.knowledge_units
  set validation_status = 'AUTO'
  where id = old.source_knowledge_unit_id
    and workspace_id = old.workspace_id
    and validation_status = 'REVIEWED';

  return old;
end;
$$;

drop trigger if exists calendar_events_cleanup_knowledge_source on public.calendar_events;
create trigger calendar_events_cleanup_knowledge_source
after delete on public.calendar_events
for each row execute function private.cleanup_calendar_event_knowledge_source();

comment on index public.uq_knowledge_links_calendar_event_unit is
  'At most one CREATED_CALENDAR_EVENT link may exist for a Knowledge unit in a workspace.';

commit;
