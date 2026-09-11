begin;

create or replace function public.finish_teaching_session_drive_outbox(
  target_outbox_id uuid,
  target_status text,
  target_error text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  target_workspace uuid;
  target_creator uuid;
begin
  if actor is null then raise exception 'authenticated user required'; end if;
  if target_status not in ('SYNCED','FAILED') then raise exception 'invalid Drive outbox terminal status'; end if;

  select workspace_id, created_by
    into target_workspace, target_creator
  from public.teaching_session_drive_outbox
  where id = target_outbox_id
  for update;

  if target_workspace is null then raise exception 'Drive outbox receipt not found'; end if;
  if target_creator <> actor or not private.is_workspace_member(target_workspace) then
    raise exception 'Drive outbox receipt outside actor context';
  end if;

  update public.teaching_session_drive_outbox
  set status = target_status,
      attempts = attempts + 1,
      last_error = case when target_status = 'FAILED' then left(nullif(btrim(coalesce(target_error, '')), ''), 1000) else null end,
      synced_at = case when target_status = 'SYNCED' then now() else null end,
      updated_at = now()
  where id = target_outbox_id;
end;
$$;

revoke all on function public.finish_teaching_session_drive_outbox(uuid,text,text) from public, anon;
grant execute on function public.finish_teaching_session_drive_outbox(uuid,text,text) to authenticated;

comment on function public.finish_teaching_session_drive_outbox(uuid,text,text) is
  'Allows only the authenticated creator inside the workspace to mark a Drive diary projection SYNCED or FAILED; projection content remains immutable.';

commit;
