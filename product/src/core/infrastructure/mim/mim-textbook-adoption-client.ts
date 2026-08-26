import type { MimTextbookRecord } from '@/core/domain/mim-textbook-discovery'

const MIM_SPARQL_SERVICE = 'https://dati.istruzione.it/opendata/opendata/sparql/endpoint/query/service/'
const MIM_TOTAL_DISCOVERY_TIMEOUT_MS = 12_000

/**
 * Versioned adapter metadata.
 * The current MIM adoption datasets were published on 2026-07-29 with
 * temporal coverage "Anno scolastico" and are the 2026/2027 adoption snapshot.
 * Discovery fails closed for a different active academic year until this
 * adapter metadata is deliberately advanced and re-verified.
 */
export const MIM_ADOPTION_SNAPSHOT = {
  academicYearCode: '202627',
  publishedOn: '2026-07-29',
} as const

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

const SCHOOL_REGISTRY_DATASETS = [
  'SCUANAGRAFESTAT',
  'SCUANAGRAFEPAR',
  'SCUANAAUTSTAT',
  'SCUANAAUTPAR',
] as const

type MimDatasetCode = typeof DATASETS[number]
type SchoolRegistryDatasetCode = typeof SCHOOL_REGISTRY_DATASETS[number]
type SparqlDatasetCode = MimDatasetCode | SchoolRegistryDatasetCode

type SparqlBinding = {
  subject?: { value?: string }
  predicate?: { value?: string }
  value?: { value?: string }
}

type SparqlResponse = {
  results?: { bindings?: SparqlBinding[] }
}

type QueryResult = {
  available: boolean
  payload: SparqlResponse | null
}

type MimSchoolRegistryRecord = {
  academicYearCode: string
  schoolCode: string
  instituteReferenceCode: string | null
  province: string | null
}

const PROVINCE_DATASET = buildProvinceDatasetMap()

export class MimTextbookAdoptionClient {
  async discoverBySchoolCode(
    schoolCode: string,
    academicYearCode: string,
  ): Promise<{
    datasetCodes: string[]
    records: MimTextbookRecord[]
    resolvedSchoolCodes: string[]
  }> {
    const normalizedSchoolCode = normalizeSchoolCode(schoolCode)
    assertSupportedMimAcademicYear(academicYearCode)

    const signal = AbortSignal.timeout(MIM_TOTAL_DISCOVERY_TIMEOUT_MS)
    const resolvedSchoolCodes = await resolveAdoptionSchoolCodes(
      normalizedSchoolCode,
      academicYearCode,
      signal,
    )

    const datasets = adoptionDatasetsForSchoolCodes(resolvedSchoolCodes)
    const queryTargets = datasets.length ? datasets : [...DATASETS]
    const queries = queryTargets.map(async (datasetCode) => {
      const codesForDataset = datasets.length
        ? resolvedSchoolCodes.filter((code) => datasetForSchoolCode(code) === datasetCode)
        : resolvedSchoolCodes
      const result = await querySparql(datasetCode, buildSchoolsQuery(codesForDataset), signal)
      return { datasetCode, result }
    })
    const results = await Promise.all(queries)
    const availableResults = results.filter(({ result }) => result.available)

    if (!availableResults.length) {
      throw new Error('Il servizio Open Data MIM per le adozioni non è disponibile in questo momento.')
    }

    const targetCodes = new Set(resolvedSchoolCodes)
    const records = availableResults.flatMap(({ datasetCode, result }) =>
      parseMimSparqlBindings(result.payload?.results?.bindings ?? [], datasetCode)
        .filter((record) => targetCodes.has(normalizeSchoolCode(record.schoolCode))),
    )

    return {
      datasetCodes: availableResults.map(({ datasetCode }) => datasetCode),
      records,
      resolvedSchoolCodes,
    }
  }
}

export function assertSupportedMimAcademicYear(academicYearCode: string) {
  if (academicYearCode !== MIM_ADOPTION_SNAPSHOT.academicYearCode) {
    throw new Error(
      `La discovery MIM è verificata per l'anno scolastico ${formatAcademicYearCode(MIM_ADOPTION_SNAPSHOT.academicYearCode)}; ` +
      `l'anno attivo è ${formatAcademicYearCode(academicYearCode)}. Nessuna proposta è stata importata.`,
    )
  }
}

export function parseMimSchoolRegistryBindings(bindings: SparqlBinding[]): MimSchoolRegistryRecord[] {
  const subjects = groupBindingsBySubject(bindings)
  const records: MimSchoolRegistryRecord[] = []

  for (const fields of subjects.values()) {
    const academicYearCode = field(fields, 'annoscolastico')
    const schoolCode = field(fields, 'codicescuola')
    if (!academicYearCode || !schoolCode) continue

    records.push({
      academicYearCode,
      schoolCode: normalizeSchoolCode(schoolCode),
      instituteReferenceCode: normalizeNullableSchoolCode(nullableField(fields, 'codiceistitutodiriferimento')),
      province: nullableField(fields, 'provincia'),
    })
  }

  return records
}

export function parseMimSparqlBindings(bindings: SparqlBinding[], sourceDataset: string): MimTextbookRecord[] {
  const subjects = groupBindingsBySubject(bindings)
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

async function resolveAdoptionSchoolCodes(
  schoolCode: string,
  academicYearCode: string,
  signal: AbortSignal,
) {
  const query = buildSchoolRegistryQuery(schoolCode, academicYearCode)
  const results = await Promise.all(
    SCHOOL_REGISTRY_DATASETS.map(async (datasetCode) => ({
      datasetCode,
      result: await querySparql(datasetCode, query, signal),
    })),
  )
  const availableResults = results.filter(({ result }) => result.available)
  if (!availableResults.length) {
    throw new Error('L’anagrafe scuole MIM non è disponibile in questo momento.')
  }

  const registryRecords = availableResults.flatMap(({ result }) =>
    parseMimSchoolRegistryBindings(result.payload?.results?.bindings ?? []),
  )
  const resolved = registryRecords
    .filter((record) => record.academicYearCode === academicYearCode)
    .filter((record) => record.schoolCode === schoolCode || record.instituteReferenceCode === schoolCode)
    .map((record) => record.schoolCode)

  // If Settings already contains the adoption-specific plesso code, keep it as
  // a valid direct candidate even when the registry endpoint has no matching row.
  return unique(resolved.length ? resolved : [schoolCode])
}

function adoptionDatasetsForSchoolCodes(schoolCodes: string[]) {
  return unique(
    schoolCodes
      .map((code) => datasetForSchoolCode(code))
      .filter((dataset): dataset is MimDatasetCode => dataset !== null),
  )
}

function datasetForSchoolCode(schoolCode: string): MimDatasetCode | null {
  return PROVINCE_DATASET.get(schoolCode.slice(0, 2)) ?? null
}

function buildSchoolRegistryQuery(schoolCode: string, academicYearCode: string) {
  return `SELECT ?subject ?predicate ?value WHERE {
  ?subject ?lookupPredicate ?lookupValue .
  FILTER(UCASE(STR(?lookupValue)) = "${schoolCode}")
  ?subject ?yearPredicate ?yearValue .
  FILTER(STR(?yearValue) = "${academicYearCode}")
  ?subject ?predicate ?value .
}
LIMIT 5000`
}

function buildSchoolsQuery(schoolCodes: string[]) {
  const values = schoolCodes.map((code) => `"${code}"`).join(', ')
  return `SELECT ?subject ?predicate ?value WHERE {
  ?subject ?schoolCodePredicate ?schoolCode .
  FILTER(UCASE(STR(?schoolCode)) IN (${values}))
  ?subject ?predicate ?value .
}
LIMIT 20000`
}

async function querySparql(
  datasetCode: SparqlDatasetCode,
  query: string,
  signal: AbortSignal,
): Promise<QueryResult> {
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
      signal,
    })
    if (response.ok) return { available: true, payload: await response.json() as SparqlResponse }
    if (response.status !== 405 && response.status !== 404) return { available: false, payload: null }
  } catch {
    if (signal.aborted) return { available: false, payload: null }
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
      signal,
    })
    if (!response.ok) return { available: false, payload: null }
    return { available: true, payload: await response.json() as SparqlResponse }
  } catch {
    return { available: false, payload: null }
  }
}

function groupBindingsBySubject(bindings: SparqlBinding[]) {
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

  return subjects
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

function normalizeNullableSchoolCode(value: string | null) {
  if (!value) return null
  try {
    return normalizeSchoolCode(value)
  } catch {
    return null
  }
}

function normalizeSchoolCode(value: string) {
  const normalized = value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (!/^[A-Z0-9]{6,12}$/.test(normalized)) throw new Error('Codice meccanografico non valido')
  return normalized
}

function formatAcademicYearCode(value: string) {
  if (!/^\d{6}$/.test(value)) return value
  return `${value.slice(0, 4)}/${value.slice(4)}`
}

function unique<T>(values: T[]) {
  return [...new Set(values)]
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
