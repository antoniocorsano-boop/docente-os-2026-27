import assert from 'node:assert/strict'
import test from 'node:test'
import {
  IncrementalCsvParser,
  adoptionRecordFromFields,
  selectAcademicYearDistribution,
} from './mim-textbook-cache-sync'

test('IncrementalCsvParser preserves quoted commas and newlines across chunks', async () => {
  const rows: string[][] = []
  const parser = new IncrementalCsvParser()
  const visit = (row: string[]) => { rows.push(row) }

  await parser.feed('CodiceScuola,Titolo,Autori\r\nAVMM849047,"Tecnologia,', visit)
  await parser.feed(' progetto","Rossi\nBianchi"\r', visit)
  await parser.feed('\nAVMM849047,Secondo libro,Verdi', visit)
  await parser.finish(visit)

  assert.deepEqual(rows, [
    ['CodiceScuola', 'Titolo', 'Autori'],
    ['AVMM849047', 'Tecnologia, progetto', 'Rossi\nBianchi'],
    ['AVMM849047', 'Secondo libro', 'Verdi'],
  ])
})

test('distribution selection distinguishes an academic-year code from a publication date', () => {
  const exact = 'https://dati.istruzione.it/opendata/opendata/ALT/ALTCAMPANIA_202627.csv'
  const dated = 'https://dati.istruzione.it/opendata/opendata/ALT/ALTCAMPANIA_20260907.csv'
  const stale = 'https://dati.istruzione.it/opendata/opendata/ALT/ALTCAMPANIA_202526.csv'

  assert.equal(selectAcademicYearDistribution([dated, stale, exact], '202627'), exact)
  assert.equal(selectAcademicYearDistribution([stale, dated], '202627'), dated)
  assert.equal(selectAcademicYearDistribution([stale], '202627'), null)
})

test('adoption filter keeps only rows inside plesso, class and discipline scope', () => {
  const contexts = [{
    institute_code: 'AVIC849003',
    academic_year_code: '202627',
    grade: 'PRIMA',
    section_code: 'A',
    discipline_name: 'Tecnologia',
  }]
  const allowedSchools = new Set(['AVMM849047'])
  const base = new Map<string, string>([
    ['codicescuola', 'AVMM849047'],
    ['annocorso', '1'],
    ['sezioneanno', 'A'],
    ['disciplina', 'TECNOLOGIA'],
    ['codiceisbn', '9788800000001'],
    ['titolo', 'Tecnologia e progetto'],
    ['editore', 'Editore prova'],
    ['autori', 'Autore prova'],
    ['tipogradoscuola', 'MM'],
    ['combinazione', '1'],
    ['volume', 'U'],
    ['prezzo', '20,00'],
    ['nuovaadoz', 'NO'],
    ['daacquist', 'SI'],
    ['consigliato', 'NO'],
  ])

  const accepted = adoptionRecordFromFields(base, 'ALTCAMPANIA', 'csv:ALTCAMPANIA:10', contexts, allowedSchools)
  assert.ok(accepted)
  assert.equal(accepted.schoolCode, 'AVMM849047')
  assert.equal(accepted.gradeNumber, 1)
  assert.equal(accepted.sectionCode, 'A')
  assert.equal(accepted.discipline, 'TECNOLOGIA')

  const wrongClass = new Map(base)
  wrongClass.set('sezioneanno', 'B')
  assert.equal(adoptionRecordFromFields(wrongClass, 'ALTCAMPANIA', 'csv:ALTCAMPANIA:11', contexts, allowedSchools), null)

  const wrongDiscipline = new Map(base)
  wrongDiscipline.set('disciplina', 'MATEMATICA')
  assert.equal(adoptionRecordFromFields(wrongDiscipline, 'ALTCAMPANIA', 'csv:ALTCAMPANIA:12', contexts, allowedSchools), null)

  const wrongSchool = new Map(base)
  wrongSchool.set('codicescuola', 'AVMM000000')
  assert.equal(adoptionRecordFromFields(wrongSchool, 'ALTCAMPANIA', 'csv:ALTCAMPANIA:13', contexts, allowedSchools), null)
})
