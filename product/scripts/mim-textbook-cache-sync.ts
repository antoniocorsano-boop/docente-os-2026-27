import { pathToFileURL } from 'node:url'
import { scoreDiscipline } from '../src/core/domain/mim-textbook-discovery'

const DATA_GOV_PACKAGE_SEARCH = 'https://www.dati.gov.it/opendata/api/3/action/package_search'
const MIM_DATASET_CATALOG_BASE = 'https://dati.istruzione.it/opendata/opendata/catalog/'
const MIM_SCHOOL_CATALOG = 'https://dati.istruzione.it/opendata/opendata/catalogo/elements1/?area=Scuole'
const MIM_ADOPTION_CATALOG = 'https://dati.istruzione.it/opendata/opendata/catalogo/elements1/?area=Adozioni+libri+di+testo'
const MIM_CATALOG_TIMEOUT_MS = 20_000
const MIM_CSV_TIMEOUT_MS = 180_000
const EDGE_BATCH_SIZE = 100

const MIM_ADOPTION_SNAPSHOT = {
  academicYearCode: '202627',
  publishedOn: '2026-09-07',
} as const

const MIM_HTTP_HEADERS = {
  'accept-language': 'it-IT,it;q=0.9,en;q=0.7',
  'user-agent': 'DocenteOS/2026.27 (+https://github.com/antoniocorsano-boop/docente-os-2026-27)',
} as const

const REGISTRY_DATASETS = [
  'SCUANAGRAFESTAT',
  'SCUANAGRAFEPAR',
  'SCUANAAUTSTAT',
  'SCUANAAUTPAR',
] as const

const PROVINCE_DATASET = buildProvinceDatasetMap()
const GRADE_NUMBER: Record<string, number> = { PRIMA: 1, SECONDA: 2, TERZA: 3 }

type ScopeRow = {
  institute_code: string
  academic_year_code: string
  grade: string
  section_code: string
  discipline_name: string
}

type SchoolRecord = {
  instituteCode: string
  schoolCode: string
  province: string | null
}

type AdoptionRecord = {
  sourceDataset: string
  schoolCode: string
  gradeNumber: number
  sectionCode: string
  schoolGradeType: string | null
  combination: string | null
  discipline: string
  isbn13: string
  authors: string | null
  title: string
  subtitle: string | null
  volume: string | null
  publisher: string
  price: string | null
  newAdoption: string | null
  toPurchase: string | null
  recommended: string | null
  sourceSubject: string
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

type CkanResponse = {
  success?: boolean
  result?: { results?: CkanPackage[] }
}

type CsvSource = { dataset: string; url: string }
type CsvFields = Map<string, string>

type EdgeResponse<T> = T & { error?: string; message?: string }

export class IncrementalCsvParser {
  private row: string[] = []
  private value = ''
  private quoted = false
  private pendingQuote = false
  private previousCarriageReturn = false

  async feed(chunk: string, visit: (row: string[]) => Promise<void> | void) {
    for (const character of chunk) {
      if (this.previousCarriageReturn) {
        this.previousCarriageReturn = false
        if (character === '\n') continue
      }

      if (this.pendingQuote) {
        if (character === '"') {
          this.value += '"'
          this.pendingQuote = false
          continue
        }
        this.pendingQuote = false
        this.quoted = false
      }

      if (character === '"') {
        if (this.quoted) this.pendingQuote = true
        else this.quoted = true
        continue
      }

      if (character === ',' && !this.quoted) {
        this.finishValue()
        continue
      }

      if ((character === '\n' || character === '\r') && !this.quoted) {
        if (character === '\r') this.previousCarriageReturn = true
        await this.finishRow(visit)
        continue
      }

      this.value += character
    }
  }

  async finish(visit: (row: string[]) => Promise<void> | void) {
    if (this.pendingQuote) {
      this.pendingQuote = false
      this.quoted = false
    }
    if (this.quoted) throw new Error('MIM CSV ended inside a quoted field')
    if (this.value.length || this.row.length) await this.finishRow(visit)
  }

  private finishValue() {
    this.row.push(this.value)
    this.value = ''
  }

  private async finishRow(visit: (row: string[]) => Promise<void> | void) {
    this.finishValue()
    const row = this.row
    this.row = []
    if (row.some((item) => item.length > 0)) await visit(row)
  }
}

export function selectAcademicYearDistribution(hrefs: string[], academicYearCode?: string) {
  if (!hrefs.length) return null
  if (!academicYearCode) return hrefs[0]

  const exact = hrefs.find((href) =>
    extractAcademicYearCodes(href).includes(academicYearCode)
      && publicationDateMatchesAcademicYearCycle(href, academicYearCode),
  )
  if (exact) return exact

  return hrefs.find((href) =>
    extractAcademicYearCodes(href).length === 0
      && publicationDateMatchesAcademicYearCycle(href, academicYearCode),
  ) ?? null
}

export function adoptionRecordFromFields(
  fields: CsvFields,
  sourceDataset: string,
  sourceSubject: string,
  contexts: ScopeRow[],
  allowedSchoolCodes: ReadonlySet<string>,
): AdoptionRecord | null {
  const schoolCode = nullableSchoolCode(field(fields, 'codicescuola'))
  if (!schoolCode || !allowedSchoolCodes.has(schoolCode)) return null

  const gradeNumber = Number.parseInt(field(fields, 'annocorso'), 10)
  const sectionCode = normalizeSectionCode(field(fields, 'sezioneanno'))
  const discipline = field(fields, 'disciplina').trim()
  if (!Number.isInteger(gradeNumber) || !sectionCode || !discipline) return null

  const classContexts = contexts.filter((context) =>
    GRADE_NUMBER[context.grade] === gradeNumber
      && normalizeSectionCode(context.section_code) === sectionCode,
  )
  if (!classContexts.some((context) => scoreDiscipline(context.discipline_name, discipline) >= 0.75)) return null

  const isbn13 = field(fields, 'codiceisbn').replace(/[^0-9]/g, '')
  const title = field(fields, 'titolo').trim()
  const publisher = field(fields, 'editore').trim()
  if (!/^[0-9]{13}$/.test(isbn13) || !title || !publisher) return null

  return {
    sourceDataset,
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
    sourceSubject,
  }
}

async function main() {
  const edgeUrl = requiredEnv('MIM_SYNC_EDGE_URL')
  const token = requiredEnv('MIM_SYNC_TOKEN')
  const edge = new EdgeClient(edgeUrl, token)
  const scopePayload = await edge.call<{ scope: ScopeRow[] }>({ action: 'scope' })
  const scope = normalizeScope(scopePayload.scope ?? [])
  if (!scope.length) throw new Error('No confirmed active Cattedra scope is available for MIM synchronization')

  const groups = groupScope(scope)
  for (const contexts of groups.values()) await syncScopeGroup(edge, contexts)
}

async function syncScopeGroup(edge: EdgeClient, contexts: ScopeRow[]) {
  const instituteCode = contexts[0].institute_code
  const academicYearCode = contexts[0].academic_year_code
  if (academicYearCode !== MIM_ADOPTION_SNAPSHOT.academicYearCode) {
    throw new Error(`MIM adoption snapshot is not certified for academic year ${academicYearCode}`)
  }

  const registry = await resolveRegistryScope(instituteCode, academicYearCode)
  if (!registry.records.length) throw new Error(`No MIM plessi resolved for ${instituteCode}`)

  const datasetCodes = unique(registry.records.map((row) => datasetForSchoolCode(row.schoolCode)).filter(Boolean) as string[])
  if (!datasetCodes.length) throw new Error(`No regional MIM adoption dataset resolved for ${instituteCode}`)

  const adoptionSources: CsvSource[] = []
  for (const dataset of datasetCodes) {
    const url = await resolveOfficialCsvUrl(MIM_ADOPTION_CATALOG, dataset, academicYearCode, true)
    if (!url) throw new Error(`Official MIM CSV not resolved for ${dataset}`)
    adoptionSources.push({ dataset, url })
  }

  const sourceManifest = {
    authority: 'MIM Open Data',
    academicYearCode,
    synchronizedAt: new Date().toISOString(),
    registry: { dataset: registry.source.dataset, url: registry.source.url },
    adoptions: adoptionSources,
  }

  const begun = await edge.call<{ runId: string }>({
    action: 'begin',
    academicYearCode,
    sourceManifest,
  })
  const runId = begun.runId

  try {
    await edge.call({ action: 'schools', runId, records: registry.records })
    const allowedSchoolCodes = new Set(registry.records.map((row) => row.schoolCode))

    for (const source of adoptionSources) {
      let batch: AdoptionRecord[] = []
      let rowNumber = 0
      await streamCsv(source.url, async (fields) => {
        rowNumber += 1
        const record = adoptionRecordFromFields(
          fields,
          source.dataset,
          `csv:${source.dataset}:${rowNumber}`,
          contexts,
          allowedSchoolCodes,
        )
        if (!record) return
        batch.push(record)
        if (batch.length >= EDGE_BATCH_SIZE) {
          const sending = batch
          batch = []
          await edge.call({ action: 'adoptions', runId, records: sending })
        }
      })
      if (batch.length) await edge.call({ action: 'adoptions', runId, records: batch })
    }

    const committed = await edge.call<{ run: { adoption_record_count: number; school_record_count: number } }>({ action: 'commit', runId })
    console.log(JSON.stringify({
      event: 'MIM_TEXTBOOK_CACHE_ACTIVE',
      academicYearCode,
      instituteCode,
      schools: committed.run.school_record_count,
      adoptions: committed.run.adoption_record_count,
    }))
  } catch (error) {
    await edge.call({ action: 'fail', runId }).catch(() => undefined)
    throw error
  }
}

async function resolveRegistryScope(instituteCode: string, academicYearCode: string) {
  for (const dataset of REGISTRY_DATASETS) {
    const url = await resolveOfficialCsvUrl(MIM_SCHOOL_CATALOG, dataset, academicYearCode, false)
    if (!url) continue

    const records: SchoolRecord[] = []
    await streamCsv(url, (fields) => {
      const year = field(fields, 'annoscolastico')
      if (year !== academicYearCode) return
      const schoolCode = nullableSchoolCode(field(fields, 'codicescuola'))
      const instituteReferenceCode = nullableSchoolCode(
        nullableField(fields, 'codiceistitutoriferimento')
          ?? nullableField(fields, 'codiceistitutodiriferimento')
          ?? '',
      )
      if (!schoolCode) return
      if (schoolCode !== instituteCode && instituteReferenceCode !== instituteCode) return
      records.push({
        instituteCode,
        schoolCode,
        province: nullableField(fields, 'provincia'),
      })
    })

    if (records.length) {
      return {
        source: { dataset, url },
        records: dedupeSchools(records),
      }
    }
  }

  return { source: { dataset: '', url: '' }, records: [] as SchoolRecord[] }
}

async function resolveOfficialCsvUrl(
  catalogUrl: string,
  datasetCode: string,
  academicYearCode: string,
  adoptionDataset: boolean,
) {
  return await resolveFederatedCsvUrl(datasetCode, academicYearCode)
    ?? await resolveMimDatasetCatalogCsvUrl(datasetCode, academicYearCode, adoptionDataset)
    ?? await resolveMimCatalogCsvUrl(catalogUrl, datasetCode, academicYearCode, adoptionDataset)
}

async function resolveFederatedCsvUrl(datasetCode: string, academicYearCode: string) {
  try {
    const url = new URL(DATA_GOV_PACKAGE_SEARCH)
    url.searchParams.set('q', datasetCode)
    url.searchParams.set('rows', '20')
    const response = await fetch(url, {
      headers: { ...MIM_HTTP_HEADERS, accept: 'application/json' },
      signal: AbortSignal.timeout(MIM_CATALOG_TIMEOUT_MS),
    })
    if (!response.ok) return null
    const payload = await response.json() as CkanResponse
    if (!payload.success) return null

    const candidates: Array<{ url: string; evidence: string }> = []
    for (const item of payload.result?.results ?? []) {
      if (!ckanPackageMatchesDataset(item, datasetCode)) continue
      for (const resource of item.resources ?? []) {
        if (!resourceLooksLikeCsv(resource)) continue
        const normalized = normalizeMimDistributionUrl(resource.url)
        if (!normalized) continue
        candidates.push({
          url: normalized,
          evidence: [resource.name, resource.description, resource.format, resource.mimetype, resource.url]
            .filter(Boolean)
            .join(' '),
        })
      }
    }

    const selected = selectCandidate(candidates, academicYearCode)
    return selected?.url ?? null
  } catch {
    return null
  }
}

async function resolveMimDatasetCatalogCsvUrl(datasetCode: string, academicYearCode: string, adoptionDataset: boolean) {
  const pageUrl = new URL(encodeURIComponent(datasetCode), MIM_DATASET_CATALOG_BASE).toString()
  try {
    const response = await fetch(pageUrl, {
      headers: { ...MIM_HTTP_HEADERS, accept: 'text/html,*/*;q=0.8' },
      signal: AbortSignal.timeout(MIM_CATALOG_TIMEOUT_MS),
    })
    if (!response.ok) return null
    return resolveMimCsvUrlFromCatalogHtml(await response.text(), pageUrl, datasetCode, academicYearCode, adoptionDataset)
  } catch {
    return null
  }
}

async function resolveMimCatalogCsvUrl(catalogUrl: string, datasetCode: string, academicYearCode: string, adoptionDataset: boolean) {
  try {
    const response = await fetch(catalogUrl, {
      headers: { ...MIM_HTTP_HEADERS, accept: 'text/html,*/*;q=0.8' },
      signal: AbortSignal.timeout(MIM_CATALOG_TIMEOUT_MS),
    })
    if (!response.ok) return null
    return resolveMimCsvUrlFromCatalogHtml(await response.text(), catalogUrl, datasetCode, academicYearCode, adoptionDataset)
  } catch {
    return null
  }
}

function resolveMimCsvUrlFromCatalogHtml(
  html: string,
  pageUrl: string,
  datasetCode: string,
  academicYearCode: string,
  adoptionDataset: boolean,
) {
  const hrefs = [...html.matchAll(/href\s*=\s*["']([^"']+\.csv(?:\?[^"']*)?)["']/gi)]
    .map((match) => decodeHtmlAttribute(match[1]))
    .filter((href) => href.toUpperCase().includes(datasetCode.toUpperCase()))

  let selected = selectAcademicYearDistribution(hrefs, academicYearCode)
  if (!selected && adoptionDataset && adoptionCatalogMatchesPinnedSnapshot(html, datasetCode, academicYearCode)) {
    selected = hrefs.find((href) => !extractAcademicYearCodes(href).some((code) => code !== academicYearCode)) ?? null
  }
  return selected ? normalizeMimDistributionUrl(new URL(selected, pageUrl).toString()) : null
}

async function streamCsv(url: string, visit: (fields: CsvFields) => Promise<void> | void) {
  const response = await fetch(url, {
    headers: {
      ...MIM_HTTP_HEADERS,
      accept: 'text/csv,application/csv,application/octet-stream;q=0.9,*/*;q=0.5',
    },
    signal: AbortSignal.timeout(MIM_CSV_TIMEOUT_MS),
  })
  if (!response.ok || !response.body) throw new Error(`MIM CSV download failed (${response.status})`)

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()
  const parser = new IncrementalCsvParser()
  let headers: string[] | null = null

  const visitRow = async (row: string[]) => {
    if (!headers) {
      headers = row.map(normalizeFieldKey)
      return
    }
    const fields = new Map<string, string>()
    for (let index = 0; index < headers.length; index += 1) fields.set(headers[index], row[index]?.trim() ?? '')
    await visit(fields)
  }

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    await parser.feed(value, visitRow)
  }
  await parser.finish(visitRow)
}

class EdgeClient {
  constructor(private readonly url: string, private readonly token: string) {}

  async call<T extends Record<string, unknown> = Record<string, unknown>>(payload: Record<string, unknown>) {
    const response = await fetch(this.url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-docente-os-sync-token': this.token,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30_000),
    })
    const body = await response.json() as EdgeResponse<T>
    if (!response.ok) throw new Error(body.message ?? body.error ?? `Edge sync failed (${response.status})`)
    return body as T
  }
}

function normalizeScope(rows: ScopeRow[]) {
  return rows.flatMap((row) => {
    const instituteCode = nullableSchoolCode(row.institute_code)
    const academicYearCode = String(row.academic_year_code ?? '').trim()
    const grade = String(row.grade ?? '').trim().toUpperCase()
    const sectionCode = normalizeSectionCode(String(row.section_code ?? ''))
    const disciplineName = String(row.discipline_name ?? '').trim()
    if (!instituteCode || !/^20[0-9]{4}$/.test(academicYearCode) || !GRADE_NUMBER[grade] || !sectionCode || !disciplineName) return []
    return [{ institute_code: instituteCode, academic_year_code: academicYearCode, grade, section_code: sectionCode, discipline_name: disciplineName }]
  })
}

function groupScope(scope: ScopeRow[]) {
  const groups = new Map<string, ScopeRow[]>()
  for (const row of scope) {
    const key = `${row.institute_code}:${row.academic_year_code}`
    groups.set(key, [...(groups.get(key) ?? []), row])
  }
  return groups
}

function dedupeSchools(records: SchoolRecord[]) {
  const seen = new Set<string>()
  return records.filter((record) => {
    const key = `${record.instituteCode}:${record.schoolCode}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function datasetForSchoolCode(schoolCode: string) {
  return PROVINCE_DATASET.get(schoolCode.slice(0, 2)) ?? null
}

function selectCandidate(candidates: Array<{ url: string; evidence: string }>, academicYearCode: string) {
  const exact = candidates.find((candidate) =>
    extractAcademicYearCodes(candidate.evidence).includes(academicYearCode)
      && publicationDateMatchesAcademicYearCycle(candidate.evidence, academicYearCode),
  )
  if (exact) return exact
  return candidates.find((candidate) =>
    extractAcademicYearCodes(candidate.evidence).length === 0
      && publicationDateMatchesAcademicYearCycle(candidate.evidence, academicYearCode),
  ) ?? null
}

function extractAcademicYearCodes(value: string) {
  return [...value.matchAll(/20\d{4}/g)].map((match) => match[0]).filter(isPlausibleAcademicYearCode)
}

function extractDateStamps(value: string) {
  return [...value.matchAll(/(?=(20\d{6}))/g)].map((match) => match[1]).filter(isPlausibleDateStamp)
}

function isPlausibleAcademicYearCode(value: string) {
  if (!/^20\d{4}$/.test(value)) return false
  const startYear = Number.parseInt(value.slice(0, 4), 10)
  const endYear = Number.parseInt(value.slice(4), 10)
  return endYear === (startYear + 1) % 100
}

function isPlausibleDateStamp(value: string) {
  if (!/^20\d{6}$/.test(value)) return false
  const month = Number.parseInt(value.slice(4, 6), 10)
  const day = Number.parseInt(value.slice(6, 8), 10)
  return month >= 1 && month <= 12 && day >= 1 && day <= 31
}

function publicationDateMatchesAcademicYearCycle(value: string, academicYearCode: string) {
  const dates = extractDateStamps(value)
  if (!dates.length) return true
  const startYear = academicYearCode.slice(0, 4)
  return dates.some((date) => date.startsWith(startYear))
}

function adoptionCatalogMatchesPinnedSnapshot(html: string, datasetCode: string, academicYearCode: string) {
  if (!datasetCode.startsWith('ALT') || academicYearCode !== MIM_ADOPTION_SNAPSHOT.academicYearCode) return false
  const [year, month, day] = MIM_ADOPTION_SNAPSHOT.publishedOn.split('-')
  return [MIM_ADOPTION_SNAPSHOT.publishedOn, `${day}/${month}/${year}`, `${day}-${month}-${year}`]
    .some((variant) => html.includes(variant))
}

function ckanPackageMatchesDataset(item: CkanPackage, datasetCode: string) {
  const evidence = [item.id, item.name, item.title, item.identifier, item.url, item.notes,
    ...(item.extras ?? []).flatMap((extra) => [extra.key, extra.value]),
    ...(item.resources ?? []).map((resource) => resource.url),
  ].filter(Boolean).join(' ').toUpperCase()
  return evidence.includes(datasetCode.toUpperCase())
}

function resourceLooksLikeCsv(resource: CkanResource) {
  const format = `${resource.format ?? ''} ${resource.mimetype ?? ''}`.toUpperCase()
  return format.includes('CSV') || /\.csv(?:$|[?#])/i.test(resource.url ?? '')
}

function normalizeMimDistributionUrl(value: string | null | undefined) {
  if (!value) return null
  try {
    const url = new URL(value)
    if (!/(^|\.)dati\.istruzione\.it$/i.test(url.hostname)) return null
    if (url.protocol === 'http:') url.protocol = 'https:'
    return url.protocol === 'https:' ? url.toString() : null
  } catch {
    return null
  }
}

function normalizeFieldKey(value: string) {
  return value.replace(/^\uFEFF/, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

function normalizeSectionCode(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '')
}

function nullableSchoolCode(value: string) {
  const normalized = value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
  return /^[A-Z0-9]{6,12}$/.test(normalized) ? normalized : null
}

function field(fields: CsvFields, key: string) {
  return fields.get(key)?.trim() ?? ''
}

function nullableField(fields: CsvFields, key: string) {
  return field(fields, key) || null
}

function decodeHtmlAttribute(value: string) {
  return value.replaceAll('&amp;', '&').replaceAll('&#38;', '&').replaceAll('&quot;', '"')
}

function requiredEnv(key: string) {
  const value = process.env[key]?.trim()
  if (!value) throw new Error(`${key} is required`)
  return value
}

function unique<T>(values: T[]) {
  return [...new Set(values)]
}

function buildProvinceDatasetMap() {
  const map = new Map<string, string>()
  const groups: Array<[string, string[]]> = [
    ['ALTABRUZZO', ['AQ', 'CH', 'PE', 'TE']], ['ALTBASILICATA', ['MT', 'PZ']],
    ['ALTCALABRIA', ['CS', 'CZ', 'KR', 'RC', 'VV']], ['ALTCAMPANIA', ['AV', 'BN', 'CE', 'NA', 'SA']],
    ['ALTEMILIAROMAGNA', ['BO', 'FC', 'FE', 'MO', 'PR', 'PC', 'RA', 'RE', 'RN']],
    ['ALTFRIULIVENEZIAGIULIA', ['GO', 'PN', 'TS', 'UD']], ['ALTLAZIO', ['FR', 'LT', 'RI', 'RM', 'VT']],
    ['ALTLIGURIA', ['GE', 'IM', 'SP', 'SV']], ['ALTLOMBARDIA', ['BG', 'BS', 'CO', 'CR', 'LC', 'LO', 'MB', 'MI', 'MN', 'PV', 'SO', 'VA']],
    ['ALTMARCHE', ['AN', 'AP', 'FM', 'MC', 'PU']], ['ALTMOLISE', ['CB', 'IS']],
    ['ALTPIEMONTE', ['AL', 'AT', 'BI', 'CN', 'NO', 'TO', 'VB', 'VC']], ['ALTPUGLIA', ['BA', 'BR', 'BT', 'FG', 'LE', 'TA']],
    ['ALTSARDEGNA', ['CA', 'CI', 'NU', 'OG', 'OR', 'OT', 'SS', 'SU', 'VS']],
    ['ALTSICILIA', ['AG', 'CL', 'CT', 'EN', 'ME', 'PA', 'RG', 'SR', 'TP']],
    ['ALTTOSCANA', ['AR', 'FI', 'GR', 'LI', 'LU', 'MS', 'PI', 'PO', 'PT', 'SI']],
    ['ALTTRENTINOALTOADIGE', ['BZ', 'TN']], ['ALTUMBRIA', ['PG', 'TR']], ['ALTVALLEDAOSTA', ['AO']],
    ['ALTVENETO', ['BL', 'PD', 'RO', 'TV', 'VE', 'VI', 'VR']],
  ]
  for (const [dataset, provinces] of groups) for (const province of provinces) map.set(province, dataset)
  return map
}

const invokedDirectly = process.argv[1]
  ? import.meta.url === pathToFileURL(process.argv[1]).href
  : false

if (invokedDirectly) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack ?? error.message : error)
    process.exitCode = 1
  })
}
