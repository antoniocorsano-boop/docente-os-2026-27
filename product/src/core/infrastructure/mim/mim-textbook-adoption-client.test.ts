import assert from 'node:assert/strict'
import test from 'node:test'
import {
  fallbackAdoptionSchoolCodesWhenRegistryHasNoMatch,
  MIM_ADOPTION_SNAPSHOT,
  parseMimAdoptionCsv,
  parseMimSchoolRegistryCsv,
  resolveDatiGovMimCsvUrl,
  resolveMimCsvUrlFromCatalogHtml,
} from './mim-textbook-adoption-client'

test('MIM registry CSV resolves an institute code to its school/plesso codes', () => {
  const csv = [
    'ANNOSCOLASTICO,CODICEISTITUTORIFERIMENTO,CODICESCUOLA,PROVINCIA',
    '202627,AVIC849003,AVMM849047,AVELLINO',
    '202627,AVIC849003,AVEE849015,AVELLINO',
    '202526,AVIC849003,AVMM849047,AVELLINO',
    '202627,BNIC000000,BNMM000001,BENEVENTO',
  ].join('\r\n')

  const records = parseMimSchoolRegistryCsv(csv, 'AVIC849003', '202627')

  assert.deepEqual(
    records.map((record) => record.schoolCode),
    ['AVMM849047', 'AVEE849015'],
  )
  assert.ok(records.every((record) => record.instituteReferenceCode === 'AVIC849003'))
  assert.ok(records.every((record) => record.academicYearCode === '202627'))
})

test('MIM discovery fails closed when an institute code is not resolved to a plesso', () => {
  assert.throws(
    () => fallbackAdoptionSchoolCodesWhenRegistryHasNoMatch('AVIC849003'),
    /non è stato risolto in alcun plesso/,
  )
})

test('MIM discovery may fall back to the same code only when it is already a plesso', () => {
  assert.deepEqual(
    fallbackAdoptionSchoolCodesWhenRegistryHasNoMatch('AVMM849047'),
    ['AVMM849047'],
  )
})

test('MIM adoption CSV keeps quoted commas and maps the official textbook fields', () => {
  const csv = [
    'CODICESCUOLA,ANNOCORSO,SEZIONEANNO,TIPOGRADOSCUOLA,COMBINAZIONE,DISCIPLINA,CODICEISBN,AUTORI,TITOLO,SOTTOTITOLO,VOLUME,EDITORE,PREZZO,NUOVAADOZ,DAACQUIST,CONSIGLIATO',
    'AVMM849047,1,A,MM,30 ORE,TECNOLOGIA,9788800000001,"ROSSI, MARIO","Tecnologia, progetto e futuro",Laboratorio,1,EDITORE TEST,24.50,NO,SI,NO',
    'BNMM000001,1,A,MM,30 ORE,TECNOLOGIA,9788800000002,BIANCHI,Altro libro,,1,ALTRO EDITORE,20.00,NO,SI,NO',
  ].join('\n')

  const records = parseMimAdoptionCsv(csv, 'ALTCAMPANIA', new Set(['AVMM849047']))

  assert.equal(records.length, 1)
  assert.equal(records[0].schoolCode, 'AVMM849047')
  assert.equal(records[0].gradeNumber, 1)
  assert.equal(records[0].sectionCode, 'A')
  assert.equal(records[0].discipline, 'TECNOLOGIA')
  assert.equal(records[0].isbn13, '9788800000001')
  assert.equal(records[0].authors, 'ROSSI, MARIO')
  assert.equal(records[0].title, 'Tecnologia, progetto e futuro')
  assert.equal(records[0].publisher, 'EDITORE TEST')
  assert.equal(records[0].sourceDataset, 'ALTCAMPANIA')
})

test('dati.gov.it federation resolves only the current official MIM CSV distribution', () => {
  const url = resolveDatiGovMimCsvUrl({
    success: true,
    result: {
      results: [{
        id: 'campania-package',
        title: 'Adozioni libri di testo scolastici. Regione Campania',
        extras: [{
          key: 'uri',
          value: 'http://dati.istruzione.it/opendata/opendata/catalog/ALTCAMPANIA',
        }],
        resources: [
          {
            format: 'CSV',
            name: 'ALTCAMPANIA 2025/2026',
            url: 'https://dati.istruzione.it/opendata/opendata/miur/ALTCAMPANIA202526.csv',
          },
          {
            format: 'CSV',
            name: 'ALTCAMPANIA 2026/2027',
            url: 'http://dati.istruzione.it/opendata/opendata/miur/ALTCAMPANIA202627.csv',
          },
          {
            format: 'CSV',
            name: 'mirror non autorevole',
            url: 'https://example.org/ALTCAMPANIA202627.csv',
          },
        ],
      }],
    },
  }, 'ALTCAMPANIA', '202627')

  assert.equal(
    url,
    'https://dati.istruzione.it/opendata/opendata/miur/ALTCAMPANIA202627.csv',
  )
})

test('dati.gov.it federation accepts a dated MIM distribution when the date is not an academic-year code', () => {
  const url = resolveDatiGovMimCsvUrl({
    success: true,
    result: {
      results: [{
        identifier: 'http://dati.istruzione.it/opendata/opendata/catalog/ALTCAMPANIA',
        resources: [{
          format: 'CSV',
          name: 'Adozioni Campania aggiornate',
          description: 'Dati correnti pubblicati nel 2026',
          url: 'https://dati.istruzione.it/opendata/opendata/catalog/ALTCAMPANIA/ALTCAMPANIA000020260622.csv',
        }],
      }],
    },
  }, 'ALTCAMPANIA', '202627')

  assert.equal(
    url,
    'https://dati.istruzione.it/opendata/opendata/catalog/ALTCAMPANIA/ALTCAMPANIA000020260622.csv',
  )
})

test('MIM dataset catalogue selects an exact school-year registry distribution', () => {
  const html = [
    '<a href="/opendata/opendata/catalog/SCUANAGRAFESTAT/SCUANAGRAFESTAT20252620250901.csv">old</a>',
    '<a href="/opendata/opendata/catalog/SCUANAGRAFESTAT/SCUANAGRAFESTAT20262720260901.csv">current</a>',
  ].join('')

  assert.equal(
    resolveMimCsvUrlFromCatalogHtml(
      html,
      'https://dati.istruzione.it/opendata/opendata/catalog/SCUANAGRAFESTAT',
      'SCUANAGRAFESTAT',
      '202627',
    ),
    'https://dati.istruzione.it/opendata/opendata/catalog/SCUANAGRAFESTAT/SCUANAGRAFESTAT20262720260901.csv',
  )
})

test('MIM dataset catalogue does not reject a dated adoption distribution as a stale school year', () => {
  const html = '<a href="/opendata/opendata/catalog/ALTCAMPANIA/ALTCAMPANIA000020260622.csv">CSV</a>'

  assert.equal(
    resolveMimCsvUrlFromCatalogHtml(
      html,
      'https://dati.istruzione.it/opendata/opendata/catalog/ALTCAMPANIA',
      'ALTCAMPANIA',
      '202627',
    ),
    'https://dati.istruzione.it/opendata/opendata/catalog/ALTCAMPANIA/ALTCAMPANIA000020260622.csv',
  )
})

test('dati.gov.it federation fails closed on an explicitly stale academic-year distribution', () => {
  const url = resolveDatiGovMimCsvUrl({
    success: true,
    result: {
      results: [{
        identifier: 'http://dati.istruzione.it/opendata/opendata/catalog/SCUANAGRAFESTAT',
        resources: [{
          format: 'CSV',
          name: 'Anagrafe scuole statali 2025/2026',
          url: 'https://dati.istruzione.it/opendata/opendata/miur/SCUANAGRAFESTAT202526.csv',
        }],
      }],
    },
  }, 'SCUANAGRAFESTAT', '202627')

  assert.equal(url, null)
})

test('MIM adoption snapshot is pinned to the verified 2026/2027 source state', () => {
  assert.deepEqual(MIM_ADOPTION_SNAPSHOT, {
    academicYearCode: '202627',
    publishedOn: '2026-09-07',
  })
})
