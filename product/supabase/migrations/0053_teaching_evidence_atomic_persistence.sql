begin;

create table public.teaching_observations (
  id uuid primary key default gen_random_uuid(),
  teaching_session_id uuid not null references public.teaching_sessions(id) on delete restrict,
  ordinal integer not null check (ordinal >= 0),
  scope text not null check (scope in ('CLASS','ANONYMOUS_GROUP')),
  anonymous_group_key text null check (anonymous_group_key is null or char_length(anonymous_group_key) between 1 and 120),
  dimension_key text not null check (dimension_key in (
    'UNDERSTANDING_INSTRUCTION','AUTONOMY','WORK_METHOD','TECHNICAL_LANGUAGE',
    'DISCIPLINARY_APPLICATION','EVIDENCE_QUALITY','TIME_MANAGEMENT'
  )),
  state text not null check (state in ('NOT_OBSERVED','NEEDS_SUPPORT','DEVELOPING','CONSOLIDATED')),
  note text null check (note is null or char_length(note) <= 1000),
  source text not null check (source in ('TEACHER_QUICK_MARK','TEACHER_NOTE','EVIDENCE_REVIEW')),
  recorded_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint teaching_observations_scope_ck check (
    (scope = 'CLASS' and anonymous_group_key is null)
    or (scope = 'ANONYMOUS_GROUP' and anonymous_group_key is not null)
  ),
  constraint teaching_observations_session_ordinal_uq unique (teaching_session_id, ordinal)
);

create unique index teaching_observations_dimension_uq
  on public.teaching_observations(
    teaching_session_id,
    scope,
    coalesce(anonymous_group_key, ''),
    dimension_key
  );
create index idx_teaching_observations_session on public.teaching_observations(teaching_session_id, ordinal);
create index idx_teaching_observations_dimension on public.teaching_observations(dimension_key, state);

create table public.teaching_evidence_references (
  id uuid primary key default gen_random_uuid(),
  teaching_session_id uuid not null references public.teaching_sessions(id) on delete restrict,
  ordinal integer not null check (ordinal >= 0),
  kind text not null check (kind in ('WORK_PRODUCT','QUICK_CHECK','ORAL_RESPONSE','CLASS_ACTIVITY','DOCUMENT_REFERENCE','OTHER')),
  description text not null check (char_length(btrim(description)) between 1 and 1000),
  knowledge_asset_id uuid null references public.knowledge_assets(id) on delete restrict,
  external_reference text null check (external_reference is null or char_length(external_reference) <= 1000),
  recorded_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint teaching_evidence_references_session_ordinal_uq unique (teaching_session_id, ordinal)
);

create index idx_teaching_evidence_references_session on public.teaching_evidence_references(teaching_session_id, ordinal);
create index idx_teaching_evidence_references_asset on public.teaching_evidence_references(knowledge_asset_id)
  where knowledge_asset_id is not null;

create table public.teaching_evidence_observation_links (
  evidence_reference_id uuid not null references public.teaching_evidence_references(id) on delete restrict,
  observation_id uuid not null references public.teaching_observations(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (evidence_reference_id, observation_id)
);

create index idx_teaching_evidence_observation_links_observation
  on public.teaching_evidence_observation_links(observation_id);

create table public.teaching_session_evidence_receipts (
  teaching_session_id uuid primary key references public.teaching_sessions(id) on delete restrict,
  recorded_by uuid not null references auth.users(id) on delete restrict,
  registration_key uuid not null,
  request_signature text not null check (request_signature ~ '^[0-9a-f]{32}$'),
  observation_ids uuid[] not null default '{}',
  evidence_reference_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

create unique index teaching_session_evidence_receipts_actor_key_uq
  on public.teaching_session_evidence_receipts(recorded_by, registration_key);

create or replace function private.enforce_teaching_evidence_link_session()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  evidence_session uuid;
  observation_session uuid;
begin
  select teaching_session_id into evidence_session
  from public.teaching_evidence_references
  where id = new.evidence_reference_id;

  select teaching_session_id into observation_session
  from public.teaching_observations
  where id = new.observation_id;

  if evidence_session is null or observation_session is null or evidence_session <> observation_session then
    raise exception 'teaching evidence link must stay within one teaching session';
  end if;
  return new;
end;
$$;

create trigger teaching_evidence_observation_links_same_session
before insert on public.teaching_evidence_observation_links
for each row execute function private.enforce_teaching_evidence_link_session();

alter table public.teaching_observations enable row level security;
alter table public.teaching_evidence_references enable row level security;
alter table public.teaching_evidence_observation_links enable row level security;
alter table public.teaching_session_evidence_receipts enable row level security;

create policy teaching_observations_select_member on public.teaching_observations
for select to authenticated using (
  exists (
    select 1 from public.teaching_sessions s
    where s.id = teaching_session_id and private.is_workspace_member(s.workspace_id)
  )
);

create policy teaching_evidence_references_select_member on public.teaching_evidence_references
for select to authenticated using (
  exists (
    select 1 from public.teaching_sessions s
    where s.id = teaching_session_id and private.is_workspace_member(s.workspace_id)
  )
);

create policy teaching_evidence_observation_links_select_member on public.teaching_evidence_observation_links
for select to authenticated using (
  exists (
    select 1
    from public.teaching_evidence_references e
    join public.teaching_sessions s on s.id = e.teaching_session_id
    where e.id = evidence_reference_id and private.is_workspace_member(s.workspace_id)
  )
);

revoke all on public.teaching_observations from anon, authenticated;
revoke all on public.teaching_evidence_references from anon, authenticated;
revoke all on public.teaching_evidence_observation_links from anon, authenticated;
revoke all on public.teaching_session_evidence_receipts from anon, authenticated;
grant select on public.teaching_observations to authenticated;
grant select on public.teaching_evidence_references to authenticated;
grant select on public.teaching_evidence_observation_links to authenticated;

create or replace function public.record_teaching_session_with_evidence(
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
  target_observations jsonb,
  target_evidence_references jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  session_id uuid;
  existing_session_id uuid;
  registration_marker_count integer := 0;
  registration_key_text text;
  registration_key uuid;
  computed_signature text;
  stored_signature text;
  stored_observation_ids uuid[];
  stored_evidence_reference_ids uuid[];
  observation jsonb;
  evidence jsonb;
  linked_draft_key jsonb;
  observation_id_by_draft_key jsonb := '{}'::jsonb;
  observation_ids uuid[] := '{}';
  evidence_reference_ids uuid[] := '{}';
  new_observation_id uuid;
  new_evidence_id uuid;
  draft_key text;
  scope_value text;
  group_key text;
  dimension_value text;
  state_value text;
  source_value text;
  note_value text;
  kind_value text;
  description_value text;
  asset_id uuid;
  external_value text;
  asset_workspace uuid;
  asset_year uuid;
  observation_ordinal integer := 0;
  evidence_ordinal integer := 0;
begin
  if actor is null then raise exception 'authenticated user required'; end if;
  if not private.is_workspace_member(target_workspace_id) then raise exception 'workspace membership required'; end if;
  if jsonb_typeof(target_observations) <> 'array' then raise exception 'teaching observations must be an array'; end if;
  if jsonb_typeof(target_evidence_references) <> 'array' then raise exception 'teaching evidence references must be an array'; end if;
  if jsonb_array_length(target_observations) = 0 and jsonb_array_length(target_evidence_references) = 0 then
    raise exception 'teaching evidence payload required';
  end if;

  select count(*), min(split_part(item, ':', 2))
    into registration_marker_count, registration_key_text
  from unnest(coalesce(target_source_provenance, '{}'::text[])) as item
  where left(item, 17) = 'registration_key:';

  if registration_marker_count <> 1 then
    raise exception 'exactly one teaching session registration key is required for atomic evidence persistence';
  end if;
  begin
    registration_key := registration_key_text::uuid;
  exception when invalid_text_representation then
    raise exception 'invalid teaching session registration key';
  end;

  computed_signature := md5(concat_ws(chr(31),
    actor::text,
    registration_key::text,
    target_observations::text,
    target_evidence_references::text
  ));

  select r.session_id into existing_session_id
  from public.teaching_session_registration_receipts r
  where r.workspace_id = target_workspace_id
    and r.academic_year_id = target_academic_year_id
    and r.section_id = target_section_id
    and r.recorded_by = actor
    and r.registration_key = registration_key;

  if existing_session_id is not null then
    select request_signature, observation_ids, evidence_reference_ids
      into stored_signature, stored_observation_ids, stored_evidence_reference_ids
    from public.teaching_session_evidence_receipts
    where teaching_session_id = existing_session_id;

    if stored_signature is null then
      raise exception 'registration key already used outside atomic teaching evidence boundary';
    end if;
    if stored_signature <> computed_signature then
      raise exception 'teaching evidence registration key reused with different payload';
    end if;
    return jsonb_build_object(
      'teaching_session_id', existing_session_id,
      'observation_ids', to_jsonb(stored_observation_ids),
      'evidence_reference_ids', to_jsonb(stored_evidence_reference_ids)
    );
  end if;

  session_id := public.record_teaching_session(
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

  select request_signature, observation_ids, evidence_reference_ids
    into stored_signature, stored_observation_ids, stored_evidence_reference_ids
  from public.teaching_session_evidence_receipts
  where teaching_session_id = session_id;

  if stored_signature is not null then
    if stored_signature <> computed_signature then
      raise exception 'teaching evidence registration key reused with different payload';
    end if;
    return jsonb_build_object(
      'teaching_session_id', session_id,
      'observation_ids', to_jsonb(stored_observation_ids),
      'evidence_reference_ids', to_jsonb(stored_evidence_reference_ids)
    );
  end if;

  for observation in select value from jsonb_array_elements(target_observations) loop
    draft_key := btrim(coalesce(observation->>'draft_key', ''));
    scope_value := observation->>'scope';
    group_key := nullif(btrim(coalesce(observation->>'anonymous_group_key', '')), '');
    dimension_value := observation->>'dimension_key';
    state_value := observation->>'state';
    source_value := observation->>'source';
    note_value := nullif(btrim(coalesce(observation->>'note', '')), '');

    if draft_key = '' or char_length(draft_key) > 120 then raise exception 'invalid observation draft key'; end if;
    if observation_id_by_draft_key ? draft_key then raise exception 'duplicate observation draft key'; end if;
    if scope_value not in ('CLASS','ANONYMOUS_GROUP') then raise exception 'invalid observation scope'; end if;
    if (scope_value = 'CLASS' and group_key is not null)
      or (scope_value = 'ANONYMOUS_GROUP' and group_key is null) then
      raise exception 'invalid anonymous group observation scope';
    end if;
    if group_key is not null and char_length(group_key) > 120 then raise exception 'anonymous group key too long'; end if;
    if dimension_value not in (
      'UNDERSTANDING_INSTRUCTION','AUTONOMY','WORK_METHOD','TECHNICAL_LANGUAGE',
      'DISCIPLINARY_APPLICATION','EVIDENCE_QUALITY','TIME_MANAGEMENT'
    ) then raise exception 'invalid observation dimension'; end if;
    if state_value not in ('NOT_OBSERVED','NEEDS_SUPPORT','DEVELOPING','CONSOLIDATED') then raise exception 'invalid observation state'; end if;
    if source_value not in ('TEACHER_QUICK_MARK','TEACHER_NOTE','EVIDENCE_REVIEW') then raise exception 'invalid observation source'; end if;
    if note_value is not null and char_length(note_value) > 1000 then raise exception 'observation note too long'; end if;

    new_observation_id := gen_random_uuid();
    insert into public.teaching_observations (
      id, teaching_session_id, ordinal, scope, anonymous_group_key, dimension_key,
      state, note, source, recorded_by
    ) values (
      new_observation_id, session_id, observation_ordinal, scope_value, group_key, dimension_value,
      state_value, note_value, source_value, actor
    );
    observation_id_by_draft_key := observation_id_by_draft_key || jsonb_build_object(draft_key, new_observation_id::text);
    observation_ids := array_append(observation_ids, new_observation_id);
    observation_ordinal := observation_ordinal + 1;
  end loop;

  for evidence in select value from jsonb_array_elements(target_evidence_references) loop
    kind_value := evidence->>'kind';
    description_value := btrim(coalesce(evidence->>'description', ''));
    external_value := nullif(btrim(coalesce(evidence->>'external_reference', '')), '');

    if kind_value not in ('WORK_PRODUCT','QUICK_CHECK','ORAL_RESPONSE','CLASS_ACTIVITY','DOCUMENT_REFERENCE','OTHER') then
      raise exception 'invalid teaching evidence kind';
    end if;
    if description_value = '' or char_length(description_value) > 1000 then raise exception 'invalid teaching evidence description'; end if;
    if external_value is not null and char_length(external_value) > 1000 then raise exception 'teaching evidence external reference too long'; end if;

    asset_id := null;
    if nullif(evidence->>'knowledge_asset_id', '') is not null then
      begin
        asset_id := (evidence->>'knowledge_asset_id')::uuid;
      exception when invalid_text_representation then
        raise exception 'invalid teaching evidence knowledge asset id';
      end;
      select workspace_id, academic_year_id into asset_workspace, asset_year
      from public.knowledge_assets where id = asset_id;
      if asset_workspace is null or asset_workspace <> target_workspace_id
        or (asset_year is not null and asset_year <> target_academic_year_id) then
        raise exception 'teaching evidence knowledge asset is outside workspace/year';
      end if;
    end if;

    if jsonb_typeof(coalesce(evidence->'observation_draft_keys', '[]'::jsonb)) <> 'array' then
      raise exception 'teaching evidence observation links must be an array';
    end if;

    new_evidence_id := gen_random_uuid();
    insert into public.teaching_evidence_references (
      id, teaching_session_id, ordinal, kind, description, knowledge_asset_id,
      external_reference, recorded_by
    ) values (
      new_evidence_id, session_id, evidence_ordinal, kind_value, description_value, asset_id,
      external_value, actor
    );
    evidence_reference_ids := array_append(evidence_reference_ids, new_evidence_id);

    for linked_draft_key in select value from jsonb_array_elements(coalesce(evidence->'observation_draft_keys', '[]'::jsonb)) loop
      draft_key := btrim(trim(both '"' from linked_draft_key::text));
      if draft_key = '' or not (observation_id_by_draft_key ? draft_key) then
        raise exception 'teaching evidence references unknown observation draft key';
      end if;
      insert into public.teaching_evidence_observation_links(evidence_reference_id, observation_id)
      values (new_evidence_id, (observation_id_by_draft_key->>draft_key)::uuid);
    end loop;
    evidence_ordinal := evidence_ordinal + 1;
  end loop;

  insert into public.teaching_session_evidence_receipts (
    teaching_session_id, recorded_by, registration_key, request_signature,
    observation_ids, evidence_reference_ids
  ) values (
    session_id, actor, registration_key, computed_signature,
    observation_ids, evidence_reference_ids
  );

  return jsonb_build_object(
    'teaching_session_id', session_id,
    'observation_ids', to_jsonb(observation_ids),
    'evidence_reference_ids', to_jsonb(evidence_reference_ids)
  );
end;
$$;

revoke all on function public.record_teaching_session_with_evidence(
  uuid,uuid,uuid,uuid,date,time,time,integer,integer,text,text,text,uuid,uuid,text,text[],uuid,jsonb,jsonb,jsonb
) from public, anon;
grant execute on function public.record_teaching_session_with_evidence(
  uuid,uuid,uuid,uuid,date,time,time,integer,integer,text,text,text,uuid,uuid,text,text[],uuid,jsonb,jsonb,jsonb
) to authenticated;

comment on table public.teaching_observations is
  'Append-only Tier 1 professional observations anchored to an authoritative TeachingSession. No individual student identifiers or numeric scoring.';
comment on table public.teaching_evidence_references is
  'Append-only references to non-personal teaching evidence. Assets are referenced, never duplicated.';
comment on table public.teaching_session_evidence_receipts is
  'Internal idempotency receipts for atomic TeachingSession + Observation + EvidenceReference registration. No direct authenticated access.';
comment on function public.record_teaching_session_with_evidence(
  uuid,uuid,uuid,uuid,date,time,time,integer,integer,text,text,text,uuid,uuid,text,text[],uuid,jsonb,jsonb,jsonb
) is
  'TE-1A atomic boundary. Reuses record_teaching_session in the same transaction, resolves ephemeral observation draft keys, persists explicit evidence links, and fails closed on retry payload drift.';

commit;
