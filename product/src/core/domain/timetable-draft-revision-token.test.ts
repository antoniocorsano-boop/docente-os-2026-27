import assert from 'node:assert/strict'
import test from 'node:test'
import { materializeTimetableDraftRevisionToken } from './timetable-draft-revision-token'

test('G1.6-J materializes a deterministic token from version identity and DB revision', () => {
  assert.deepEqual(materializeTimetableDraftRevisionToken({ versionId: 'draft-1', revision: 12 }), {
    contractVersion: 'TTDR-1',
    state: 'TOKEN_READY',
    token: 'TTDR-1|7:draft-1|2:12',
    versionId: 'draft-1',
    revision: 12,
  })
})

test('G1.6-J changes token when either DRAFT identity or revision changes', () => {
  const baseline = materializeTimetableDraftRevisionToken({ versionId: 'draft-1', revision: 12 })
  const changedRevision = materializeTimetableDraftRevisionToken({ versionId: 'draft-1', revision: 13 })
  const changedVersion = materializeTimetableDraftRevisionToken({ versionId: 'draft-2', revision: 12 })

  assert.equal(baseline.state, 'TOKEN_READY')
  assert.equal(changedRevision.state, 'TOKEN_READY')
  assert.equal(changedVersion.state, 'TOKEN_READY')

  if (
    baseline.state === 'TOKEN_READY' &&
    changedRevision.state === 'TOKEN_READY' &&
    changedVersion.state === 'TOKEN_READY'
  ) {
    assert.notEqual(baseline.token, changedRevision.token)
    assert.notEqual(baseline.token, changedVersion.token)
  }
})

test('G1.6-J rejects empty identity and invalid revisions fail-closed', () => {
  assert.deepEqual(materializeTimetableDraftRevisionToken({ versionId: '   ', revision: 0 }), {
    contractVersion: 'TTDR-1',
    state: 'BLOCKED',
    reason: 'INVALID_VERSION_ID',
  })

  for (const revision of [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.deepEqual(materializeTimetableDraftRevisionToken({ versionId: 'draft-1', revision }), {
      contractVersion: 'TTDR-1',
      state: 'BLOCKED',
      reason: 'INVALID_REVISION',
    })
  }
})

test('G1.6-J uses length-prefixed canonical encoding to avoid separator ambiguity', () => {
  const a = materializeTimetableDraftRevisionToken({ versionId: 'a|b', revision: 1 })
  const b = materializeTimetableDraftRevisionToken({ versionId: 'a', revision: 1 })

  assert.equal(a.state, 'TOKEN_READY')
  assert.equal(b.state, 'TOKEN_READY')
  if (a.state === 'TOKEN_READY' && b.state === 'TOKEN_READY') {
    assert.equal(a.token, 'TTDR-1|3:a|b|1:1')
    assert.equal(b.token, 'TTDR-1|1:a|1:1')
    assert.notEqual(a.token, b.token)
  }
})

test('G1.6-J remains non-applicative and carries no write capability', () => {
  const result = materializeTimetableDraftRevisionToken({ versionId: 'draft-1', revision: 12 })
  const serialized = JSON.stringify(result)

  for (const forbidden of [
    'apply_timetable_import_to_draft',
    'activate_timetable_version',
    'canApply',
    'lock',
    'claim',
  ]) {
    assert.equal(serialized.includes(forbidden), false)
  }
})
