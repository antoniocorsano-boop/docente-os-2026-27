import assert from 'node:assert/strict'
import test from 'node:test'
import {
  MIM_ADOPTION_SNAPSHOT,
  parseMimAdoptionCsv,
  parseMimSchoolRegistryCsv,
} from './mim-textbook-adoption-client'

test('MIM registry CSV resolves an institute code to its school/plesso codes', () => {
  const csv = [
    'ANNOSCOLASTICO,CODICEISTITUTORIFERIMENTO,CODICESCUOLA,PROVINCIA',
    '202627,AVIC849003,AVMM849014,AVELLINO',
    '202627,AVIC849003,AVEE849015,AVELLINO',
    '202526,AVIC849003,AVMM849014,AVELLINO',
    '202627,BNIC000000,BNMM000001,BENEVENTO',
  ].join('\r\n')

  const records = parseMimSchoolRegistryCsv(csv, 'AVIC849003', '202627')

  assert.deepEqual(
    records.map((record) => record.schoolCode),
    ['AVMM849014', 'AVEE849015'],
  )
  assert.ok(records.every((record) => record.instituteReferenceCode === 'AVIC849003'))
  assert.ok(records.every((record) => record.academicYearCode === '202627'))
})

test('MIM adoption CSV keeps quoted commas and maps the official textbook fields', () => {
  const csv = [
    'CODICESCUOLA,ANNOCORSO,SEZIONEANNO,TIPOGRADOSCUOLA,COMBINAZIONE,DISCIPLINA,CODICEISBN,AUTORI,TITOLO,SOTTOTITOLO,VOLUME,EDITORE,PREZZO,NUOVAADOZ,DAACQUIST,CONSIGLIATO',
    'AVMM849014,1,A,MM,30 ORE,TECNOLOGIA,9788800000001,"ROSSI, MARIO","Tecnologia, progetto e futuro",Laboratorio,1,EDITORE TEST,24.50,NO,SI,NO',
    'BNMM000001,1,A,MM,30 ORE,TECNOLOGIA,9788800000002,BIANCHI,Altro libro,,1,ALTRO EDITORE,20.00,NO,SI,NO',
  ].join('\n')

  const records = parseMimAdoptionCsv(csv, 'ALTCAMPANIA', new Set(['AVMM849014']))

  assert.equal(records.length, 1)
  assert.equal(records[0].schoolCode, 'AVMM849014')
  assert.equal(records[0].gradeNumber, 1)
  assert.equal(records[0].sectionCode, 'A')
  assert.equal(records[0].discipline, 'TECNOLOGIA')
  assert.equal(records[0].isbn13, '9788800000001')
  assert.equal(records[0].authors, 'ROSSI, MARIO')
  assert.equal(records[0].title, 'Tecnologia, progetto e futuro')
  assert.equal(records[0].publisher, 'EDITORE TEST')
  assert.equal(records[0].sourceDataset, 'ALTCAMPANIA')
})

test('MIM adoption snapshot is pinned to the verified 2026/2027 source state', () => {
  assert.deepEqual(MIM_ADOPTION_SNAPSHOT, {
    academicYearCode: '202627',
    publishedOn: '2026-09-07',
  })
})
