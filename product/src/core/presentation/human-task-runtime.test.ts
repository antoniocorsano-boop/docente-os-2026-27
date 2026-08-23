import assert from 'node:assert/strict'
import test from 'node:test'
import { buildBlocks } from '@/app/piano-annuale/model'
import { resolveHumanTaskLessonTiming, resolveHumanTaskStepResources } from './human-task-content'
import { resolveRuntimeHumanTaskLessonProjection } from './human-task-runtime'

function primaBlock(blockId: string) {
  const block = buildBlocks('Prima').find((item) => item.id === blockId)
  assert.ok(block, `Blocco ${blockId} non trovato`)
  return block
}

test('runtime exposes approved B07-B27 and stops before B28', () => {
  const expected = [
    ['B07', 'HTC-PRIMA-B07-v1'],
    ['B08', 'HTC-PRIMA-B08-v1'],
    ['B09', 'HTC-PRIMA-B09-v1'],
    ['B10', 'HTC-PRIMA-B10-UDA-v1'],
    ['B11', 'HTC-PRIMA-B11-v1'],
    ['B12', 'HTC-PRIMA-B12-v1'],
    ['B13', 'HTC-PRIMA-B13-PACK-v1'],
    ['B14', 'HTC-PRIMA-B14-PACK-v1'],
    ['B15', 'HTC-PRIMA-B15-PACK-v1'],
    ['B16', 'HTC-PRIMA-B16-PLAN-v1'],
    ['B17', 'HTC-PRIMA-B17-PLAN-v1'],
    ['B18', 'HTC-PRIMA-B18-PLAN-v1'],
    ['B19', 'HTC-PRIMA-B19-PLAN-v1'],
    ['B20', 'HTC-PRIMA-B20-PLAN-v1'],
    ['B21', 'HTC-PRIMA-B21-PLAN-v1'],
    ['B22', 'HTC-PRIMA-B22-PLAN-v1'],
    ['B23', 'HTC-PRIMA-B23-PLAN-v1'],
    ['B24', 'HTC-PRIMA-B24-PLAN-v1'],
    ['B25', 'HTC-PRIMA-B25-PLAN-v1'],
    ['B26', 'HTC-PRIMA-B26-PLAN-v1'],
    ['B27', 'HTC-PRIMA-B27-PLAN-v1'],
  ] as const

  for (const [blockId, projectionId] of expected) {
    const projection = resolveRuntimeHumanTaskLessonProjection('Prima', primaBlock(blockId))
    assert.ok(projection)
    assert.equal(projection.projectionId, projectionId)
    assert.equal(projection.durationMinutes, 120)
  }

  assert.equal(resolveRuntimeHumanTaskLessonProjection('Prima', primaBlock('B28')), null)
})

test('B07 keeps its classified material sheet binding', () => {
  const projection = resolveRuntimeHumanTaskLessonProjection('Prima', primaBlock('B07'))
  assert.ok(projection)
  assert.deepEqual(projection.steps.map((step) => step.minutes), [null, null, null])
  assert.deepEqual(resolveHumanTaskStepResources(projection, projection.steps[2]).map((resource) => resource.id), ['STUDENT-E'])
})

test('B08 keeps unspecified timing and binds Scheda F to the experimental activity', () => {
  const projection = resolveRuntimeHumanTaskLessonProjection('Prima', primaBlock('B08'))
  assert.ok(projection)
  const timing = resolveHumanTaskLessonTiming(projection)
  assert.equal(timing.status, 'UNSPECIFIED')
  assert.equal(timing.durationMinutes, 120)
  assert.equal(projection.steps.length, 1)
  assert.deepEqual(resolveHumanTaskStepResources(projection, projection.steps[0]).map((resource) => resource.id), ['STUDENT-F'])
  assert.match(projection.steps[0].cue ?? '', /una variabile alla volta/i)
})

test('B09 exposes two source-derived decision steps and binds Scheda G only to criteria', () => {
  const projection = resolveRuntimeHumanTaskLessonProjection('Prima', primaBlock('B09'))
  assert.ok(projection)
  assert.equal(resolveHumanTaskLessonTiming(projection).status, 'UNSPECIFIED')
  assert.equal(projection.steps.length, 2)
  assert.deepEqual(resolveHumanTaskStepResources(projection, projection.steps[0]).map((resource) => resource.id), [])
  assert.deepEqual(resolveHumanTaskStepResources(projection, projection.steps[1]).map((resource) => resource.id), ['STUDENT-G'])
})

test('B10 exposes only the approved UDA phase without inventing timings or resources', () => {
  const projection = resolveRuntimeHumanTaskLessonProjection('Prima', primaBlock('B10'))
  assert.ok(projection)
  const timing = resolveHumanTaskLessonTiming(projection)
  assert.equal(timing.status, 'UNSPECIFIED')
  assert.equal(timing.durationMinutes, 120)
  assert.equal(projection.steps.length, 2)
  assert.deepEqual(projection.steps.map((step) => step.minutes), [null, null])
  assert.deepEqual(projection.resources, [])
  assert.deepEqual(projection.preparation, [])
  assert.equal(projection.sourceAlignment.level, 'COMPOSED')
  assert.match(projection.sourceAlignment.note ?? '', /fase 4|uda/i)
  assert.match(projection.steps[0].instruction, /filiere esemplificative/i)
  assert.match(projection.steps[1].instruction, /diagrammi lineari o di flusso/i)
})

test('B11-B12 remain direct drawing lessons with no invented internal timing', () => {
  for (const blockId of ['B11', 'B12']) {
    const projection = resolveRuntimeHumanTaskLessonProjection('Prima', primaBlock(blockId))
    assert.ok(projection)
    assert.equal(projection.sourceAlignment.level, 'DIRECT')
    assert.equal(resolveHumanTaskLessonTiming(projection).status, 'UNSPECIFIED')
    assert.equal(projection.steps.every((step) => step.minutes === null), true)
    assert.deepEqual(projection.sources.map((source) => source.code), ['CAN-PLAN-1', 'CAN-UDA-1-03', 'CAN-PACK-1B'])
  }
  const b11 = resolveRuntimeHumanTaskLessonProjection('Prima', primaBlock('B11'))
  assert.ok(b11)
  assert.deepEqual(resolveHumanTaskStepResources(b11, b11.steps[3]).map((resource) => resource.id), ['STUDENT-H'])
})

test('B13-B14 use only PACK 1C as operational pack while preserving UDA 1-02 accounting', () => {
  for (const blockId of ['B13', 'B14']) {
    const projection = resolveRuntimeHumanTaskLessonProjection('Prima', primaBlock(blockId))
    assert.ok(projection)
    assert.equal(projection.udaCode, '1-02')
    assert.equal(projection.packCode, 'CAN-PACK-1B')
    assert.equal(projection.sourceAlignment.level, 'COMPOSED')
    assert.equal(resolveHumanTaskLessonTiming(projection).status, 'UNSPECIFIED')
    assert.equal(projection.steps.every((step) => step.minutes === null), true)
    assert.deepEqual(projection.sources.map((source) => source.code), ['CAN-PLAN-1', 'CAN-UDA-1-02', 'CAN-PACK-1C'])
  }
})

test('B15 combines PACK 1B and 1C but never exposes logistics-only PACK 1D as didactic source', () => {
  const projection = resolveRuntimeHumanTaskLessonProjection('Prima', primaBlock('B15'))
  assert.ok(projection)
  assert.equal(projection.sourceAlignment.level, 'COMPOSED')
  assert.equal(resolveHumanTaskLessonTiming(projection).status, 'UNSPECIFIED')
  assert.deepEqual(projection.sources.map((source) => source.code), ['CAN-PLAN-1', 'CAN-UDA-1-03', 'CAN-PACK-1B', 'CAN-PACK-1C'])
  assert.equal(projection.sources.some((source) => source.code === 'CAN-PACK-1D'), false)
  assert.deepEqual(resolveHumanTaskStepResources(projection, projection.steps[2]).map((resource) => resource.id), ['OPEN-DAY-PITCH'])
  assert.equal(projection.resources[0].prompts.length, 8)
})

test('B16-B19 are plan-guided UDA projections and expose only PLAN + UDA as didactic sources', () => {
  for (const blockId of ['B16', 'B17', 'B18', 'B19']) {
    const projection = resolveRuntimeHumanTaskLessonProjection('Prima', primaBlock(blockId))
    assert.ok(projection)
    assert.equal(projection.sourceAlignment.level, 'COMPOSED')
    assert.equal(resolveHumanTaskLessonTiming(projection).status, 'UNSPECIFIED')
    assert.deepEqual(projection.sources.map((source) => source.code), ['CAN-PLAN-1', 'CAN-UDA-1-03'])
    assert.deepEqual(projection.resources, [])
    assert.deepEqual(projection.preparation, [])
    assert.deepEqual(projection.steps.map((step) => step.minutes), [null])
  }
})

test('B17 and B18 preserve the Plan split of the shared four-hour UDA phase', () => {
  const b17 = resolveRuntimeHumanTaskLessonProjection('Prima', primaBlock('B17'))
  const b18 = resolveRuntimeHumanTaskLessonProjection('Prima', primaBlock('B18'))
  assert.ok(b17)
  assert.ok(b18)
  assert.equal(b17.steps[0].instruction, 'Triangoli e quadrilateri selezionati.')
  assert.equal(b18.steps[0].instruction, 'Poligoni regolari selezionati, procedure e controllo.')
  assert.equal(b17.evidence, 'Tavola grafica controllata.')
  assert.equal(b18.evidence, 'Tavola grafica.')
})

test('B19 preserves the final Plan evidence and does not reduce it to a generic UDA indicator', () => {
  const projection = resolveRuntimeHumanTaskLessonProjection('Prima', primaBlock('B19'))
  assert.ok(projection)
  assert.equal(projection.evidence, 'Tavola VAL + breve prova.')
  assert.match(projection.assessmentNote, /valutazione formalizzata/i)
})

test('B20-B22 reuse plan-guided UDA with two untimed one-hour source phases per block', () => {
  for (const blockId of ['B20', 'B21', 'B22']) {
    const projection = resolveRuntimeHumanTaskLessonProjection('Prima', primaBlock(blockId))
    assert.ok(projection)
    assert.equal(projection.sourceAlignment.level, 'COMPOSED')
    assert.equal(resolveHumanTaskLessonTiming(projection).status, 'UNSPECIFIED')
    assert.equal(projection.steps.length, 2)
    assert.deepEqual(projection.steps.map((step) => step.minutes), [null, null])
  }
})

test('B20-B21 expose only Plan and UDA while B22 adds PACK 1E only for the operational worksheet', () => {
  for (const blockId of ['B20', 'B21']) {
    const projection = resolveRuntimeHumanTaskLessonProjection('Prima', primaBlock(blockId))
    assert.ok(projection)
    assert.deepEqual(projection.sources.map((source) => source.code), ['CAN-PLAN-1', 'CAN-UDA-1-04'])
    assert.deepEqual(projection.resources, [])
  }

  const b22 = resolveRuntimeHumanTaskLessonProjection('Prima', primaBlock('B22'))
  assert.ok(b22)
  assert.deepEqual(b22.sources.map((source) => source.code), ['CAN-PLAN-1', 'CAN-UDA-1-04', 'CAN-PACK-1E'])
  assert.deepEqual(b22.resources.map((resource) => resource.id), ['STUDENT-CIRCULAR-LIFE'])
  assert.deepEqual(resolveHumanTaskStepResources(b22, b22.steps[0]).map((resource) => resource.id), ['STUDENT-CIRCULAR-LIFE'])
  assert.deepEqual(resolveHumanTaskStepResources(b22, b22.steps[1]).map((resource) => resource.id), ['STUDENT-CIRCULAR-LIFE'])
  assert.ok(b22.resources[0].prompts.some((prompt) => /conferimento verificata/i.test(prompt)))
  assert.match(b22.assessmentNote, /fonte istituzionale aggiornata/i)
})

test('B23-B27 use one exact two-hour UDA phase and do not fabricate PACK resources or timing', () => {
  const phasePatterns: Record<string, RegExp> = {
    B23: /bisogno, problema, funzione, requisito e vincolo/i,
    B24: /raccolta di dati utili/i,
    B25: /funzionalità, fattibilità, materiali, sicurezza/i,
    B26: /misure essenziali, materiali, strumenti/i,
    B27: /prova rispetto ai requisiti/i,
  }

  for (const blockId of ['B23', 'B24', 'B25', 'B26', 'B27']) {
    const projection = resolveRuntimeHumanTaskLessonProjection('Prima', primaBlock(blockId))
    assert.ok(projection)
    assert.equal(projection.sourceAlignment.level, 'COMPOSED')
    assert.equal(resolveHumanTaskLessonTiming(projection).status, 'UNSPECIFIED')
    assert.equal(projection.steps.length, 1)
    assert.deepEqual(projection.steps.map((step) => step.minutes), [null])
    assert.match(projection.steps[0].instruction, phasePatterns[blockId])
    assert.deepEqual(projection.sources.map((source) => source.code), ['CAN-PLAN-1', 'CAN-UDA-1-05'])
    assert.deepEqual(projection.resources, [])
    assert.deepEqual(projection.preparation, [])
  }
})

test('B27 closes the project through verification and improvement rather than prototype completion alone', () => {
  const projection = resolveRuntimeHumanTaskLessonProjection('Prima', primaBlock('B27'))
  assert.ok(projection)
  assert.equal(projection.evidence, 'Dossier completo + presentazione.')
  assert.match(projection.steps[0].instruction, /difetti, correzioni e possibili miglioramenti/i)
  assert.match(projection.assessmentNote, /proposta di miglioramento/i)
})

test('approved PACK_COMPOSED projections fail closed when support PACK binding drifts', () => {
  for (const blockId of ['B13', 'B14', 'B15']) {
    const block = primaBlock(blockId)
    assert.equal(resolveRuntimeHumanTaskLessonProjection('Prima', { ...block, supportPacks: [] }), null)
  }

  const b15 = primaBlock('B15')
  assert.equal(resolveRuntimeHumanTaskLessonProjection('Prima', { ...b15, supportPacks: ['CAN-PACK-1D', 'CAN-PACK-1C'] }), null)
})

test('approved B07-B27 projections fail closed when canonical plan metadata drifts', () => {
  for (const blockId of ['B07', 'B08', 'B09', 'B10', 'B11', 'B12', 'B13', 'B14', 'B15', 'B16', 'B17', 'B18', 'B19', 'B20', 'B21', 'B22', 'B23', 'B24', 'B25', 'B26', 'B27']) {
    const block = primaBlock(blockId)
    assert.equal(resolveRuntimeHumanTaskLessonProjection('Prima', { ...block, uda: '9-99' }), null)
    assert.equal(resolveRuntimeHumanTaskLessonProjection('Prima', { ...block, pack: 'CAN-PACK-X' }), null)
    assert.equal(resolveRuntimeHumanTaskLessonProjection('Prima', { ...block, title: 'Titolo diverso' }), null)
  }
})

test('direct material projections expose PLAN UDA PACK while UDA/Plan-guided projections expose only contributing sources', () => {
  for (const blockId of ['B07', 'B08', 'B09']) {
    const projection = resolveRuntimeHumanTaskLessonProjection('Prima', primaBlock(blockId))
    assert.ok(projection)
    assert.deepEqual(projection.sources.map((source) => source.code), ['CAN-PLAN-1', 'CAN-UDA-1-02', 'CAN-PACK-1B'])
  }

  const b10 = resolveRuntimeHumanTaskLessonProjection('Prima', primaBlock('B10'))
  assert.ok(b10)
  assert.deepEqual(b10.sources.map((source) => source.code), ['CAN-PLAN-1', 'CAN-UDA-1-02'])

  for (const blockId of ['B16', 'B17', 'B18', 'B19']) {
    const projection = resolveRuntimeHumanTaskLessonProjection('Prima', primaBlock(blockId))
    assert.ok(projection)
    assert.deepEqual(projection.sources.map((source) => source.code), ['CAN-PLAN-1', 'CAN-UDA-1-03'])
  }

  for (const blockId of ['B20', 'B21']) {
    const projection = resolveRuntimeHumanTaskLessonProjection('Prima', primaBlock(blockId))
    assert.ok(projection)
    assert.deepEqual(projection.sources.map((source) => source.code), ['CAN-PLAN-1', 'CAN-UDA-1-04'])
  }

  for (const blockId of ['B23', 'B24', 'B25', 'B26', 'B27']) {
    const projection = resolveRuntimeHumanTaskLessonProjection('Prima', primaBlock(blockId))
    assert.ok(projection)
    assert.deepEqual(projection.sources.map((source) => source.code), ['CAN-PLAN-1', 'CAN-UDA-1-05'])
  }
})
