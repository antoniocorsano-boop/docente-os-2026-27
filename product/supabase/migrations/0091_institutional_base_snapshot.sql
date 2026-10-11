begin;

insert into private.runtime_schema_required_migrations(version, migration_id)
values (91, '0091_institutional_base_snapshot')
on conflict (version) do update
set migration_id = excluded.migration_id;

create or replace function public.institutional_base_snapshot(target_base_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'base', to_jsonb(base),
    'activeVersion', (
      select to_jsonb(active_version)
      from public.institutional_base_versions active_version
      where active_version.base_id = base.id
        and active_version.version_no = base.active_version_no
    ),
    'versions', coalesce((
      select jsonb_agg(to_jsonb(version) order by version.version_no desc)
      from public.institutional_base_versions version
      where version.base_id = base.id
    ), '[]'::jsonb),
    'qualityReviews', coalesce((
      select jsonb_agg(to_jsonb(review) order by review.reviewed_at desc, review.id desc)
      from public.institutional_base_quality_reviews review
      where review.base_id = base.id
    ), '[]'::jsonb),
    'sources', coalesce((
      select jsonb_agg(to_jsonb(source) order by source.captured_at desc)
      from public.document_template_sources source
      where source.id in (
        select unnest(version.source_revision_ids)
        from public.institutional_base_versions version
        where version.base_id = base.id
      )
    ), '[]'::jsonb)
  )
  from public.institutional_bases base
  where base.id = target_base_id
    and private.is_workspace_member(base.workspace_id);
$$;

revoke all on function public.institutional_base_snapshot(uuid) from public;
grant execute on function public.institutional_base_snapshot(uuid) to authenticated;

comment on function public.institutional_base_snapshot(uuid) is
  'Workspace-scoped aggregate read model for the institutional base registry; historical exact-pin reads remain provided by institutional_base_version_snapshot.';

select private.advance_runtime_schema_contract('0091_institutional_base_snapshot');

commit;
