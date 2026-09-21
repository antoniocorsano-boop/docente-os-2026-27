begin;

do $patch$
declare
  base_def text;
  evidence_def text;
begin
  select pg_get_functiondef(
    'private.record_teaching_session(uuid,uuid,uuid,uuid,date,time without time zone,time without time zone,integer,integer,text,text,text,uuid,uuid,text,text[],uuid,jsonb)'::regprocedure
  ) into base_def;

  base_def := replace(base_def, '  registration_key uuid;', '  local_registration_key uuid;');
  base_def := replace(base_def, 'registration_key := registration_key_text::uuid;', 'local_registration_key := registration_key_text::uuid;');
  base_def := replace(base_def, 'r.registration_key = registration_key', 'r.registration_key = local_registration_key');
  base_def := replace(base_def, 'registration_key::text', 'local_registration_key::text');
  base_def := replace(base_def, 'if registration_key is not null', 'if local_registration_key is not null');
  base_def := replace(base_def, 'if registration_key is null', 'if local_registration_key is null');
  base_def := replace(base_def, 'registration_key, computed_signature, session_id', 'local_registration_key, computed_signature, session_id');

  if position('  registration_key uuid;' in base_def) > 0
     or position('r.registration_key = registration_key' in base_def) > 0 then
    raise exception 'TE-1A base function disambiguation incomplete';
  end if;

  execute base_def;

  select pg_get_functiondef(
    'private.record_teaching_session_with_evidence(uuid,uuid,uuid,uuid,date,time without time zone,time without time zone,integer,integer,text,text,text,uuid,uuid,text,text[],uuid,jsonb,jsonb,jsonb)'::regprocedure
  ) into evidence_def;

  evidence_def := replace(evidence_def, '  registration_key uuid;', '  local_registration_key uuid;');
  evidence_def := replace(evidence_def, 'registration_key := registration_key_text::uuid;', 'local_registration_key := registration_key_text::uuid;');
  evidence_def := replace(evidence_def, 'registration_key::text', 'local_registration_key::text');
  evidence_def := replace(evidence_def, 'session_id, actor, registration_key, computed_signature', 'session_id, actor, local_registration_key, computed_signature');

  if position('  registration_key uuid;' in evidence_def) > 0 then
    raise exception 'TE-1A evidence function disambiguation incomplete';
  end if;

  execute evidence_def;
end;
$patch$;

comment on function private.record_teaching_session(
  uuid,uuid,uuid,uuid,date,time,time,integer,integer,text,text,text,uuid,uuid,text,text[],uuid,jsonb
) is
  'Private canonical TeachingSession implementation. Local registration key variable is explicitly disambiguated from the receipt column.';

comment on function private.record_teaching_session_with_evidence(
  uuid,uuid,uuid,uuid,date,time,time,integer,integer,text,text,text,uuid,uuid,text,text[],uuid,jsonb,jsonb,jsonb
) is
  'Private TE-1A implementation. Local registration key variable is explicitly disambiguated from the receipt column; atomic evidence semantics are unchanged.';

commit;
