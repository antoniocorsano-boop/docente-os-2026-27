import assert from 'node:assert/strict'
import test from 'node:test'
import {
  matchMimTextbookAdoptions,
  resolveMimSchoolScope,
  type MimTeachingContext,
  type MimTextbookRecord,
} from './mim-textbook-discovery'

const contexts: MimTeachingContext[] = [
  { teachingAssignmentId: '1a', grade: 'PRIMA', sectionCode: 'A', disciplineName: 'Tecnologia' },
  { teachingAssignmentId: '1c', grade: 'PRIMA', sectionCode: 'C', disciplineName: 'Tecnologia' },
  { teachingAssignmentId: '2a', grade: 'SECONDA', sectionCode: 'A', disciplineName: 'Tecnologia' },
  { teachingAssignmentId: '2c', grade: 'SECONDA', sectionCode: 'C', disciplineName: 'Tecnologia' },
  { teachingAssignmentId: '3a', grade: 'TERZA', sectionCode: 'A', disciplineName: 'Tecnologia' },
  { teachingAssignmentId: '3c', grade: 'TERZA', sectionCode: 'C', disciplineName: 'Tecnologia' },
  { teachingAssignmentId: '3e', grade: 'TERZA', sectionCode: 'E', disciplineName: 'Tecnologia' },
]

function record(schoolCode: string, gradeNumber: number, sectionCode: string, isbn13 = '9788808950758'): MimTextbookRecord {
  return {
    schoolCode,
    gradeNumber,
    sectionCode,
    schoolGradeType: null,
    combination: null,
    discipline: 'TECNOLOGIA',
    isbn13,
    authors: null,
    title: `Tecnologia ${gradeNumber}${sectionCode}`,
    subtitle: null,
    volume: null,
    publisher: 'Editore',
    price: null,
    newAdoption: null,
    toPurchase: null,
    recommended: 'NO',
    sourceDataset: 'ALTCAMPANIA',
    sourceSubject: `${schoolCode}-${gradeNumber}-${sectionCode}`,
  }
}

test('selects the unique plesso with complete Cattedra coverage', () => {
  const target = [
    record('AVMM849047', 1, 'A'),
    record('AVMM849047', 1, 'C'),
    record('AVMM849047', 2, 'A'),
    record('AVMM849047', 2, 'C'),
    record('AVMM849047', 3, 'A'),
    record('AVMM849047', 3, 'C'),
    record('AVMM849047', 3, 'E'),
  ]
  const otherPlessi = [
    record('AVMM849025', 1, 'A'),
    record('AVMM849025', 2, 'A'),
    record('AVMM849036', 1, 'A'),
    record('AVMM849036', 2, 'A'),
    record('AVMM849036', 3, 'A'),
  ]

  const scoped = resolveMimSchoolScope([...otherPlessi, ...target], contexts)
  assert.equal(scoped.length, 7)
  assert.deepEqual(new Set(scoped.map((item) => item.schoolCode)), new Set(['AVMM849047']))

  const matches = matchMimTextbookAdoptions([...otherPlessi, ...target], contexts)
  assert.equal(matches.length, 7)
  assert.deepEqual(new Set(matches.map((item) => item.record.schoolCode)), new Set(['AVMM849047']))
})

test('fails closed when two plessi have equal best coverage', () => {
  const first = [record('PLesso0001', 1, 'A'), record('PLesso0001', 1, 'C')]
  const second = [record('PLesso0002', 1, 'A'), record('PLesso0002', 1, 'C')]
  const limitedContexts = contexts.slice(0, 2)

  assert.deepEqual(resolveMimSchoolScope([...first, ...second], limitedContexts), [])
  assert.deepEqual(matchMimTextbookAdoptions([...first, ...second], limitedContexts), [])
})

test('preserves a single resolved school scope', () => {
  const records = [record('AVMM849047', 1, 'A'), record('AVMM849047', 1, 'C')]
  assert.deepEqual(resolveMimSchoolScope(records, contexts.slice(0, 2)), records)
})
