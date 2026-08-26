import assert from 'node:assert/strict'
import test from 'node:test'
import { matchMimTextbookAdoptions, scoreDiscipline } from './mim-textbook-discovery'
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

test('matches MIM adoption using class section and discipline from settings context', () => {
  const matches = matchMimTextbookAdoptions([
    {
      schoolCode: 'AVMM000001',
      gradeNumber: 2,
      sectionCode: 'A',
      schoolGradeType: 'MM',
      combination: null,
      discipline: 'TECNOLOGIA',
      isbn13: '9788808899798',
      authors: 'Paci, Paci, Bernardini',
      title: 'Tecnologia.verde',
      subtitle: null,
      volume: 'U',
      publisher: 'Zanichelli',
      price: null,
      newAdoption: 'NO',
      toPurchase: 'SI',
      recommended: 'NO',
      sourceDataset: 'ALTCAMPANIA',
      sourceSubject: 'urn:mim:adoption:1',
    },
    {
      schoolCode: 'AVMM000001',
      gradeNumber: 2,
      sectionCode: 'B',
      schoolGradeType: 'MM',
      combination: null,
      discipline: 'TECNOLOGIA',
      isbn13: '9788808899798',
      authors: null,
      title: 'Wrong section',
      subtitle: null,
      volume: null,
      publisher: 'Editore',
      price: null,
      newAdoption: null,
      toPurchase: null,
      recommended: 'NO',
      sourceDataset: 'ALTCAMPANIA',
      sourceSubject: 'urn:mim:adoption:2',
    },
  ], [{
    teachingAssignmentId: 'assignment-2a-tech',
    grade: 'SECONDA',
    sectionCode: 'A',
    disciplineName: 'Tecnologia',
  }])

  assert.equal(matches.length, 1)
  assert.equal(matches[0].teachingAssignmentId, 'assignment-2a-tech')
  assert.equal(matches[0].record.title, 'Tecnologia.verde')
  assert.equal(matches[0].usageKind, 'ADOPTED')
})

test('discipline matcher accepts qualified labels without collapsing unrelated subjects', () => {
  assert.ok(scoreDiscipline('Tecnologia', 'TECNOLOGIA E DISEGNO') >= 0.75)
  assert.ok(scoreDiscipline('Tecnologia', 'MATEMATICA') < 0.75)
})
