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

const rawHistoricalVersion = {
  template: rawSnapshot.template,
  version: {
    id: 'ver-1', template_id: 'tpl-1', version_no: 1,
    schema_json: { kind: 'FINAL_REPORT' as const, name: 'Relazione finale', version: 1, sourceRevisionRefs: [], sections: [] },
    source_revision_ids: [], created_by: 'user-1', created_at: '2026-10-07T00:30:00Z',
  },
  qualityReviews: [],
  sources: [],
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

test('family lifecycle adapters call only trusted identity plus note RPCs and never accept client authority claims', async () => {
  const calls: Array<{ name: string; args: Record<string, unknown> }> = []
  const client = {
    rpc: async (name: string, args: Record<string, unknown>) => {
      calls.push({ name, args })
      return { data: null, error: null }
    },
    from: () => { throw new Error('not used') },
  } as unknown as TemplateRepositoryClient
  const repository = new SupabaseDocumentTemplateRepository(async () => client)

  await repository.block({ templateId: 'tpl-1', note: 'Sospensione per revisione istituzionale' })
  await repository.clearBlock({ templateId: 'tpl-1', note: 'Rilievi corretti' })
  await repository.retire({ templateId: 'tpl-1', note: 'Modello sostituito' })

  assert.deepEqual(calls.map((call) => call.name), [
    'block_document_template',
    'clear_document_template_block',
    'retire_document_template',
  ])
  for (const call of calls) {
    assert.equal(call.args.target_template_id, 'tpl-1')
    assert.equal(typeof call.args.target_note, 'string')
    assert.equal('role' in call.args, false)
    assert.equal('capability' in call.args, false)
    assert.equal('human_review_confirmed' in call.args, false)
  }
})

test('family getVersion resolves exactly the requested historical version through the exact-pin RPC', async () => {
  const calls: Array<{ name: string; args: Record<string, unknown> }> = []
  const client = {
    rpc: async (name: string, args: Record<string, unknown>) => {
      calls.push({ name, args })
      if (name === 'document_template_version_snapshot') return { data: rawHistoricalVersion, error: null }
      return { data: null, error: null }
    },
    from: () => { throw new Error('not used') },
  } as unknown as TemplateRepositoryClient
  const repository = new SupabaseDocumentTemplateRepository(async () => client)

  const version = await repository.getVersion('tpl-1', 1)

  assert.equal(version?.versionNo, 1)
  assert.equal(version?.draft.version, 1)
  assert.deepEqual(calls, [{
    name: 'document_template_version_snapshot',
    args: { target_template_id: 'tpl-1', target_version_no: 1 },
  }])
})
