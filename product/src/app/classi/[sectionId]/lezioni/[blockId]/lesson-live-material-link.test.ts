import { describe, expect, it } from 'vitest'
import { resolveLiveMaterialLink } from './lesson-live-material-link'

describe('resolveLiveMaterialLink', () => {
  it('opens accepted knowledge material inside Docente OS', () => {
    expect(resolveLiveMaterialLink({
      sourceKind: 'KNOWLEDGE',
      sourceRef: 'knowledge:asset-123',
      payload: {},
    })).toEqual({
      href: '/knowledge/asset-123',
      label: 'Apri',
      external: false,
    })
  })

  it('opens accepted Atlas material on its governed public URL', () => {
    expect(resolveLiveMaterialLink({
      sourceKind: 'ATLAS',
      sourceRef: 'atlas:m4',
      payload: { publicUrl: 'https://example.test/material.svg' },
    })).toEqual({
      href: 'https://example.test/material.svg',
      label: 'Apri su Atlas',
      external: true,
    })
  })

  it('does not invent a target when no governed link exists', () => {
    expect(resolveLiveMaterialLink({
      sourceKind: 'TEACHER',
      sourceRef: null,
      payload: {},
    })).toBeNull()
  })
})
