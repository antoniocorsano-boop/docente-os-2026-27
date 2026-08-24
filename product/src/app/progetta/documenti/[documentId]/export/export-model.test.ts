import assert from 'node:assert/strict'
import test from 'node:test'
import type { AuthoredDocumentSnapshot } from '@/core/domain/authored-document'
import { exportBlocks, selectExportVersion } from './export-model'

const snapshot: AuthoredDocumentSnapshot = {
  document: {
    id: 'doc-1', workspaceId: 'ws-1', academicYearId: 'year-1', sourceAssetId: 'source-1', documentKind: 'UDA',
    title: 'UDA corrente', currentVersionNo: 2, createdBy: 'user-1', createdAt: '2026-08-24T10:00:00Z', updatedAt: '2026-08-24T11:00:00Z',
  },
  current: { id: 'v2', documentId: 'doc-1', versionNo: 2, title: 'UDA v2', bodyMarkdown: '# Titolo', createdBy: 'user-1', createdAt: '2026-08-24T11:00:00Z' },
  versions: [
    { id: 'v2', documentId: 'doc-1', versionNo: 2, title: 'UDA v2', bodyMarkdown: '# Titolo', createdBy: 'user-1', createdAt: '2026-08-24T11:00:00Z' },
    { id: 'v1', documentId: 'doc-1', versionNo: 1, title: 'UDA v1', bodyMarkdown: 'Testo iniziale', createdBy: 'user-1', createdAt: '2026-08-24T10:00:00Z' },
  ],
}

test('X5B selects current version when version is omitted', () => {
  assert.equal(selectExportVersion(snapshot)?.versionNo, 2)
})

test('X5B selects an immutable historical version', () => {
  assert.equal(selectExportVersion(snapshot, '1')?.id, 'v1')
  assert.equal(selectExportVersion(snapshot, '3'), null)
  assert.equal(selectExportVersion(snapshot, 'abc'), null)
})

test('X5B converts safe markdown structure without HTML injection', () => {
  assert.deepEqual(exportBlocks('# Titolo\n\n## Sezione\n- voce\n1. passo\n<p>test</p>'), [
    { kind: 'heading', level: 1, text: 'Titolo' },
    { kind: 'blank' },
    { kind: 'heading', level: 2, text: 'Sezione' },
    { kind: 'bullet', text: 'voce' },
    { kind: 'numbered', text: 'passo' },
    { kind: 'paragraph', text: '<p>test</p>' },
  ])
})
