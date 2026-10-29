import assert from 'node:assert/strict'
import test from 'node:test'
import { buildBlocks } from '@/app/piano-annuale/model'
import { resolveRuntimeHumanTaskLessonProjection } from './human-task-runtime'
import {
  resolveHumanTaskTextbookProvenance,
  resolveTextbookSupportForUdaCode,
} from './human-task-textbook-provenance'

test('aggiunge il libro come provenienza secondaria senza alterare PLAN UDA PACK', () => {
  const projection = resolveRuntimeHumanTaskLessonProjection('Prima', buildBlocks('Prima')[2])
  assert.ok(projection)

  const before = projection.sources.map((source) => source.code)
  const provenance = resolveHumanTaskTextbookProvenance(projection)
  const after = projection.sources.map((source) => source.code)

  assert.deepEqual(after, before)
  assert.deepEqual(before, ['CAN-PLAN-1', 'CAN-UDA-1-01', 'CAN-PACK-1A'])
  assert.equal(provenance?.canonicalUdaCode, 'CAN-UDA-1-01')
  assert.equal(provenance?.status, 'VERIFIED_PAGES')
  assert.equal(provenance?.detailStatus, 'VERIFIED_PAGE')
  assert.deepEqual(provenance?.pageRanges, [
    { from: 16, to: 18 },
    { from: 19, to: 23 },
    { from: 24, to: 27 },
    { from: 28, to: 31 },
  ])
})

test('quando capitoli e pagine non sono verificati espone solo supporto generico', () => {
  const projection = resolveRuntimeHumanTaskLessonProjection('Prima', buildBlocks('Prima')[0])
  assert.ok(projection)

  const provenance = resolveHumanTaskTextbookProvenance(projection)

  assert.equal(provenance?.status, 'SUPPORT_DETAILS_TO_VERIFY')
  assert.equal(provenance?.detailStatus, 'TO_VERIFY')
  assert.deepEqual(provenance?.pageRanges, [])
  assert.equal(provenance?.chapterLabel, null)
  assert.match(provenance?.message ?? '', /capitoli e pagine specifici sono ancora da verificare/i)
})

test('un gap parziale resta visibile e richiede una fonte complementare', () => {
  const projection = resolveRuntimeHumanTaskLessonProjection('Prima', buildBlocks('Prima')[27])
  assert.ok(projection)
  assert.equal(projection.udaCode, '1-06')

  const provenance = resolveHumanTaskTextbookProvenance(projection)

  assert.equal(provenance?.status, 'PARTIAL_GAP')
  assert.equal(provenance?.classification, 'PARTIAL_GAP')
  assert.match(provenance?.message ?? '', /fonte complementare/i)
})

test('il gap strutturale Informatica non viene nascosto né trasformato in copertura del libro', () => {
  const provenance = resolveTextbookSupportForUdaCode('3-07')

  assert.equal(provenance?.canonicalUdaCode, 'CAN-UDA-3-07')
  assert.equal(provenance?.status, 'STRUCTURAL_GAP')
  assert.equal(provenance?.classification, 'STRUCTURAL_GAP')
  assert.deepEqual(provenance?.pageRanges, [])
  assert.match(provenance?.message ?? '', /configurazione adottata non comprende Informatica/i)
})

test('un codice UDA sconosciuto non produce provenienza inventata', () => {
  assert.equal(resolveTextbookSupportForUdaCode('9-99'), null)
})
