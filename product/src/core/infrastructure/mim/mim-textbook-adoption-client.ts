import type { MimTextbookRecord } from '@/core/domain/mim-textbook-discovery'

const MIM_SPARQL_SERVICE = 'https://dati.istruzione.it/opendata/opendata/sparql/endpoint/query/service/'
const MIM_SCHOOL_CATALOG = 'https://dati.istruzione.it/opendata/opendata/catalogo/elements1/?area=Scuole'
const MIM_ADOPTION_CATALOG = 'https://dati.istruzione.it/opendata/opendata/catalogo/elements1/?area=Adozioni+libri+di+testo'
const MIM_DATASET_CATALOG_BASE = 'https://dati.istruzione.it/opendata/opendata/catalog/'
const DATA_GOV_PACKAGE_SEARCH = 'https://www.dati.gov.it/opendata/api/3/action/package_search'
const MIM_SPARQL_TIMEOUT_MS = 10_000
const MIM_CATALOG_TIMEOUT_MS = 15_000
const DATA_GOV_TIMEOUT_MS = 15_000
const MIM_CSV_TIMEOUT_MS = 120_000

const MIM_HTTP_HEADERS = {
  accept: 'text/html,application/xhtml+xml,application/json,text/csv;q=0.9,*/*;q=0.8',
  'accept-language': 'it-IT,it;q=0.9,en;q=0.7',
  'user-agent': 'DocenteOS/2026.27 (+https://github.com/antoniocorsano-boop/docente-os-2026-27)',
} as const

/**
 * Versioned adapter metadata.
 * The MIM adoption catalogue is updated weekly during the adoption period.
 * The current Campania snapshot was verified on 2026-09-07 and belongs to
 * academic year 2026/2027. Discovery fails closed for a different active
 * academic year until this metadata is deliberately advanced and re-verified.
 */
export const MIM_ADOPTION_SNAPSHOT = {
  academicYearCode: '202627',
  publishedOn: '2026-09-07',
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

type CsvLookupResult<T> = {
  available: boolean
  records: T[]
}

type CkanResource = {
  format?: string | null
  mimetype?: string | null
  name?: string | null
  description?: string | null
  url?: string | null
}

type CkanPackage = {
  id?: string | null
  name?: string | null
  title?: string | null
  identifier?: string | null
  url?: string | null
  notes?: string | null
  resources?: CkanResource[] | null
  extras?: Array<{ key?: string | null; value?: string | null }> | null
}

export type DatiGovPackageSearchResponse = {
  success?: boolean
  result?: {
    results?: CkanPackage[]
  }
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

    const resolvedSchoolCodes = await resolveAdoptionSchoolCodes(
      normalizedSchoolCode,
      academicYearCode,
    )

    const datasets = adoptionDatasetsForSchoolCodes(resolvedSchoolCodes)
    const queryTargets = datasets.length ? datasets : [...DATASETS]
    const targetCodes = new Set(resolvedSchoolCodes)
    const records: MimTextbookRecord[] = []
    const availableDatasets = new Set<string>()

    for (const datasetCode of queryTargets) {
      const codesForDataset = datasets.length
        ? resolvedSchoolCodes.filter((code) => datasetForSchoolCode(code) === datasetCode)
        : resolvedSchoolCodes
      if (!codesForDataset.length) continue

      const sparql = await querySparql(
        datasetCode,
        buildSchoolsQuery(codesForDataset),
        AbortSignal.timeout(MIM_SPARQL_TIMEOUT_MS),
      )

      if (sparql.available) {
        const sparqlRecords = parseMimSparqlBindings(
          sparql.payload?.results?.bindings ?? [],
          datasetCode,
        ).filter((record) => targetCodes.has(normalizeSchoolCode(record.schoolCode)))
        if (sparqlRecords.length) {
          availableDatasets.add(datasetCode)
          records.push(...sparqlRecords)
          continue
        }
      }

      const csv = await lookupAdoptionsFromOfficialCsv(datasetCode, targetCodes)
      if (csv.available) {
        availableDatasets.add(datasetCode)
        records.push(...csv.records)
        continue
      }

      if (sparql.available) availableDatasets.add(datasetCode)
    }

    if (!availableDatasets.size) {
      throw new Error(
        'Le fonti Open Data MIM per le adozioni non sono raggiungibili via SPARQL, catalogo MIM o catalogo nazionale dati.gov.it.',
      )
    }

    return {
      datasetCodes: [...availableDatasets],
      records: dedupeTextbookRecords(records),
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
    const instituteReference = nullableField(fields, 'codiceistitutoriferimento')
      ?? nullableField(fields, 'codiceistitutodiriferimento')
    if (!academicYearCode || !schoolCode) continue

    records.push({
      academicYearCode,
      schoolCode: normalizeSchoolCode(schoolCode),
      instituteReferenceCode: normalizeNullableSchoolCode(instituteReference),
      province: nullableField(fields, 'provincia'),
    })
  }

  return records
}

export function parseMimSparqlBindings(bindings: SparqlBinding[], sourceDataset: string): MimTextbookRecord[] {
  const subjects = groupBindingsBySubject(bindings)
  const records: MimTextbookRecord[] = []

  for (const [subject, fields] of subjects) {
    const record = textbookRecordFromFields(fields, sourceDataset, subject)
    if (record) records.push(record)
  }

  return records
}

export function parseMimSchoolRegistryCsv(
  csv: string,
  schoolCode: string,
  academicYearCode: string,
): MimSchoolRegistryRecord[] {
  const target = normalizeSchoolCode(schoolCode)
  const records: MimSchoolRegistryRecord[] = []
  let headers: string[] | null = null

  forEachCsvRow(csv, (row) => {
    if (!headers) {
      headers = row.map(normalizeFieldKey)
      return
    }
    const fields = csvFields(headers, row)
    const year = field(fields, 'annoscolastico')
    const rowSchoolCode = nullableNormalizedSchoolCode(field(fields, 'codicescuola'))
    const instituteReferenceCode = normalizeNullableSchoolCode(
      nullableField(fields, 'codiceistitutoriferimento')
        ?? nullableField(fields, 'codiceistitutodiriferimento'),
    )
    if (!rowSchoolCode || year !== academicYearCode) return
    if (rowSchoolCode !== target && instituteReferenceCode !== target) return

    records.push({
      academicYearCode: year,
      schoolCode: rowSchoolCode,
      instituteReferenceCode,
      province: nullableField(fields, 'provincia'),
    })
  })

  return records
}

export function parseMimAdoptionCsv(
  csv: string,
  sourceDataset: string,
  schoolCodes: ReadonlySet<string>,
): MimTextbookRecord[] {
  const normalizedTargets = new Set([...schoolCodes].map(normalizeSchoolCode))
  const records: MimTextbookRecord[] = []
  let headers: string[] | null = null
  let rowNumber = 0

  forEachCsvRow(csv, (row) => {
    rowNumber += 1
    if (!headers) {
      headers = row.map(normalizeFieldKey)
      return
    }
    const fields = csvFields(headers, row)
    const rowSchoolCode = nullableNormalizedSchoolCode(field(fields, 'codicescuola'))
    if (!rowSchoolCode || !normalizedTargets.has(rowSchoolCode)) return

    const record = textbookRecordFromFields(
      fields,
      sourceDataset,
      `csv:${sourceDataset}:${rowSchoolCode}:${rowNumber}`,
    )
    if (record) records.push(record)
  })

  return records
}

/**
 * Resolve a CSV distribution from the federated national catalogue while
 * preserving MIM as the authoritative source. Only distributions hosted by
 * dati.istruzione.it are accepted.
 */
export function resolveDatiGovMimCsvUrl(
  payload: DatiGovPackageSearchResponse,
  datasetCode: string,
  academicYearCode?: string,
) {
  if (!payload.success) return null
  const packages = payload.result?.results ?? []
  const normalizedDatasetCode = datasetCode.toUpperCase()
  const candidates: Array<{ url: string; evidence: string }> = []

  for (const item of packages) {
    if (!ckanPackageMatchesDataset(item, normalizedDatasetCode)) continue
    for (const resource of item.resources ?? []) {
      if (!resourceLooksLikeCsv(resource)) continue
      const url = normalizeMimDistributionUrl(resource.url)
      if (!url) continue
      candidates.push({
        url,
        evidence: [resource.name, resource.description, resource.format, resource.mimetype, resource.url]
          .filter(Boolean)
          .join(' '),
      })
    }
  }

  if (!candidates.length) return null
  if (!academicYearCode) return candidates[0].url

  const exactYear = candidates.find((candidate) => candidate.evidence.includes(academicYearCode))
  if (exactYear) return exactYear.url

  const mentionsOtherAcademicYear = candidates.some((candidate) =>
    extractAcademicYearCodes(candidate.evidence).some((code) => code !== academicYearCode),
  )
  return mentionsOtherAcademicYear ? null : candidates[0].url
}

export function resolveMimCsvUrlFromCatalogHtml(
  html: string,
  pageUrl: string,
  datasetCode: string,
  academicYearCode?: string,
) {
  const hrefs = [...html.matchAll(/href\s*=\s*["']([^"']+\.csv(?:\?[^"']*)?)["']/gi)]
    .map((match) => decodeHtmlAttribute(match[1]))
    .filter((href) => href.toUpperCase().includes(datasetCode.toUpperCase()))
  const selected = selectAcademicYearDistribution(hrefs, academicYearCode)
  return selected ? normalizeMimDistributionUrl(new URL(selected, pageUrl).toString()) : null
}

export function fallbackAdoptionSchoolCodesWhenRegistryHasNoMatch(schoolCode: string) {
  const normalizedSchoolCode = normalizeSchoolCode(schoolCode)

  if (/^[A-Z]{2}IC[A-Z0-9]{6}$/.test(normalizedSchoolCode)) {
    throw new Error(
      `Il codice di istituto MIM ${normalizedSchoolCode} non è stato risolto in alcun plesso. Nessuna proposta è stata importata.`,
    )
  }

  return [normalizedSchoolCode]
}

async function resolveAdoptionSchoolCodes(
  schoolCode: string,
  academicYearCode: string,
) {
  const query = buildSchoolRegistryQuery(schoolCode, academicYearCode)
  const results = await Promise.all(
    SCHOOL_REGISTRY_DATASETS.map(async (datasetCode) => ({
      datasetCode,
      result: await querySparql(
        datasetCode,
        query,
        AbortSignal.timeout(MIM_SPARQL_TIMEOUT_MS),
      ),
    })),
  )
  const availableResults = results.filter(({ result }) => result.available)
  const sparqlRecords = availableResults.flatMap(({ result }) =>
    parseMimSchoolRegistryBindings(result.payload?.results?.bindings ?? []),
  )
  const resolvedFromSparql = resolveSchoolCodesFromRecords(sparqlRecords, schoolCode, academicYearCode)
  if (resolvedFromSparql.length) return resolvedFromSparql

  const csvResult = await lookupSchoolRegistryFromOfficialCsv(schoolCode, academicYearCode)
  const resolvedFromCsv = resolveSchoolCodesFromRecords(csvResult.records, schoolCode, academicYearCode)
  if (resolvedFromCsv.length) return resolvedFromCsv

  if (availableResults.length || csvResult.available) {
    return fallbackAdoptionSchoolCodesWhenRegistryHasNoMatch(schoolCode)
  }

  throw new Error(
    'L’anagrafe scuole MIM non è raggiungibile via SPARQL, catalogo MIM o catalogo nazionale dati.gov.it.',
  )
}

function resolveSchoolCodesFromRecords(
  records: MimSchoolRegistryRecord[],
  schoolCode: string,
  academicYearCode: string,
) {
  return unique(
    records
      .filter((record) => record.academicYearCode === academicYearCode)
      .filter((record) => record.schoolCode === schoolCode || record.instituteReferenceCode === schoolCode)
      .map((record) => record.schoolCode),
  )
}

async function lookupSchoolRegistryFromOfficialCsv(
  schoolCode: string,
  academicYearCode: string,
): Promise<CsvLookupResult<MimSchoolRegistryRecord>> {
  let anyAvailable = false
  const records: MimSchoolRegistryRecord[] = []

  for (const datasetCode of SCHOOL_REGISTRY_DATASETS) {
    const csv = await fetchOfficialCsv(MIM_SCHOOL_CATALOG, datasetCode, academicYearCode)
    if (!csv.available) continue
    anyAvailable = true
    records.push(...parseMimSchoolRegistryCsv(csv.text, schoolCode, academicYearCode))
    if (records.length) break
  }

  return { available: anyAvailable, records }
}

async function lookupAdoptionsFromOfficialCsv(
  datasetCode: MimDatasetCode,
  schoolCodes: ReadonlySet<string>,
): Promise<CsvLookupResult<MimTextbookRecord>> {
  const csv = await fetchOfficialCsv(
    MIM_ADOPTION_CATALOG,
    datasetCode,
    MIM_ADOPTION_SNAPSHOT.academicYearCode,
  )
  if (!csv.available) return { available: false, records: [] }
  return {
    available: true,
    records: parseMimAdoptionCsv(csv.text, datasetCode, schoolCodes),
  }
}

async function fetchOfficialCsv(
  catalogUrl: string,
  datasetCode: string,
  academicYearCode?: string,
): Promise<{ available: boolean; text: string }> {
  const resolvers = [
    () => resolveFederatedCsvUrl(datasetCode, academicYearCode),
    () => resolveMimDatasetCatalogCsvUrl(datasetCode, academicYearCode),
    () => resolveMimCatalogCsvUrl(catalogUrl, datasetCode, academicYearCode),
  ]
  const attemptedUrls = new Set<string>()

  for (const resolve of resolvers) {
    const csvUrl = await resolve()
    if (!csvUrl || attemptedUrls.has(csvUrl)) continue
    attemptedUrls.add(csvUrl)

    try {
      const response = await fetch(csvUrl, {
        cache: 'no-store',
        headers: {
          ...MIM_HTTP_HEADERS,
          accept: 'text/csv,application/csv,application/octet-stream;q=0.9,*/*;q=0.5',
          referer: catalogUrl,
        },
        signal: AbortSignal.timeout(MIM_CSV_TIMEOUT_MS),
      })
      if (!response.ok) continue
      return { available: true, text: await response.text() }
    } catch {
      continue
    }
  }

  return { available: false, text: '' }
}

async function resolveMimDatasetCatalogCsvUrl(
  datasetCode: string,
  academicYearCode?: string,
) {
  const datasetUrl = new URL(encodeURIComponent(datasetCode), MIM_DATASET_CATALOG_BASE).toString()
  try {
    const response = await fetch(datasetUrl, {
      cache: 'no-store',
      headers: MIM_HTTP_HEADERS,
      signal: AbortSignal.timeout(MIM_CATALOG_TIMEOUT_MS),
    })
    if (!response.ok) return null
    return resolveMimCsvUrlFromCatalogHtml(
      await response.text(),
      datasetUrl,
      datasetCode,
      academicYearCode,
    )
  } catch {
    return null
  }
}

async function resolveMimCatalogCsvUrl(
  catalogUrl: string,
  datasetCode: string,
  academicYearCode?: string,
) {
  try {
    const response = await fetch(catalogUrl, {
      cache: 'no-store',
      headers: MIM_HTTP_HEADERS,
      signal: AbortSignal.timeout(MIM_CATALOG_TIMEOUT_MS),
    })
    if (!response.ok) return null
    return resolveMimCsvUrlFromCatalogHtml(
      await response.text(),
      catalogUrl,
      datasetCode,
      academicYearCode,
    )
  } catch {
    return null
  }
}

async function resolveFederatedCsvUrl(datasetCode: string, academicYearCode?: string) {
  try {
    const url = new URL(DATA_GOV_PACKAGE_SEARCH)
    url.searchParams.set('q', datasetCode)
    url.searchParams.set('rows', '20')
    const response = await fetch(url, {
      cache: 'no-store',
      headers: {
        ...MIM_HTTP_HEADERS,
        accept: 'application/json',
      },
      signal: AbortSignal.timeout(DATA_GOV_TIMEOUT_MS),
    })
    if (!response.ok) return null
    const payload = await response.json() as DatiGovPackageSearchResponse
    return resolveDatiGovMimCsvUrl(payload, datasetCode, academicYearCode)
  } catch {
    return null
  }
}

function selectAcademicYearDistribution(hrefs: string[], academicYearCode?: string) {
  if (!hrefs.length) return null
  if (!academicYearCode) return hrefs[0]
  const exact = hrefs.find((href) => href.includes(academicYearCode))
  if (exact) return exact
  const mentionsOtherAcademicYear = hrefs.some((href) =>
    extractAcademicYearCodes(href).some((code) => code !== academicYearCode),
  )
  return mentionsOtherAcademicYear ? null : hrefs[0]
}

function extractAcademicYearCodes(value: string) {
  return [...value.matchAll(/20\d{4}/g)]
    .map((match) => match[0])
    .filter(isPlausibleAcademicYearCode)
}

function isPlausibleAcademicYearCode(value: string) {
  if (!/^20\d{4}$/.test(value)) return false
  const startYear = Number.parseInt(value.slice(0, 4), 10)
  const endYear = Number.parseInt(value.slice(4), 10)
  return endYear === (startYear + 1) % 100
}

function ckanPackageMatchesDataset(item: CkanPackage, datasetCode: string) {
  const evidence = [
    item.id,
    item.name,
    item.title,
    item.identifier,
    item.url,
    item.notes,
    ...(item.extras ?? []).flatMap((extra) => [extra.key, extra.value]),
    ...(item.resources ?? []).map((resource) => resource.url),
  ].filter(Boolean).join(' ').toUpperCase()
  return evidence.includes(datasetCode)
}

function resourceLooksLikeCsv(resource: CkanResource) {
  const format = `${resource.format ?? ''} ${resource.mimetype ?? ''}`.toUpperCase()
  const url = resource.url ?? ''
  return format.includes('CSV') || /\.csv(?:$|[?#])/i.test(url)
}

function normalizeMimDistributionUrl(value: string | null | undefined) {
  if (!value) return null
  try {
    const url = new URL(value)
    if (!/(^|\.)dati\.istruzione\.it$/i.test(url.hostname)) return null
    if (url.protocol === 'http:') url.protocol = 'https:'
    if (url.protocol !== 'https:') return null
    return url.toString()
  } catch {
    return null
  }
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
        ...MIM_HTTP_HEADERS,
        accept: 'application/sparql-results+json, application/json;q=0.9',
        'content-type': 'application/x-www-form-urlencoded;charset=UTF-8',
        referer: `https://dati.istruzione.it/opendata/opendata/sparql/endpoint/query/?dataset=${encodeURIComponent(datasetCode)}`,
      },
      body,
      signal,
    })
    if (response.ok) return { available: true, payload: await response.json() as SparqlResponse }
    if (response.status !== 405 && response.status !== 404) return { available: false, payload: null }
  } catch {
    if (signal.aborted) return { available: false, payload: null }
  }

  try {
    const url = new URL(endpoint)
    url.searchParams.set('query', query)
    url.searchParams.set('format', 'application/sparql-results+json')
    const response = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        ...MIM_HTTP_HEADERS,
        accept: 'application/sparql-results+json, application/json;q=0.9',
      },
      signal: AbortSignal.timeout(MIM_SPARQL_TIMEOUT_MS),
    })
    if (!response.ok) return { available: false, payload: null }
    return { available: true, payload: await response.json() as SparqlResponse }
  } catch {
    return { available: false, payload: null }
  }
}

function textbookRecordFromFields(
  fields: Map<string, string>,
  sourceDataset: string,
  sourceSubject: string,
): MimTextbookRecord | null {
  const schoolCode = field(fields, 'codicescuola')
  const gradeNumber = Number.parseInt(field(fields, 'annocorso'), 10)
  const sectionCode = field(fields, 'sezioneanno')
  const discipline = field(fields, 'disciplina')
  const isbn13 = field(fields, 'codiceisbn')
  const title = field(fields, 'titolo')
  const publisher = field(fields, 'editore')

  if (!schoolCode || !Number.isFinite(gradeNumber) || !sectionCode || !discipline || !isbn13 || !title || !publisher) return null

  return {
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
    sourceSubject,
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

function csvFields(headers: string[], row: string[]) {
  const fields = new Map<string, string>()
  for (let index = 0; index < headers.length; index += 1) {
    fields.set(headers[index], row[index]?.trim() ?? '')
  }
  return fields
}

function forEachCsvRow(csv: string, visit: (row: string[]) => void) {
  let row: string[] = []
  let value = ''
  let quoted = false

  const finishValue = () => {
    row.push(value)
    value = ''
  }
  const finishRow = () => {
    finishValue()
    if (row.some((item) => item.length > 0)) visit(row)
    row = []
  }

  for (let index = 0; index < csv.length; index += 1) {
    const character = csv[index]
    if (character === '"') {
      if (quoted && csv[index + 1] === '"') {
        value += '"'
        index += 1
      } else {
        quoted = !quoted
      }
      continue
    }
    if (character === ',' && !quoted) {
      finishValue()
      continue
    }
    if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && csv[index + 1] === '\n') index += 1
      finishRow()
      continue
    }
    value += character
  }

  if (value.length || row.length) finishRow()
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
  return nullableNormalizedSchoolCode(value)
}

function nullableNormalizedSchoolCode(value: string) {
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

function dedupeTextbookRecords(records: MimTextbookRecord[]) {
  const seen = new Set<string>()
  return records.filter((record) => {
    const key = [
      normalizeSchoolCode(record.schoolCode),
      record.gradeNumber,
      record.sectionCode.trim().toUpperCase(),
      record.isbn13.replace(/[^0-9X]/gi, ''),
      record.discipline.trim().toUpperCase(),
    ].join(':')
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function decodeHtmlAttribute(value: string) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

function buildProvinceDatasetMap() {
  const map = new Map<string, MimDatasetCode>()
  const groups: Array<[MimDatasetCode, string[]]> = [
    ['ALTABRUZZO', ['AQ', 'CH', 'PE', 'TE']],
    ['ALTBASILICATA', ['MT', 'PZ']],
    ['ALTCALABRIA', ['CS', 'CZ', 'KR', 'RC', 'VV']],
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
