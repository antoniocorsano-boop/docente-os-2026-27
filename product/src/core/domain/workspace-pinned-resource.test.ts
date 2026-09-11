import assert from 'node:assert/strict'
import test from 'node:test'
import {
  WORKSPACE_PINNED_RESOURCE_SLOTS,
  asWorkspacePinnedResourceKind,
  normalizeWorkspacePinnedResourceNote,
  normalizeWorkspacePinnedResourceTarget,
} from './workspace-pinned-resource'

test('workspace Home slots are fixed and unique', () => {
  assert.deepEqual(
    WORKSPACE_PINNED_RESOURCE_SLOTS.map((slot) => slot.kind),
    ['TODAY', 'SECTION', 'PLANNING', 'DIARY', 'PROBATION'],
  )
  assert.equal(new Set(WORKSPACE_PINNED_RESOURCE_SLOTS.map((slot) => slot.kind)).size, 5)
})

test('pinned resource kind rejects unknown slots', () => {
  assert.equal(asWorkspacePinnedResourceKind('DIARY'), 'DIARY')
  assert.throws(() => asWorkspacePinnedResourceKind('SHARED'), /Unsupported workspace pinned resource kind/)
})

test('pinned resource targets accept internal routes and HTTPS only', () => {
  assert.equal(normalizeWorkspacePinnedResourceTarget(' /impostazioni '), '/impostazioni')
  assert.equal(
    normalizeWorkspacePinnedResourceTarget('https://drive.google.com/drive/folders/example'),
    'https://drive.google.com/drive/folders/example',
  )
  assert.throws(() => normalizeWorkspacePinnedResourceTarget('http://example.com'), /must use HTTPS/)
  assert.throws(() => normalizeWorkspacePinnedResourceTarget('javascript:alert(1)'), /must use HTTPS/)
})

test('pinned resource notes are trimmed and bounded', () => {
  assert.equal(normalizeWorkspacePinnedResourceNote('  Diario della sezione  '), 'Diario della sezione')
  assert.equal(normalizeWorkspacePinnedResourceNote('   '), null)
  assert.throws(() => normalizeWorkspacePinnedResourceNote('x'.repeat(501)), /note too long/)
})
