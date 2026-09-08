import {
  scoreDiscipline,
  type MimTeachingContext,
  type MimTextbookRecord,
} from '@/core/domain/mim-textbook-discovery'
import {
  MIM_ADOPTION_SNAPSHOT,
  assertSupportedMimAcademicYear,
  parseMimSchoolRegistryBindings,
  parseMimSparqlBindings,
} from './mim-textbook-adoption-client'

const MIM_SPARQL_SERVICE = 'https://dati.istruzione.it/opendata/opendata/sparql/endpoint/query/service/'
const MIM_SPARQL_TIMEOUT_MS = 15_000

const MIM_HTTP_HEADERS = {
  accept: 'application/sparql-results+json,application/json;q=0.9,*/*;q=0.5',
  'accept-language': 'it-IT,it;q=0.9,en;q=0.7',
  'user-agent': 'DocenteOS/2026.27 (+https://github.com/antoniocorsano-boop/docente-os-2026-27)',
} as const

const SCHOOL_REGISTRY_DATASETS = [
  'SCUANAGRAFESTAT',
  'SCUANAGRAFEPAR',
  'SCUANAAUTSTAT',
  'SCUANAAUTPAR',
] as const

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
type SparqlDatasetCode = MimDatasetCode | typeof SCHOOL_REGISTRY_DATASETS[number]

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

const PROVINCE_DATASET = buildProvinceDatasetMap()
const GRADE_NUMBER: Record<MimTeachingContext['grade'], number> = {
  PRIMA: 1,
  SECONDA: 2,
  TERZA: 3,
}

/**
 * Interactive MIM discovery. It never downloads the regional adoption CSV:
 * the request is scoped to verified plessi and the grade/section pairs already
 * present in the teacher's Cattedra. Discipline matching remains conservative
 * and is applied to the small SPARQL result set.
 */
export class MimTargetedAdoptionClient {
  async discoverBySchoolCode(
    schoolCode: string,
    academicYearCode: string,
    teachingContexts: MimTeachingContext[],
  ): Promise<{
    datasetCodes: string[]
    records: MimTextbookRecord[]
    resolvedSchoolCodes: string[]
  }> {
    assertSupportedMimAcademicYear(academicYearCode)
    const normalizedSchoolCode = normalizeSchoolCode(schoolCode)
    const contexts = normalizeTeachingContexts(teachingContexts)
    if (!contexts.length) throw new Error('La ricerca MIM mirata richiede almeno una classe della Cattedra.')

    const resolvedSchoolCodes = await resolveSchoolCodesViaSparql(
      normalizedSchoolCode,
      academicYearCode,
    )

    const datasets = groupSchoolCodesByDataset(resolvedSchoolCodes)
    if (!datasets.size) {
      throw new Error('Nessun dataset regionale MIM è stato determinato dai plessi verificati.')
    }

    const records: MimTextbookRecord[] = []
    const availableDatasets = new Set<string>()

    for (const [datasetCode, codes] of datasets) {
      const query = buildMimScopedAdoptionQuery(codes, contexts)
      const result = await querySparql(datasetCode, query)
      if (!result.available) continue

      availableDatasets.add(datasetCode)
      records.push(
        ...filterRecordsToTeachingContexts(
          parseMimSparqlBindings(result.payload?.results?.bindings ?? [], datasetCode),
          contexts,
          new Set(codes),
        ),
      )
    }

    if (!availableDatasets.size) {
      throw new Error(
        'L’endpoint SPARQL MIM mirato non è raggiungibile. DOCENTE OS non scarica il CSV regionale completo durante la ricerca interattiva.',
      )
    }

    return {
      datasetCodes: [...availableDatasets],
      records: dedupeRecords(records),
      resolvedSchoolCodes,
    }
  }
}

export function buildMimScopedAdoptionQuery(
  schoolCodes: string[],
  teachingContexts: MimTeachingContext[],
) {
  const codes = unique(schoolCodes.map(normalizeSchoolCode))
  const contexts = normalizeTeachingContexts(teachingContexts)
  if (!codes.length) throw new Error('At least one school code is required')
  if (!contexts.length) throw new Error('At least one teaching context is required')

  const codeValues = codes.map((code) => `"${escapeSparqlString(code)}"`).join(', ')
  const classFilters = unique(
    contexts.map((context) =>
      `(STR(?gradeValue) = "${GRADE_NUMBER[context.grade]}" && UCASE(STR(?sectionValue)) = "${escapeSparqlString(context.sectionCode)}")`,
    ),
  ).join(' ||\n    ')

  return `SELECT ?subject ?predicate ?value WHERE {
  ?subject ?schoolPredicate ?schoolValue .
  FILTER(STRENDS(LCASE(STR(?schoolPredicate)), "codicescuola"))
  FILTER(UCASE(STR(?schoolValue)) IN (${codeValues}))

  ?subject ?gradePredicate ?gradeValue .
  FILTER(STRENDS(LCASE(STR(?gradePredicate)), "annocorso"))

  ?subject ?sectionPredicate ?sectionValue .
  FILTER(STRENDS(LCASE(STR(?sectionPredicate)), "sezioneanno"))

  FILTER(
    ${classFilters}
  )

  ?subject ?predicate ?value .
}
LIMIT 10000`
}

export function filterRecordsToTeachingContexts(
  records: MimTextbookRecord[],
  teachingContexts: MimTeachingContext[],
  schoolCodes?: ReadonlySet<string>,
) {
  const contexts = normalizeTeachingContexts(teachingContexts)
  const normalizedSchools = schoolCodes
    ? new Set([...schoolCodes].map(normalizeSchoolCode))
    : null

  return records.filter((record) => {
    if (normalizedSchools && !normalizedSchools.has(normalizeSchoolCode(record.schoolCode))) return false
    return contexts.some((context) =>
      record.gradeNumber === GRADE_NUMBER[context.grade]
      && normalizeSectionCode(record.sectionCode) === context.sectionCode
      && scoreDiscipline(context.disciplineName, record.discipline) >= 0.75,
    )
  })
}

async function resolveSchoolCodesViaSparql(
  schoolCode: string,
  academicYearCode: string,
) {
  const query = buildSchoolRegistryQuery(schoolCode, academicYearCode)
  const results = await Promise.all(
    SCHOOL_REGISTRY_DATASETS.map(async (datasetCode) => ({
      result: await querySparql(datasetCode, query),
    })),
  )
  const available = results.filter(({ result }) => result.available)
  const records = available.flatMap(({ result }) =>
    parseMimSchoolRegistryBindings(result.payload?.results?.bindings ?? []),
  )

  const resolved = unique(
    records
      .filter((record) => record.academicYearCode === academicYearCode)
      .filter((record) =>
        normalizeSchoolCode(record.schoolCode) === schoolCode
        || normalizeNullableSchoolCode(record.instituteReferenceCode) === schoolCode,
      )
      .map((record) => normalizeSchoolCode(record.schoolCode)),
  )

  if (resolved.length) return resolved
  if (available.length) {
    throw new Error(
      `Il codice MIM ${schoolCode} non è stato risolto in alcun plesso dall’anagrafe MIM. Nessuna proposta è stata importata.`,
    )
  }

  throw new Error(
    'L’anagrafe scuole MIM non è raggiungibile via SPARQL. DOCENTE OS non scarica l’anagrafe completa durante la ricerca interattiva.',
  )
}

async function querySparql(
  datasetCode: SparqlDatasetCode,
  query: string,
): Promise<QueryResult> {
  const endpoint = new URL(MIM_SPARQL_SERVICE)
  endpoint.searchParams.set('ds', datasetCode)
  endpoint.searchParams.set('query', query)
  endpoint.searchParams.set('format', 'application/sparql-results+json')

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        ...MIM_HTTP_HEADERS,
        referer: `https://dati.istruzione.it/opendata/opendata/sparql/endpoint/query/?dataset=${encodeURIComponent(datasetCode)}`,
      },
      signal: AbortSignal.timeout(MIM_SPARQL_TIMEOUT_MS),
    })
    if (response.ok) {
      return { available: true, payload: await response.json() as SparqlResponse }
    }
  } catch {
    // Try POST below: MIM deployments have differed in accepted methods.
  }

  const postEndpoint = new URL(MIM_SPARQL_SERVICE)
  postEndpoint.searchParams.set('ds', datasetCode)
  try {
    const response = await fetch(postEndpoint, {
      method: 'POST',
      cache: 'no-store',
      headers: {
        ...MIM_HTTP_HEADERS,
        'content-type': 'application/x-www-form-urlencoded;charset=UTF-8',
        referer: `https://dati.istruzione.it/opendata/opendata/sparql/endpoint/query/?dataset=${encodeURIComponent(datasetCode)}`,
      },
      body: new URLSearchParams({ query, format: 'application/sparql-results+json' }),
      signal: AbortSignal.timeout(MIM_SPARQL_TIMEOUT_MS),
    })
    if (!response.ok) return { available: false, payload: null }
    return { available: true, payload: await response.json() as SparqlResponse }
  } catch {
    return { available: false, payload: null }
  }
}

function buildSchoolRegistryQuery(schoolCode: string, academicYearCode: string) {
  return `SELECT ?subject ?predicate ?value WHERE {
  ?subject ?lookupPredicate ?lookupValue .
  FILTER(UCASE(STR(?lookupValue)) = "${escapeSparqlString(schoolCode)}")
  ?subject ?yearPredicate ?yearValue .
  FILTER(STR(?yearValue) = "${escapeSparqlString(academicYearCode)}")
  ?subject ?predicate ?value .
}
LIMIT 5000`
}

function normalizeTeachingContexts(contexts: MimTeachingContext[]) {
  const seen = new Set<string>()
  return contexts.flatMap((context) => {
    const sectionCode = normalizeSectionCode(context.sectionCode)
    const disciplineName = context.disciplineName.trim()
    if (!sectionCode || !disciplineName) return []
    const normalized = { ...context, sectionCode, disciplineName }
    const key = `${context.grade}:${sectionCode}:${disciplineName.toLocaleUpperCase('it')}`
    if (seen.has(key)) return []
    seen.add(key)
    return [normalized]
  })
}

function groupSchoolCodesByDataset(schoolCodes: string[]) {
  const groups = new Map<MimDatasetCode, string[]>()
  for (const schoolCode of unique(schoolCodes.map(normalizeSchoolCode))) {
    const dataset = PROVINCE_DATASET.get(schoolCode.slice(0, 2))
    if (!dataset) continue
    groups.set(dataset, [...(groups.get(dataset) ?? []), schoolCode])
  }
  return groups
}

function normalizeSchoolCode(value: string) {
  const normalized = value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (!/^[A-Z0-9]{6,12}$/.test(normalized)) throw new Error('Codice meccanografico non valido')
  return normalized
}

function normalizeNullableSchoolCode(value: string | null) {
  if (!value) return null
  try {
    return normalizeSchoolCode(value)
  } catch {
    return null
  }
}

function normalizeSectionCode(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
}

function escapeSparqlString(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

function dedupeRecords(records: MimTextbookRecord[]) {
  const seen = new Set<string>()
  return records.filter((record) => {
    const key = [
      normalizeSchoolCode(record.schoolCode),
      record.gradeNumber,
      normalizeSectionCode(record.sectionCode),
      record.isbn13.replace(/[^0-9X]/gi, ''),
      record.discipline.trim().toLocaleUpperCase('it'),
    ].join(':')
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
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

  for (const [dataset, provinceCodes] of groups) {
    for (const code of provinceCodes) map.set(code, dataset)
  }
  return map
}

export const MIM_TARGETED_ADOPTION_SNAPSHOT = MIM_ADOPTION_SNAPSHOT
