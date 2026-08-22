begin;

revoke all on function public.current_workspace_context() from anon;
revoke all on function public.annual_plan_execution_snapshot(uuid, uuid) from anon;

grant execute on function public.current_workspace_context() to authenticated;
grant execute on function public.annual_plan_execution_snapshot(uuid, uuid) to authenticated;

commit;
