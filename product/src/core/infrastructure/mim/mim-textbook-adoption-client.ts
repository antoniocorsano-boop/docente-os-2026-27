import type { MimTextbookRecord } from '@/core/domain/mim-textbook-discovery'

const MIM_SPARQL_SERVICE = 'https://dati.istruzione.it/opendata/opendata/sparql/endpoint/query/service/'

const DATASETS = [
  'ALTABRUZZO',
  'ALTBASILICATA',
  'ALTCALABRIA',
  'ALTCAMPANIA',
  'ALTEMILIAROMAGNA',
  'ALTFRIULIVENEZIAGIULIA',
  'ALTLAZIO',
  'ALTLIGURIA',
  'ALTLOMBARDIA',
  'ALTMARCHE',
  'ALTMOLISE',
  'ALTPIEMONTE',
  'ALTPUGLIA',
  'ALTSARDEGNA',
  'ALTSICILIA',
  'ALTTOSCANA',
  'ALTTRENTINOALTOADIGE',
  'ALTUMBRIA',
  'ALTVALLEDAOSTA',
  'ALTVENETO',
] as const

type MimDatasetCode = typeof DATASETS[number]

type SparqlBinding = {
  subject?: { value?: string }
  predicate?: { value?: string }
  value?: { value?: string }
}

type SparqlResponse = {
  results?: { bindings?: SparqlBinding[] }
}

type DatasetQueryResult = {
  reachable: boolean
  records: MimTextbookRecord[]
}

const PROVINCE_DATASET = buildProvinceDatasetMap()

export class MimTextbookAdoptionClient {
  async discoverBySchoolCode(schoolCode: string): Promise<{
    datasetCode: string | null
    records: MimTextbookRecord[]
    checkedDatasets: string[]
  }> {
    const normalizedSchoolCode = normalizeSchoolCode(schoolCode)
    const preferred = PROVINCE_DATASET.get(normalizedSchoolCode.slice(0, 2))
    const checkedDatasets: string[] = []

    if (preferred) {
      checkedDatasets.push(preferred)
      const preferredResult = await this.queryDataset(preferred, normalizedSchoolCode)
      if (preferredResult.reachable) {
        return {
          datasetCode: preferredResult.records.length ? preferred : null,
          records: preferredResult.records,
          checkedDatasets,
        }
      }
    }

    let reachableDatasetCount = 0
    const fallbackDatasets = preferred ? DATASETS.filter((dataset) => dataset !== preferred) : [...DATASETS]
    for (const datasetCode of fallbackDatasets) {
      checkedDatasets.push(datasetCode)
      const result = await this.queryDataset(datasetCode, normalizedSchoolCode)
      if (result.reachable) reachableDatasetCount += 1
      if (result.records.length) return { datasetCode, records: result.records, checkedDatasets }
    }

    if (!reachableDatasetCount) throw new Error('Portale Open Data MIM temporaneamente non raggiungibile')
    return { datasetCode: null, records: [], checkedDatasets }
  }

  private async queryDataset(datasetCode: MimDatasetCode, schoolCode: string): Promise<DatasetQueryResult> {
    const query = buildSchoolQuery(schoolCode)
    const response = await querySparql(datasetCode, query)
    if (!response) return { reachable: false, records: [] }
    return {
      reachable: true,
      records: parseMimSparqlBindings(response.results?.bindings ?? [], datasetCode)
        .filter((record) => normalizeSchoolCode(record.schoolCode) === schoolCode),
    }
  }
}

export function parseMimSparqlBindings(bindings: SparqlBinding[], sourceDataset: string): MimTextbookRecord[] {
  const subjects = new Map<string, Map<string, string>>()

  for (const binding of bindings) {
    const subject = binding.subject?.value?.trim()
    const predicate = binding.predicate?.value?.trim()
    const value = binding.value?.value?.trim()
    if (!subject || !predicate || value === undefined) continue

    const fields = subjects.get(subject) ?? new Map<string, string>()
    const key = normalizeFieldKey(predicateLocalName(predicate))
    if (!fields.has(key)) fields.set(key, value)
    subjects.set(subject, fields)
  }

  const records: MimTextbookRecord[] = []
  for (const [subject, fields] of subjects) {
    const schoolCode = field(fields, 'codicescuola')
    const gradeNumber = Number.parseInt(field(fields, 'annocorso'), 10)
    const sectionCode = field(fields, 'sezioneanno')
    const discipline = field(fields, 'disciplina')
    const isbn13 = field(fields, 'codiceisbn')
    const title = field(fields, 'titolo')
    const publisher = field(fields, 'editore')

    if (!schoolCode || !Number.isFinite(gradeNumber) || !sectionCode || !discipline || !isbn13 || !title || !publisher) continue

    records.push({
      schoolCode,
      gradeNumber,
      sectionCode,
      schoolGradeType: nullableField(fields, 'tipogradoscuola'),
      combination: nullableField(fields, 'combinazione'),
      discipline,
      isbn13,
      authors: nullableField(fields, 'autori'),
      title,
      subtitle: nullableField(fields, 'sottotitolo'),
      volume: nullableField(fields, 'volume'),
      publisher,
      price: nullableField(fields, 'prezzo'),
      newAdoption: nullableField(fields, 'nuovaadoz'),
      toPurchase: nullableField(fields, 'daacquist'),
      recommended: nullableField(fields, 'consigliato'),
      sourceDataset,
      sourceSubject: subject,
    })
  }

  return records
}

function buildSchoolQuery(schoolCode: string) {
  return `SELECT ?subject ?predicate ?value WHERE {
  ?subject ?schoolCodePredicate ?schoolCode .
  FILTER(UCASE(STR(?schoolCode)) = "${schoolCode}")
  ?subject ?predicate ?value .
}
LIMIT 10000`
}

async function querySparql(datasetCode: MimDatasetCode, query: string): Promise<SparqlResponse | null> {
  const endpoint = `${MIM_SPARQL_SERVICE}?ds=${encodeURIComponent(datasetCode)}`
  const body = new URLSearchParams({ query, format: 'application/sparql-results+json' })

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      cache: 'no-store',
      headers: {
        accept: 'application/sparql-results+json, application/json;q=0.9',
        'content-type': 'application/x-www-form-urlencoded;charset=UTF-8',
      },
      body,
      signal: AbortSignal.timeout(8_000),
    })
    if (response.ok) return await response.json() as SparqlResponse
    if (response.status !== 405 && response.status !== 404) return null
  } catch {
    // Fall through to GET because the public endpoint has changed method handling across releases.
  }

  try {
    const url = new URL(endpoint)
    url.searchParams.set('query', query)
    url.searchParams.set('format', 'application/sparql-results+json')
    const response = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      headers: { accept: 'application/sparql-results+json, application/json;q=0.9' },
      signal: AbortSignal.timeout(8_000),
    })
    if (!response.ok) return null
    return await response.json() as SparqlResponse
  } catch {
    return null
  }
}

function predicateLocalName(value: string) {
  const withoutQuery = value.split('?')[0]
  const parts = withoutQuery.split(/[#/]/)
  return decodeURIComponent(parts.at(-1) ?? value)
}

function normalizeFieldKey(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

function field(fields: Map<string, string>, key: string) {
  return fields.get(key)?.trim() ?? ''
}

function nullableField(fields: Map<string, string>, key: string) {
  return field(fields, key) || null
}

function normalizeSchoolCode(value: string) {
  const normalized = value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (!/^[A-Z0-9]{6,12}$/.test(normalized)) throw new Error('Codice meccanografico non valido')
  return normalized
}

function buildProvinceDatasetMap() {
  const map = new Map<string, MimDatasetCode>()
  const groups: Array<[MimDatasetCode, string[]]> = [
    ['ALTABRUZZO', ['AQ', 'CH', 'PE', 'TE']],
    ['ALTBASILICATA', ['MT', 'PZ']],
    ['ALTCALABRIA', ['CS', 'CZ', 'KR', 'RC', 'VV']],
    ['ALTCAMPANIA', ['AV', 'BN', 'CE', 'NA', 'SA']],
    ['ALTEMILIAROMAGNA', ['BO', 'FC', 'FE', 'MO', 'PR', 'PC', 'RA', 'RE', 'RN']],
    ['ALTFRIULIVENEZIAGIULIA', ['GO', 'PN', 'TS', 'UD']],
    ['ALTLAZIO', ['FR', 'LT', 'RI', 'RM', 'VT']],
    ['ALTLIGURIA', ['GE', 'IM', 'SP', 'SV']],
    ['ALTLOMBARDIA', ['BG', 'BS', 'CO', 'CR', 'LC', 'LO', 'MB', 'MI', 'MN', 'PV', 'SO', 'VA']],
    ['ALTMARCHE', ['AN', 'AP', 'FM', 'MC', 'PU']],
    ['ALTMOLISE', ['CB', 'IS']],
    ['ALTPIEMONTE', ['AL', 'AT', 'BI', 'CN', 'NO', 'TO', 'VB', 'VC']],
    ['ALTPUGLIA', ['BA', 'BR', 'BT', 'FG', 'LE', 'TA']],
    ['ALTSARDEGNA', ['CA', 'CI', 'NU', 'OG', 'OR', 'OT', 'SS', 'SU', 'VS']],
    ['ALTSICILIA', ['AG', 'CL', 'CT', 'EN', 'ME', 'PA', 'RG', 'SR', 'TP']],
    ['ALTTOSCANA', ['AR', 'FI', 'GR', 'LI', 'LU', 'MS', 'PI', 'PO', 'PT', 'SI']],
    ['ALTTRENTINOALTOADIGE', ['BZ', 'TN']],
    ['ALTUMBRIA', ['PG', 'TR']],
    ['ALTVALLEDAOSTA', ['AO']],
    ['ALTVENETO', ['BL', 'PD', 'RO', 'TV', 'VE', 'VI', 'VR']],
  ]
  for (const [dataset, provinces] of groups) for (const province of provinces) map.set(province, dataset)
  return map
}
