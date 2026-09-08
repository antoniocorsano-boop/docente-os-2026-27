import assert from 'node:assert/strict'
import {
  MIM_ADOPTION_SNAPSHOT,
  MimTextbookAdoptionClient,
} from '../src/core/infrastructure/mim/mim-textbook-adoption-client'

const SCHOOL_CODE = 'AVIC849003'
const DATA_GOV_PACKAGE_SEARCH = 'https://www.dati.gov.it/opendata/api/3/action/package_search'
const MIM_DISTRIBUTION_BASE = 'https://dati.istruzione.it/opendata/opendata/catalogo/elements1/'

async function main() {
  await logFederatedDataset('SCUANAGRAFESTAT')
  await logFederatedDataset('ALTCAMPANIA')
  await probeMimDistribution('ALTCAMPANIA000020260622.csv')
  await probeMimDistribution(
    `ALTCAMPANIA0000${MIM_ADOPTION_SNAPSHOT.publishedOn.replaceAll('-', '')}.csv`,
  )

  const client = new MimTextbookAdoptionClient()
  const result = await client.discoverBySchoolCode(
    SCHOOL_CODE,
    MIM_ADOPTION_SNAPSHOT.academicYearCode,
  )

  assert.ok(result.resolvedSchoolCodes.length > 0, 'MIM did not resolve any school/plesso code')
  assert.ok(
    result.resolvedSchoolCodes.every((code) => code.startsWith('AV')),
    `Unexpected resolved school code(s): ${result.resolvedSchoolCodes.join(', ')}`,
  )
  assert.ok(
    result.datasetCodes.includes('ALTCAMPANIA'),
    `Expected ALTCAMPANIA, received: ${result.datasetCodes.join(', ') || 'none'}`,
  )
  assert.ok(
    result.records.length > 0,
    `No 2026/2027 textbook adoption was returned for ${SCHOOL_CODE}; ` +
      `resolved codes: ${result.resolvedSchoolCodes.join(', ')}`,
  )

  const technologyRecords = result.records.filter((record) =>
    record.discipline.toLocaleUpperCase('it').includes('TECNOLOG'),
  )

  assert.ok(
    technologyRecords.length > 0,
    `No Tecnologia adoption was returned for ${SCHOOL_CODE}; ` +
      `available disciplines: ${[...new Set(result.records.map((record) => record.discipline))].join(', ')}`,
  )

  console.log(JSON.stringify({
    status: 'MIM_SOURCE_CONTRACT_PASS',
    schoolCode: SCHOOL_CODE,
    academicYearCode: MIM_ADOPTION_SNAPSHOT.academicYearCode,
    snapshotPublishedOn: MIM_ADOPTION_SNAPSHOT.publishedOn,
    resolvedSchoolCodes: result.resolvedSchoolCodes,
    datasetCodes: result.datasetCodes,
    adoptionCount: result.records.length,
    technologyAdoptionCount: technologyRecords.length,
  }, null, 2))
}

async function probeMimDistribution(filename: string) {
  const url = new URL(filename, MIM_DISTRIBUTION_BASE)
  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        accept: 'text/csv,application/octet-stream;q=0.9,*/*;q=0.5',
        range: 'bytes=0-1023',
        'user-agent': 'DocenteOS-MIM-Source-Contract/2026.27',
      },
      signal: AbortSignal.timeout(20_000),
    })
    const sample = response.ok || response.status === 206
      ? (await response.text()).slice(0, 180).replace(/[\r\n]+/g, ' ')
      : ''
    console.log(JSON.stringify({
      status: 'MIM_DISTRIBUTION_PROBE',
      filename,
      httpStatus: response.status,
      finalUrl: response.url,
      contentType: response.headers.get('content-type'),
      contentLength: response.headers.get('content-length'),
      contentRange: response.headers.get('content-range'),
      sample,
    }, null, 2))
  } catch (error) {
    console.log(JSON.stringify({
      status: 'MIM_DISTRIBUTION_PROBE_ERROR',
      filename,
      message: error instanceof Error ? error.message : String(error),
    }, null, 2))
  }
}

async function logFederatedDataset(datasetCode: string) {
  try {
    const url = new URL(DATA_GOV_PACKAGE_SEARCH)
    url.searchParams.set('q', datasetCode)
    url.searchParams.set('rows', '5')
    const response = await fetch(url, {
      headers: {
        accept: 'application/json',
        'user-agent': 'DocenteOS-MIM-Source-Contract/2026.27',
      },
      signal: AbortSignal.timeout(15_000),
    })
    const payload = response.ok ? await response.json() as {
      success?: boolean
      result?: {
        count?: number
        results?: Array<{
          id?: string
          name?: string
          title?: string
          identifier?: string
          url?: string
          extras?: Array<{ key?: string; value?: string }>
          resources?: Array<{
            name?: string
            format?: string
            mimetype?: string
            url?: string
          }>
        }>
      }
    } : null

    console.log(JSON.stringify({
      status: 'DATA_GOV_SOURCE_DIAGNOSTIC',
      datasetCode,
      httpStatus: response.status,
      success: payload?.success ?? false,
      count: payload?.result?.count ?? null,
      results: (payload?.result?.results ?? []).map((item) => ({
        id: item.id ?? null,
        name: item.name ?? null,
        title: item.title ?? null,
        identifier: item.identifier ?? null,
        url: item.url ?? null,
        matchingExtras: (item.extras ?? []).filter((extra) =>
          `${extra.key ?? ''} ${extra.value ?? ''}`.toUpperCase().includes(datasetCode),
        ),
        resources: (item.resources ?? [])
          .filter((resource) =>
            `${resource.format ?? ''} ${resource.mimetype ?? ''} ${resource.url ?? ''}`.toUpperCase().includes('CSV'),
          )
          .map((resource) => ({
            name: resource.name ?? null,
            format: resource.format ?? null,
            mimetype: resource.mimetype ?? null,
            url: resource.url ?? null,
          })),
      })),
    }, null, 2))
  } catch (error) {
    console.log(JSON.stringify({
      status: 'DATA_GOV_SOURCE_DIAGNOSTIC_ERROR',
      datasetCode,
      message: error instanceof Error ? error.message : String(error),
    }, null, 2))
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})