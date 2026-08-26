import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildTextbookSettingsCoverage,
  normalizeIsbn13,
  validateTextbookDraft,
} from './textbook-adoption'

test('normalizes a valid ISBN-13', () => {
  assert.equal(normalizeIsbn13('978-88-08-89979-8'), '9788808899798')
})

test('rejects an invalid ISBN-13 checksum', () => {
  assert.throws(() => normalizeIsbn13('9788808899799'), /checksum/)
})

test('validates an automatically resolved ISBN proposal without publisher credentials', () => {
  const draft = validateTextbookDraft({
    teachingAssignmentId: 'assignment-1',
    isbn13: '978-88-08-89979-8',
    title: '  Tecnologia.verde   ',
    subtitle: null,
    authors: 'Paci, Paci, Bernardini',
    publisher: 'Zanichelli',
    editionLabel: 'Seconda edizione',
    volumeLabel: 'Volume unico',
    officialUrl: 'https://www.zanichelli.it/',
    publisherProductRef: null,
    usageKind: 'ADOPTED',
    sourceKind: 'ISBN_LOOKUP',
    sourceRef: 'google-books:isbn:9788808899798',
  })

  assert.equal(draft.isbn13, '9788808899798')
  assert.equal(draft.title, 'Tecnologia.verde')
  assert.equal(draft.sourceKind, 'ISBN_LOOKUP')
})

test('every confirmed book is counted while only adopted books cover the assignment', () => {
  const coverage = buildTextbookSettingsCoverage({
    assignmentIds: ['a1', 'a2'],
    adoptions: [
      { teachingAssignmentId: 'a1', status: 'CONFIRMED', usageKind: 'ADOPTED' },
      { teachingAssignmentId: 'a2', status: 'PROPOSED', usageKind: 'ADOPTED' },
      { teachingAssignmentId: 'a2', status: 'CONFIRMED', usageKind: 'RECOMMENDED' },
    ],
  })

  assert.equal(coverage.coveredAssignmentCount, 1)
  assert.equal(coverage.confirmedBookCount, 2)
  assert.equal(coverage.proposedBookCount, 1)
  assert.deepEqual(coverage.missingAssignmentIds, ['a2'])
})
