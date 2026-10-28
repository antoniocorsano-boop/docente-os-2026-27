-- 0104_teaching_session_civic_education
-- QL2-A: Educazione civica is an optional transverse contribution on the real TeachingSession.

begin;

insert into private.runtime_schema_required_migrations(version, migration_id)
values (104, '0104_teaching_session_civic_education')
on conflict (version) do update
set migration_id = excluded.migration_id;

create table public.teaching_session_civic_contributions (
  session_id uuid not null references public.teaching_sessions(id) on delete restrict,
  minutes integer not null check (minutes > 0),
  evidence_note text null check (evidence_note is null or char_length(evidence_note) <= 4000),
  created_at timestamptz not null default now(),
  primary key (session_id)
);

create table public.teaching_session_civic_registration_receipts (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  section_id uuid not null references public.annual_plan_sections(id) on delete restrict,
  recorded_by uuid not null references auth.users(id) on delete restrict,
  registration_key uuid not null,
  request_signature text not null check (request_signature ~ '^[0-9a-f]{32}$'),
  session_id uuid not null references public.teaching_sessions(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (workspace_id, academic_year_id, section_id, recorded_by, registration_key),
  unique (session_id)
);

alter table public.teaching_session_civic_contributions enable row level security;
alter table public.teaching_session_civic_registration_receipts enable row level security;

drop policy if exists teaching_session_civic_contributions_select_member
  on public.teaching_session_civic_contributions;
create policy teaching_session_civic_contributions_select_member
on public.teaching_session_civic_contributions
for select
to authenticated
using (
  exists (
    select 1
    from public.teaching_sessions session
    where session.id = session_id
      and private.is_workspace_member(session.workspace_id)
  )
);

revoke insert, update, delete on public.teaching_session_civic_contributions from anon, authenticated;
revoke all on public.teaching_session_civic_registration_receipts from anon, authenticated;
grant select on public.teaching_session_civic_contributions to authenticated;

-- Both the historical and civic write boundaries must serialize the same
-- registration key before inspecting retry state. A transaction-scoped advisory
-- lock closes the race where a legacy first submission and a civic first
-- submission could otherwise observe each other as absent.
create or replace function private.lock_teaching_session_registration_key(
  target_workspace_id uuid,
  target_academic_year_id uuid,
  target_section_id uuid,
  target_recorded_by uuid,
  target_registration_key uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      target_workspace_id::text || ':' ||
      target_academic_year_id::text || ':' ||
      target_section_id::text || ':' ||
      target_recorded_by::text || ':' ||
      target_registration_key::text,
      0
    )
  );
end;
$$;

revoke all on function private.lock_teaching_session_registration_key(uuid,uuid,uuid,uuid,uuid)
  from public, anon, authenticated;

-- The civic composite authorizes only its nested call through the historical
-- public wrapper. Direct authenticated callers never receive access to this
-- transaction-scoped marker.
create table private.teaching_session_civic_atomic_authorizations (
  transaction_id bigint not null,
  actor_id uuid not null,
  registration_key uuid not null,
  created_at timestamptz not null default clock_timestamp(),
  primary key (transaction_id, actor_id, registration_key)
);

revoke all on private.teaching_session_civic_atomic_authorizations from public, anon, authenticated;

-- Harden the historical compatibility wrapper without changing its signature.
-- It retains TE-1A authorization semantics, serializes keyed writes, and refuses
-- a direct keyed retry that would omit an already-recorded civic contribution.
create or replace function public.record_teaching_session(
  target_workspace_id uuid,
  target_academic_year_id uuid,
  target_section_id uuid,
  target_discipline_id uuid,
  target_local_date date,
  target_planned_start_time time,
  target_planned_end_time time,
  target_planned_minutes integer,
  target_actual_minutes integer,
  target_evidence_note text,
  target_source_kind text,
  target_projected_occurrence_logical_id text,
  target_source_timetable_version_id uuid,
  target_source_timetable_slot_id uuid,
  target_source_calendar_state text,
  target_source_provenance text[],
  target_supersedes_session_id uuid,
  target_allocations jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  atomic_marker_count integer := 0;
  registration_marker_count integer := 0;
  registration_key_text text;
  registration_key_value uuid;
  existing_session_id uuid;
begin
  if actor is null then raise exception 'authenticated user required'; end if;

  select count(*)
    into atomic_marker_count
  from unnest(coalesce(target_source_provenance, '{}'::text[])) as item
  where left(item, 25) = 'teaching_evidence_atomic:';

  if atomic_marker_count > 0 and not exists (
    select 1
    from private.teaching_evidence_atomic_authorizations authorization
    where authorization.transaction_id = txid_current()
      and authorization.actor_id = actor
  ) then
    raise exception 'teaching evidence atomic provenance marker is reserved';
  end if;

  select count(*), min(split_part(item, ':', 2))
    into registration_marker_count, registration_key_text
  from unnest(coalesce(target_source_provenance, '{}'::text[])) as item
  where left(item, 17) = 'registration_key:';

  if registration_marker_count > 1 then
    raise exception 'multiple teaching session registration keys are not allowed';
  end if;

  if registration_marker_count = 1 then
    begin
      registration_key_value := registration_key_text::uuid;
    exception when invalid_text_representation then
      raise exception 'invalid teaching session registration key';
    end;

    perform private.lock_teaching_session_registration_key(
      target_workspace_id,
      target_academic_year_id,
      target_section_id,
      actor,
      registration_key_value
    );

    select receipt.session_id
      into existing_session_id
    from public.teaching_session_registration_receipts receipt
    where receipt.workspace_id = target_workspace_id
      and receipt.academic_year_id = target_academic_year_id
      and receipt.section_id = target_section_id
      and receipt.recorded_by = actor
      and receipt.registration_key = registration_key_value;

    if existing_session_id is not null
       and exists (
         select 1
         from public.teaching_session_civic_contributions contribution
         where contribution.session_id = existing_session_id
       )
       and not exists (
         select 1
         from private.teaching_session_civic_atomic_authorizations authorization
         where authorization.transaction_id = txid_current()
           and authorization.actor_id = actor
           and authorization.registration_key = registration_key_value
       ) then
      raise exception 'teaching session with civic contribution requires composite retry boundary';
    end if;
  end if;

  return private.record_teaching_session(
    target_workspace_id,
    target_academic_year_id,
    target_section_id,
    target_discipline_id,
    target_local_date,
    target_planned_start_time,
    target_planned_end_time,
    target_planned_minutes,
    target_actual_minutes,
    target_evidence_note,
    target_source_kind,
    target_projected_occurrence_logical_id,
    target_source_timetable_version_id,
    target_source_timetable_slot_id,
    target_source_calendar_state,
    target_source_provenance,
    target_supersedes_session_id,
    target_allocations
  );
end;
$$;

revoke all on function public.record_teaching_session(
  uuid,uuid,uuid,uuid,date,time,time,integer,integer,text,text,text,uuid,uuid,text,text[],uuid,jsonb
) from public, anon;
grant execute on function public.record_teaching_session(
  uuid,uuid,uuid,uuid,date,time,time,integer,integer,text,text,text,uuid,uuid,text,text[],uuid,jsonb
) to authenticated;

create or replace function public.record_teaching_session_with_civic_contribution(
  target_workspace_id uuid,
  target_academic_year_id uuid,
  target_section_id uuid,
  target_discipline_id uuid,
  target_local_date date,
  target_planned_start_time time,
  target_planned_end_time time,
  target_planned_minutes integer,
  target_actual_minutes integer,
  target_evidence_note text,
  target_source_kind text,
  target_projected_occurrence_logical_id text,
  target_source_timetable_version_id uuid,
  target_source_timetable_slot_id uuid,
  target_source_calendar_state text,
  target_source_provenance text[],
  target_supersedes_session_id uuid,
  target_allocations jsonb,
  target_civic_education_minutes integer,
  target_civic_education_evidence_note text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  recorded_session_id_value uuid;
  registration_marker_count integer := 0;
  registration_key_text text;
  registration_key_value uuid;
  normalized_civic_evidence_note text;
  computed_signature text;
  stored_signature text;
  stored_session_id uuid;
  stored_civic_minutes integer;
  stored_civic_evidence_note text;
  preexisting_registration_session_id uuid;
  preexisting_civic_receipt_session_id uuid;
begin
  if actor is null then raise exception 'authenticated user required'; end if;

  normalized_civic_evidence_note := nullif(btrim(coalesce(target_civic_education_evidence_note, '')), '');

  if normalized_civic_evidence_note is not null
     and char_length(normalized_civic_evidence_note) > 4000 then
    raise exception 'civic education evidence note is too long';
  end if;

  if target_civic_education_minutes is null then
    if normalized_civic_evidence_note is not null then
      raise exception 'civic education minutes are required when evidence is present';
    end if;
  elsif target_civic_education_minutes <= 0
     or target_civic_education_minutes > target_actual_minutes then
    raise exception 'invalid civic education minutes';
  end if;

  select count(*), min(split_part(item, ':', 2))
    into registration_marker_count, registration_key_text
  from unnest(coalesce(target_source_provenance, '{}'::text[])) as item
  where left(item, 17) = 'registration_key:';

  if registration_marker_count > 1 then
    raise exception 'multiple teaching session registration keys are not allowed';
  end if;

  if registration_marker_count = 1 then
    begin
      registration_key_value := registration_key_text::uuid;
    exception when invalid_text_representation then
      raise exception 'invalid teaching session registration key';
    end;

    perform private.lock_teaching_session_registration_key(
      target_workspace_id,
      target_academic_year_id,
      target_section_id,
      actor,
      registration_key_value
    );

    computed_signature := md5(concat_ws(chr(31),
      actor::text,
      target_workspace_id::text,
      target_academic_year_id::text,
      target_section_id::text,
      registration_key_value::text,
      coalesce(target_civic_education_minutes::text, ''),
      coalesce(normalized_civic_evidence_note, '')
    ));

    select receipt.session_id
      into preexisting_registration_session_id
    from public.teaching_session_registration_receipts receipt
    where receipt.workspace_id = target_workspace_id
      and receipt.academic_year_id = target_academic_year_id
      and receipt.section_id = target_section_id
      and receipt.recorded_by = actor
      and receipt.registration_key = registration_key_value;

    select receipt.session_id
      into preexisting_civic_receipt_session_id
    from public.teaching_session_civic_registration_receipts receipt
    where receipt.workspace_id = target_workspace_id
      and receipt.academic_year_id = target_academic_year_id
      and receipt.section_id = target_section_id
      and receipt.recorded_by = actor
      and receipt.registration_key = registration_key_value;

    if preexisting_registration_session_id is not null
       and preexisting_civic_receipt_session_id is null
       and target_civic_education_minutes is not null then
      raise exception 'teaching session cannot gain civic education on retry';
    end if;

    insert into private.teaching_session_civic_atomic_authorizations(
      transaction_id,
      actor_id,
      registration_key
    ) values (
      txid_current(),
      actor,
      registration_key_value
    )
    on conflict do nothing;
  end if;

  begin
    recorded_session_id_value := public.record_teaching_session(
      target_workspace_id,
      target_academic_year_id,
      target_section_id,
      target_discipline_id,
      target_local_date,
      target_planned_start_time,
      target_planned_end_time,
      target_planned_minutes,
      target_actual_minutes,
      target_evidence_note,
      target_source_kind,
      target_projected_occurrence_logical_id,
      target_source_timetable_version_id,
      target_source_timetable_slot_id,
      target_source_calendar_state,
      target_source_provenance,
      target_supersedes_session_id,
      target_allocations
    );
  exception when others then
    if registration_key_value is not null then
      delete from private.teaching_session_civic_atomic_authorizations authorization
      where authorization.transaction_id = txid_current()
        and authorization.actor_id = actor
        and authorization.registration_key = registration_key_value;
    end if;
    raise;
  end;

  if registration_key_value is not null then
    delete from private.teaching_session_civic_atomic_authorizations authorization
    where authorization.transaction_id = txid_current()
      and authorization.actor_id = actor
      and authorization.registration_key = registration_key_value;

    insert into public.teaching_session_civic_registration_receipts (
      workspace_id,
      academic_year_id,
      section_id,
      recorded_by,
      registration_key,
      request_signature,
      session_id
    ) values (
      target_workspace_id,
      target_academic_year_id,
      target_section_id,
      actor,
      registration_key_value,
      computed_signature,
      recorded_session_id_value
    )
    on conflict (workspace_id, academic_year_id, section_id, recorded_by, registration_key)
    do nothing;

    select receipt.session_id, receipt.request_signature
      into stored_session_id, stored_signature
    from public.teaching_session_civic_registration_receipts receipt
    where receipt.workspace_id = target_workspace_id
      and receipt.academic_year_id = target_academic_year_id
      and receipt.section_id = target_section_id
      and receipt.recorded_by = actor
      and receipt.registration_key = registration_key_value
    for update;

    if stored_session_id is null
       or stored_session_id <> recorded_session_id_value
       or stored_signature is distinct from computed_signature then
      raise exception 'teaching session registration key reused with different civic education payload';
    end if;
  end if;

  if target_civic_education_minutes is not null then
    insert into public.teaching_session_civic_contributions (
      session_id,
      minutes,
      evidence_note
    ) values (
      recorded_session_id_value,
      target_civic_education_minutes,
      normalized_civic_evidence_note
    )
    on conflict (session_id) do nothing;

    select contribution.minutes, contribution.evidence_note
      into stored_civic_minutes, stored_civic_evidence_note
    from public.teaching_session_civic_contributions contribution
    where contribution.session_id = recorded_session_id_value
    for update;

    if stored_civic_minutes is distinct from target_civic_education_minutes
       or stored_civic_evidence_note is distinct from normalized_civic_evidence_note then
      raise exception 'teaching session civic contribution already exists with different payload';
    end if;
  elsif exists (
    select 1
    from public.teaching_session_civic_contributions contribution
    where contribution.session_id = recorded_session_id_value
  ) then
    raise exception 'teaching session civic contribution already exists with different payload';
  end if;

  return recorded_session_id_value;
end;
$$;

revoke all on function public.record_teaching_session_with_civic_contribution(uuid,uuid,uuid,uuid,date,time,time,integer,integer,text,text,text,uuid,uuid,text,text[],uuid,jsonb,integer,text)
  from public, anon;
grant execute on function public.record_teaching_session_with_civic_contribution(uuid,uuid,uuid,uuid,date,time,time,integer,integer,text,text,text,uuid,uuid,text,text[],uuid,jsonb,integer,text)
  to authenticated;

comment on table public.teaching_session_civic_contributions is
  'Optional Educazione civica minute contribution attached 1:1 to an immutable real TeachingSession. It never creates a teaching assignment or timetable occurrence.';
comment on table public.teaching_session_civic_registration_receipts is
  'Internal retry receipt binding the TeachingSession registration key to the optional civic-education payload.';
comment on table private.teaching_session_civic_atomic_authorizations is
  'Transaction-scoped authority allowing only the QL2-A composite to traverse the historical TeachingSession retry boundary for a civic session.';
comment on function private.lock_teaching_session_registration_key(uuid,uuid,uuid,uuid,uuid) is
  'Serializes historical and QL2-A composite writes that share one TeachingSession registration key.';
comment on function public.record_teaching_session(
  uuid,uuid,uuid,uuid,date,time,time,integer,integer,text,text,text,uuid,uuid,text,text[],uuid,jsonb
) is
  'Public TeachingSession compatibility wrapper. It preserves TE-1A authorization, serializes registration keys, and requires the QL2-A composite for retries of sessions carrying civic contributions.';
comment on function public.record_teaching_session_with_civic_contribution(uuid,uuid,uuid,uuid,date,time,time,integer,integer,text,text,text,uuid,uuid,text,text[],uuid,jsonb,integer,text) is
  'Atomic QL2-A write boundary: serializes the registration key, delegates the real lesson through the protected historical boundary, then binds the optional transverse Educazione civica contribution in the same transaction.';

select private.advance_runtime_schema_contract(
  '0104_teaching_session_civic_education'
);

commit;
