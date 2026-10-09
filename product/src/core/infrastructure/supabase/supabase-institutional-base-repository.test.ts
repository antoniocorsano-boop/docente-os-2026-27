import assert from 'node:assert/strict'
import test from 'node:test'
import type { InstitutionalBaseVersionDraft } from '../../domain/document-template'
import {
  SupabaseInstitutionalBaseRepository,
  mapInstitutionalBaseSnapshot,
  type InstitutionalBaseRepositoryClient,
} from './supabase-institutional-base-repository'

function validBaseDraft(version = 1): InstitutionalBaseVersionDraft {
  return {
    version,
    identityProfile: {
      institutionName: 'I.C. Calvario-Covotta – don Lorenzo Milani',
      logoAssetRef: null,
    },
    headerProfile: { lines: ['Istituto Comprensivo'] },
    footerProfile: { lines: [] },
    typographyProfile: {
      bodyFontFamily: 'Arial',
      headingFontFamily: 'Arial',
      baseFontSizePt: 11,
      lineHeight: 1.3,
    },
    pageGeometryProfile: {
      format: 'A4',
      orientation: 'PORTRAIT',
      marginTopMm: 18,
      marginRightMm: 18,
      marginBottomMm: 18,
      marginLeftMm: 18,
    },
    commonTableProfile: {
      headerWeight: 'BOLD',
      cellPaddingMm: 2,
      repeatHeader: true,
    },
    signatureProfile: {
      showLocation: true,
      showDate: true,
      label: 'Il docente',
    },
    accessibilityProfile: {
      minimumFontSizePt: 10,
      highContrast: true,
      tableHeadersRequired: true,
    },
    sourceRevisionRefs: [],
  }
}

const rawBase = {
  id: 'base-1',
  workspace_id: 'ws-1',
  name: 'Veste istituzionale',
  status: 'ACTIVE' as const,
  current_version_no: 2,
  active_version_no: 2,
  created_by: 'owner-1',
  created_at: '2026-10-07T00:00:00Z',
  updated_at: '2026-10-07T01:00:00Z',
}

const rawSnapshot = {
  base: rawBase,
  activeVersion: {
    id: 'base-ver-2',
    base_id: 'base-1',
    version_no: 2,
    profile_json: validBaseDraft(2),
    source_revision_ids: [],
    created_by: 'owner-1',
    created_at: '2026-10-07T01:00:00Z',
  },
  versions: [],
  qualityReviews: [],
  sources: [],
}

const rawHistoricalVersion = {
  base: rawBase,
  version: {
    id: 'base-ver-1',
    base_id: 'base-1',
    version_no: 1,
    profile_json: validBaseDraft(1),
    source_revision_ids: [],
    created_by: 'owner-1',
    created_at: '2026-10-07T00:30:00Z',
  },
  qualityReviews: [],
  sources: [],
}

test('institutional base snapshot mapping preserves the separate active base version', () => {
  const mapped = mapInstitutionalBaseSnapshot(rawSnapshot)
  assert.equal(mapped.base.name, 'Veste istituzionale')
  assert.equal(mapped.base.activeVersionNo, 2)
  assert.equal(mapped.activeVersion?.versionNo, 2)
  assert.equal('sections' in mapped.activeVersion!.draft, false)
})

test('institutional base lifecycle adapters trust only identity plus note', async () => {
  const calls: Array<{ name: string; args: Record<string, unknown> }> = []
  const client = {
    rpc: async (name: string, args: Record<string, unknown>) => {
      calls.push({ name, args })
      return { data: null, error: null }
    },
    from: () => { throw new Error('not used') },
  } as unknown as InstitutionalBaseRepositoryClient
  const repository = new SupabaseInstitutionalBaseRepository(async () => client)

  await repository.block({ baseId: 'base-1', note: 'Sospensione per revisione della veste' })
  await repository.clearBlock({ baseId: 'base-1', note: 'Rilievi corretti' })
  await repository.retire({ baseId: 'base-1', note: 'Veste sostituita' })

  assert.deepEqual(calls.map((call) => call.name), [
    'block_institutional_base',
    'clear_institutional_base_block',
    'retire_institutional_base',
  ])
  for (const call of calls) {
    assert.equal(call.args.target_base_id, 'base-1')
    assert.equal(typeof call.args.target_note, 'string')
    assert.equal('role' in call.args, false)
    assert.equal('capability' in call.args, false)
    assert.equal('human_review_confirmed' in call.args, false)
  }
})

test('institutional base getVersion resolves only the requested historical exact pin', async () => {
  const calls: Array<{ name: string; args: Record<string, unknown> }> = []
  const client = {
    rpc: async (name: string, args: Record<string, unknown>) => {
      calls.push({ name, args })
      if (name === 'institutional_base_version_snapshot') return { data: rawHistoricalVersion, error: null }
      return { data: null, error: null }
    },
    from: () => { throw new Error('not used') },
  } as unknown as InstitutionalBaseRepositoryClient
  const repository = new SupabaseInstitutionalBaseRepository(async () => client)

  const version = await repository.getVersion('base-1', 1)

  assert.equal(version?.versionNo, 1)
  assert.equal(version?.draft.version, 1)
  assert.deepEqual(calls, [{
    name: 'institutional_base_version_snapshot',
    args: { target_base_id: 'base-1', target_version_no: 1 },
  }])
})

test('institutional base repository creates and saves only base profile data', async () => {
  const calls: Array<{ name: string; args: Record<string, unknown> }> = []
  const client = {
    rpc: async (name: string, args: Record<string, unknown>) => {
      calls.push({ name, args })
      if (name === 'create_institutional_base') return { data: 'base-1', error: null }
      if (name === 'save_institutional_base_version') return { data: 1, error: null }
      return { data: null, error: null }
    },
    from: () => { throw new Error('not used') },
  } as unknown as InstitutionalBaseRepositoryClient
  const repository = new SupabaseInstitutionalBaseRepository(async () => client)

  await repository.createBase({ workspaceId: 'ws-1', name: 'Veste istituzionale' })
  await repository.saveVersion({
    baseId: 'base-1',
    expectedCurrentVersion: 0,
    draft: validBaseDraft(1),
    sourceRevisionIds: [],
  })

  assert.deepEqual(calls.map((call) => call.name), [
    'create_institutional_base',
    'save_institutional_base_version',
  ])
  assert.equal('sections' in (calls[1].args.target_profile_json as object), false)
})
