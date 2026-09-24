import assert from 'node:assert/strict'
import test from 'node:test'
import { knowledgeSourceProvenanceDefinition, plannerSourceProvenanceDefinition, sourceProvenanceDefinition } from './source-provenance-registry'

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


test('knowledge provenance provider registry is deterministic and human-readable', () => {
  const expected = {
    UPLOAD: ['File acquisito', 'LUCIDE'],
    DRIVE: ['Google Drive', 'LUCIDE'],
    GMAIL: ['Gmail', 'LUCIDE'],
    CALENDAR: ['Google Calendar', 'LUCIDE'],
    MANUAL: ['Inserito da te', 'LUCIDE'],
    SYSTEM: ['Docente OS', 'DOCENTE_OS'],
  } as const

  for (const [provider, [label, mark]] of Object.entries(expected)) {
    const first = knowledgeSourceProvenanceDefinition(provider as keyof typeof expected)
    const second = knowledgeSourceProvenanceDefinition(provider as keyof typeof expected)
    assert.equal(first.label, label)
    assert.equal(first.mark, mark)
    assert.deepEqual(first, second)
    assert.match(first.accessibleLabel, /^Provenienza:/)
  }
})

test('external knowledge providers are not impersonated as Docente OS', () => {
  for (const provider of ['UPLOAD', 'DRIVE', 'GMAIL', 'CALENDAR'] as const) {
    const definition = knowledgeSourceProvenanceDefinition(provider)
    assert.notEqual(definition.label, 'Docente OS')
    assert.notEqual(definition.mark, 'DOCENTE_OS')
  }
})


test('planner provenance registry is deterministic and separates source from task status', () => {
  const expected = {
    MANUAL: ['Inserita da te', 'LUCIDE'],
    COMMUNICATION: ['Comunicazione', 'LUCIDE'],
    CALENDAR: ['Calendario', 'LUCIDE'],
    TEACHING: ['Didattica', 'LUCIDE'],
    DOCUMENT: ['Documento', 'LUCIDE'],
    SYSTEM: ['Docente OS', 'DOCENTE_OS'],
  } as const

  for (const [kind, [label, mark]] of Object.entries(expected)) {
    const first = plannerSourceProvenanceDefinition(kind as keyof typeof expected)
    const second = plannerSourceProvenanceDefinition(kind as keyof typeof expected)
    assert.equal(first.label, label)
    assert.equal(first.mark, mark)
    assert.deepEqual(first, second)
    assert.match(first.accessibleLabel, /^Provenienza:/)
    assert.doesNotMatch(first.label, /Urgente|In attesa|Completata|Scaduta/i)
  }
})

test('planner external or human sources are not impersonated as Docente OS', () => {
  for (const kind of ['MANUAL', 'COMMUNICATION', 'CALENDAR', 'TEACHING', 'DOCUMENT'] as const) {
    const definition = plannerSourceProvenanceDefinition(kind)
    assert.notEqual(definition.label, 'Docente OS')
    assert.notEqual(definition.mark, 'DOCENTE_OS')
  }
})
