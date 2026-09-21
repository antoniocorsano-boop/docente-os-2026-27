begin;

alter table public.calendar_events
  add column if not exists location text null,
  add column if not exists source_knowledge_unit_id uuid null references public.knowledge_units(id) on delete restrict;

alter table public.calendar_events
  drop constraint if exists calendar_events_location_ck;
alter table public.calendar_events
  add constraint calendar_events_location_ck check (location is null or char_length(btrim(location)) between 1 and 500);

create unique index if not exists uq_calendar_events_knowledge_unit
  on public.calendar_events(workspace_id, source_knowledge_unit_id)
  where source_knowledge_unit_id is not null;

create or replace function private.enforce_calendar_event_knowledge_source()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  source_workspace_id uuid;
  source_unit_type text;
begin
  new.location := nullif(btrim(coalesce(new.location, '')), '');

  if tg_op = 'UPDATE' and new.source_knowledge_unit_id is distinct from old.source_knowledge_unit_id then
    raise exception 'calendar event knowledge source is immutable';
  end if;

  if new.source_knowledge_unit_id is null then
    return new;
  end if;

  select workspace_id, unit_type into source_workspace_id, source_unit_type
  from public.knowledge_units
  where id = new.source_knowledge_unit_id;

  if source_workspace_id is null or source_workspace_id <> new.workspace_id then
    raise exception 'calendar event knowledge source is outside workspace';
  end if;

  if source_unit_type <> 'DEADLINE' then
    raise exception 'calendar event knowledge source must be a deadline proposal';
  end if;

  if new.source_kind <> 'INSTITUTION_DOCUMENT' then
    raise exception 'knowledge-derived calendar event must preserve institutional document provenance';
  end if;

  return new;
end;
$$;

drop trigger if exists calendar_events_enforce_knowledge_source on public.calendar_events;
create trigger calendar_events_enforce_knowledge_source
before insert or update on public.calendar_events
for each row execute function private.enforce_calendar_event_knowledge_source();

comment on column public.calendar_events.source_knowledge_unit_id is
  'Teacher-confirmed source unit for a calendar event proposed from Knowledge; unique for idempotent confirmation.';

commit;
