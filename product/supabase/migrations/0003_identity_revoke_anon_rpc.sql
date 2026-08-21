begin;
revoke execute on function public.bootstrap_personal_workspace(text) from anon;
revoke execute on function public.bootstrap_personal_workspace(text) from public;
grant execute on function public.bootstrap_personal_workspace(text) to authenticated;
commit;
