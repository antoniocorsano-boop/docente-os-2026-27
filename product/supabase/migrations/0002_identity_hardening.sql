begin;

create unique index if not exists uq_academic_year_active_per_workspace
on public.academic_years(workspace_id)
where is_active = true;

grant select, insert, update on public.profiles to authenticated;
grant select, insert, update on public.workspaces to authenticated;
grant select, insert on public.workspace_memberships to authenticated;
grant select, insert, update on public.academic_years to authenticated;

revoke all on public.profiles from anon;
revoke all on public.workspaces from anon;
revoke all on public.workspace_memberships from anon;
revoke all on public.academic_years from anon;

commit;
