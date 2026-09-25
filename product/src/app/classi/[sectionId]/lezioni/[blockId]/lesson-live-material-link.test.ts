import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { resolveLiveMaterialLink } from './lesson-live-material-link'

describe('resolveLiveMaterialLink', () => {
  it('opens accepted knowledge material inside Docente OS', () => {
    assert.deepEqual(resolveLiveMaterialLink({
      sourceKind: 'KNOWLEDGE',
      sourceRef: 'knowledge:asset-123',
      payload: {},
    }), {
      href: '/knowledge/asset-123',
      label: 'Apri',
      external: false,
    })
  })

  it('opens accepted Atlas material on its governed public URL', () => {
    assert.deepEqual(resolveLiveMaterialLink({
      sourceKind: 'ATLAS',
      sourceRef: 'atlas:m4',
      payload: { publicUrl: 'https://example.test/material.svg' },
    }), {
      href: 'https://example.test/material.svg',
      label: 'Apri su Atlas',
      external: true,
    })
  })

  it('does not invent a target when no governed link exists', () => {
    assert.equal(resolveLiveMaterialLink({
      sourceKind: 'TEACHER',
      sourceRef: null,
      payload: {},
    }), null)
  })
})
