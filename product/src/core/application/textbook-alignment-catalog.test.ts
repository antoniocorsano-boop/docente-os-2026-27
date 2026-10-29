import assert from 'node:assert/strict'
import test from 'node:test'
import { validateTextbookAlignment } from '../domain/textbook-alignment'
import {
  getTextbookAlignmentCoverageSummary,
  getTextbookAlignmentsForUda,
} from './textbook-alignment-catalog'

const EXPECTED_UDA_CODES = [
  'CAN-UDA-1-00',
  'CAN-UDA-1-01',
  'CAN-UDA-1-02',
  'CAN-UDA-1-03',
  'CAN-UDA-1-04',
  'CAN-UDA-1-05',
  'CAN-UDA-1-06',
  'CAN-UDA-1-07',
  'CAN-UDA-2-01',
  'CAN-UDA-2-02',
  'CAN-UDA-2-03',
  'CAN-UDA-2-04',
  'CAN-UDA-2-05',
  'CAN-UDA-2-06',
  'CAN-UDA-2-07',
  'CAN-UDA-2-08',
  'CAN-UDA-3-01',
  'CAN-UDA-3-02',
  'CAN-UDA-3-03',
  'CAN-UDA-3-04',
  'CAN-UDA-3-05',
  'CAN-UDA-3-06',
  'CAN-UDA-3-07',
  'CAN-UDA-3-08',
  'CAN-UDA-3-09',
] as const

test('catalogo v0.1 rappresenta esattamente le 25 UDA canoniche una volta ciascuna', () => {
  const summary = getTextbookAlignmentCoverageSummary()

  assert.equal(summary.total, 25)
  assert.equal(summary.entries.length, 25)
  assert.deepEqual(
    summary.entries.map((entry) => entry.udaCode).sort(),
    [...EXPECTED_UDA_CODES].sort(),
  )
  assert.equal(new Set(summary.entries.map((entry) => entry.udaCode)).size, 25)
})

test('conserva la classificazione conservativa congelata nella mappa v0.1', () => {
  const summary = getTextbookAlignmentCoverageSummary()

  assert.deepEqual(summary.counts, {
    DIRECT_CANDIDATE: 13,
    COMPOSED_CANDIDATE: 9,
    PARTIAL_GAP: 2,
    STRUCTURAL_GAP: 1,
  })

  assert.equal(
    summary.entries.find((entry) => entry.udaCode === 'CAN-UDA-3-07')?.classification,
    'STRUCTURAL_GAP',
  )
  assert.equal(
    summary.entries.find((entry) => entry.udaCode === 'CAN-UDA-1-06')?.classification,
    'PARTIAL_GAP',
  )
  assert.equal(
    summary.entries.find((entry) => entry.udaCode === 'CAN-UDA-2-08')?.classification,
    'PARTIAL_GAP',
  )
})

test('solo CAN-UDA-1-01 espone le quattro pagine già verificate del capitolo sostenibilità', () => {
  const verifiedPages = getTextbookAlignmentCoverageSummary().entries.flatMap((entry) =>
    entry.alignments
      .filter((alignment) => alignment.evidenceLevel === 'VERIFIED_PAGE')
      .map((alignment) => ({
        udaCode: entry.udaCode,
        pageRange: alignment.pageRange,
      })),
  )

  assert.deepEqual(verifiedPages, [
    { udaCode: 'CAN-UDA-1-01', pageRange: { from: 16, to: 18 } },
    { udaCode: 'CAN-UDA-1-01', pageRange: { from: 19, to: 23 } },
    { udaCode: 'CAN-UDA-1-01', pageRange: { from: 24, to: 27 } },
    { udaCode: 'CAN-UDA-1-01', pageRange: { from: 28, to: 31 } },
  ])
})

test('ogni record del catalogo rispetta il contratto di validazione', () => {
  const alignments = getTextbookAlignmentCoverageSummary().entries.flatMap(
    (entry) => entry.alignments,
  )

  assert.ok(alignments.length >= 25)
  for (const alignment of alignments) {
    assert.deepEqual(validateTextbookAlignment(alignment), { valid: true, issues: [] })
  }
})

test('la lookup UDA è read-only e non inventa UDA sconosciute', () => {
  const known = getTextbookAlignmentsForUda('CAN-UDA-1-01')
  const unknown = getTextbookAlignmentsForUda('CAN-UDA-9-99')

  assert.equal(known.length, 4)
  assert.deepEqual(unknown, [])
})
