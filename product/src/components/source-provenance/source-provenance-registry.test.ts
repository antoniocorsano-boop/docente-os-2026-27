import assert from 'node:assert/strict'
import test from 'node:test'
import { sourceProvenanceDefinition } from './source-provenance-registry'

test('source provenance registry is deterministic for all lesson-design source kinds', () => {
  const expected = {
    ATLAS: ['Atlas', 'ATLAS'],
    KNOWLEDGE: ['Conoscenza', 'DOCENTE_OS'],
    EDITORIAL_KNOWLEDGE: ['Dal libro', 'LUCIDE'],
    TEACHER: ['Docente', 'LUCIDE'],
    WEB: ['Web', 'LUCIDE'],
    AI_TOOL: ['Strumento assistito', 'LUCIDE'],
  } as const

  for (const [kind, [label, mark]] of Object.entries(expected)) {
    const first = sourceProvenanceDefinition(kind as keyof typeof expected)
    const second = sourceProvenanceDefinition(kind as keyof typeof expected)
    assert.equal(first.label, label)
    assert.equal(first.mark, mark)
    assert.deepEqual(first, second)
    assert.match(first.accessibleLabel, /^Provenienza:/)
  }
})

test('Atlas provenance keeps the canonical Atlas mark and human label separate from status', () => {
  const atlas = sourceProvenanceDefinition('ATLAS')
  assert.equal(atlas.label, 'Atlas')
  assert.equal(atlas.mark, 'ATLAS')
  assert.equal(atlas.icon, undefined)
  assert.doesNotMatch(atlas.label, /READY|VERIFIED|APPROVED/i)
})

test('external and assisted sources are never represented as Docente OS knowledge', () => {
  for (const kind of ['ATLAS', 'WEB', 'AI_TOOL'] as const) {
    const definition = sourceProvenanceDefinition(kind)
    assert.notEqual(definition.label, 'Conoscenza')
    assert.notEqual(definition.mark, 'DOCENTE_OS')
  }
})
