begin;

alter function public.current_workspace_context() security invoker;
alter function public.annual_plan_execution_snapshot(uuid, uuid) security invoker;

commit;
