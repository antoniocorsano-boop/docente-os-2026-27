import assert from 'node:assert/strict'
import test from 'node:test'
import {
  SupabaseDocumentTemplateRepository,
  mapDocumentTemplateSnapshot,
  type TemplateRepositoryClient,
} from './supabase-document-template-repository'

const rawSnapshot = {
  template: {
    id: 'tpl-1', workspace_id: 'ws-1', document_kind: 'FINAL_REPORT' as const, name: 'Relazione finale',
    status: 'ACTIVE' as const, current_version_no: 2, active_version_no: 2,
    created_by: 'user-1', created_at: '2026-10-07T00:00:00Z', updated_at: '2026-10-07T01:00:00Z',
  },
  activeVersion: {
    id: 'ver-2', template_id: 'tpl-1', version_no: 2,
    schema_json: { kind: 'FINAL_REPORT' as const, name: 'Relazione finale', version: 2, sourceRevisionRefs: [], sections: [] },
    source_revision_ids: [], created_by: 'user-1', created_at: '2026-10-07T01:00:00Z',
  },
  versions: [],
  qualityReviews: [],
  sources: [{
    id: 'src-1', workspace_id: 'ws-1', source_asset_id: null, source_revision_ref: null,
    source_kind: 'UNKNOWN' as const, source_fingerprint: 'blank-template', captured_by: 'user-1',
    captured_at: '2026-10-07T00:00:00Z',
  }],
}

test('snapshot mapping preserves active version and nullable source asset', () => {
  const mapped = mapDocumentTemplateSnapshot(rawSnapshot)
  assert.equal(mapped.template.activeVersionNo, 2)
  assert.equal(mapped.activeVersion?.versionNo, 2)
  assert.equal(mapped.sources[0].sourceAssetId, null)
})

test('repository propagates RPC errors', async () => {
  const client: TemplateRepositoryClient = {
    rpc: async () => ({ data: null, error: { message: 'workspace membership required' } }),
    from: () => { throw new Error('not used') },
  }
  const repository = new SupabaseDocumentTemplateRepository(async () => client)
  await assert.rejects(
    () => repository.createTemplate({ workspaceId: 'ws-1', kind: 'FINAL_REPORT', name: 'Relazione finale' }),
    /workspace membership required/,
  )
})
