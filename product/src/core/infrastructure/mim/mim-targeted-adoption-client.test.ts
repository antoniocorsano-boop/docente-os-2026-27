import assert from 'node:assert/strict'
import test from 'node:test'
import type { MimTeachingContext, MimTextbookRecord } from '@/core/domain/mim-textbook-discovery'
import {
  buildMimScopedAdoptionQuery,
  filterRecordsToTeachingContexts,
} from './mim-targeted-adoption-client'

const contexts: MimTeachingContext[] = [
  {
    teachingAssignmentId: 'assignment-1a-tecnologia',
    grade: 'PRIMA',
    sectionCode: 'A',
    disciplineName: 'Tecnologia',
  },
  {
    teachingAssignmentId: 'assignment-2c-tecnologia',
    grade: 'SECONDA',
    sectionCode: 'C',
    disciplineName: 'Tecnologia',
  },
]

test('targeted MIM query is scoped to verified plessi and configured grade/section pairs', () => {
  const query = buildMimScopedAdoptionQuery(
    ['AVMM849047'],
    contexts,
  )

  assert.match(query, /AVMM849047/)
  assert.match(query, /STR\(\?gradeValue\) = "1"/)
  assert.match(query, /UCASE\(STR\(\?sectionValue\)\) = "A"/)
  assert.match(query, /STR\(\?gradeValue\) = "2"/)
  assert.match(query, /UCASE\(STR\(\?sectionValue\)\) = "C"/)
  assert.doesNotMatch(query, /978[0-9]{10}/)
  assert.doesNotMatch(query, /CSV|catalog\/ALTCAMPANIA/i)
})

test('targeted MIM filter keeps only the teacher class and discipline context', () => {
  const records = [
    record({ schoolCode: 'AVMM849047', gradeNumber: 1, sectionCode: 'A', discipline: 'TECNOLOGIA' }),
    record({ schoolCode: 'AVMM849047', gradeNumber: 1, sectionCode: 'A', discipline: 'MATEMATICA' }),
    record({ schoolCode: 'AVMM849047', gradeNumber: 2, sectionCode: 'C', discipline: 'TECNOLOGIA E LABORATORIO' }),
    record({ schoolCode: 'AVMM849047', gradeNumber: 3, sectionCode: 'E', discipline: 'TECNOLOGIA' }),
    record({ schoolCode: 'BNMM000001', gradeNumber: 1, sectionCode: 'A', discipline: 'TECNOLOGIA' }),
  ]

  const filtered = filterRecordsToTeachingContexts(
    records,
    contexts,
    new Set(['AVMM849047']),
  )

  assert.equal(filtered.length, 2)
  assert.deepEqual(
    filtered.map((item) => [item.gradeNumber, item.sectionCode, item.discipline]),
    [
      [1, 'A', 'TECNOLOGIA'],
      [2, 'C', 'TECNOLOGIA E LABORATORIO'],
    ],
  )
})

function record(
  overrides: Partial<MimTextbookRecord>,
): MimTextbookRecord {
  return {
    schoolCode: 'AVMM849047',
    gradeNumber: 1,
    sectionCode: 'A',
    schoolGradeType: 'MM',
    combination: '30 ORE',
    discipline: 'TECNOLOGIA',
    isbn13: '9788800000001',
    authors: 'AUTORE TEST',
    title: 'Libro test',
    subtitle: null,
    volume: 'U',
    publisher: 'EDITORE TEST',
    price: '20.00',
    newAdoption: 'NO',
    toPurchase: 'SI',
    recommended: 'NO',
    sourceDataset: 'ALTCAMPANIA',
    sourceSubject: 'test:subject',
    ...overrides,
  }
}
