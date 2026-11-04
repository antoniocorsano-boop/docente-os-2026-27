import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { describe, it } from 'node:test'
import {
  TRUSTED_ARENA_2026_MAX_BYTES,
  TRUSTED_ARENA_2026_RELEASE_SHA256,
  assertArenaReleaseDigest,
  projectPinnedArenaReleaseForClass,
} from './cml-provisional-arena-blob'

describe('pinned server-side Arena release bytes', () => {
  it('accepts exact bytes for a supplied SHA-256 and rejects altered bytes', () => {
    const bytes = new TextEncoder().encode('Sample export bytes for integrity testing')
    const digest = createHash('sha256').update(bytes).digest('hex')
    assert.doesNotThrow(() => assertArenaReleaseDigest(bytes, digest))
    const changed = new TextEncoder().encode('Sample export bytes for integrity testinG')
    assert.throws(() => assertArenaReleaseDigest(changed, digest), /SHA-256/)
  })

  it('rejects empty, excessive, and malformed digests', () => {
    const digest = createHash('sha256').update('test').digest('hex')
    assert.throws(() => assertArenaReleaseDigest(new Uint8Array(), digest), /byte length/)
    assert.throws(() => assertArenaReleaseDigest(new Uint8Array(TRUSTED_ARENA_2026_MAX_BYTES + 1), digest), /byte length/)
    assert.throws(() => assertArenaReleaseDigest(new Uint8Array([1]), '1234'), /malformed/)
  })

  it('pins the exact source receipt, not any arbitrary user-supplied JSON', () => {
    assert.match(TRUSTED_ARENA_2026_RELEASE_SHA256, /^[0-9a-f]{64}$/)
    const unqualifiedJson = new TextEncoder().encode(JSON.stringify({
      contract: 'TRAMA_CURRICOLO_VERTICALE_RELEASE_V1',
      authority: { state: 'PROVISIONAL_COMPLETE' },
    }))
    assert.throws(() => projectPinnedArenaReleaseForClass({
      bytes: unqualifiedJson,
      grade: 'SECONDA',
      schoolYearRef: '2026/2027',
    }), /SHA-256/)
  })
})
