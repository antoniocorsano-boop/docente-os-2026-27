import assert from 'node:assert/strict'
import {
  MIM_ADOPTION_SNAPSHOT,
  MimTextbookAdoptionClient,
} from '../src/core/infrastructure/mim/mim-textbook-adoption-client'

const SCHOOL_CODE = 'AVIC849003'
const EXPECTED_SECONDARY_SCHOOL_CODE = 'AVMM849047'
const DATA_GOV_BASE = 'https://www.dati.gov.it/opendata/api/3/action/'

async function main() {
  await logFederatedDataset('SCUANAGRAFESTAT')
  await logFederatedDataset('ALTCAMPANIA')

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

type DiagnosticResource = {
  id?: string
  name?: string
  format?: string
  mimetype?: string
  url?: string
  cache_url?: string | null
  datastore_active?: boolean
  url_type?: string | null
  last_modified?: string | null
  created?: string | null
  size?: number | null
}

async function logFederatedDataset(datasetCode: string) {
  try {
    const url = new URL('package_search', DATA_GOV_BASE)
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
          resources?: DiagnosticResource[]
        }>
      }
    } : null

    const results = (payload?.result?.results ?? []).map((item) => ({
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
          id: resource.id ?? null,
          name: resource.name ?? null,
          format: resource.format ?? null,
          mimetype: resource.mimetype ?? null,
          url: resource.url ?? null,
          cacheUrl: resource.cache_url ?? null,
          datastoreActive: resource.datastore_active ?? false,
          urlType: resource.url_type ?? null,
          lastModified: resource.last_modified ?? null,
          created: resource.created ?? null,
          size: resource.size ?? null,
        })),
    }))

    console.log(JSON.stringify({
      status: 'DATA_GOV_SOURCE_DIAGNOSTIC',
      datasetCode,
      httpStatus: response.status,
      success: payload?.success ?? false,
      count: payload?.result?.count ?? null,
      results,
    }, null, 2))

    const resources = (payload?.result?.results ?? [])
      .flatMap((item) => item.resources ?? [])
      .filter((resource) =>
        Boolean(resource.id) &&
        /(^|\.)dati\.istruzione\.it/i.test(safeHostname(resource.url)) &&
        (`${resource.format ?? ''} ${resource.mimetype ?? ''}`.toUpperCase().includes('CSV') || /\.csv(?:$|[?#])/i.test(resource.url ?? '')),
      )

    if (datasetCode === 'SCUANAGRAFESTAT') {
      const currentRegistry = resources.find((resource) =>
        resource.url?.includes(`SCUANAGRAFESTAT${MIM_ADOPTION_SNAPSHOT.academicYearCode}`),
      )
      if (currentRegistry?.url) {
        await probeCurrentRegistryDistribution(currentRegistry.url)
      } else {
        console.log(JSON.stringify({
          status: 'MIM_CURRENT_REGISTRY_DISTRIBUTION_NOT_FOUND',
          academicYearCode: MIM_ADOPTION_SNAPSHOT.academicYearCode,
        }, null, 2))
      }
    }

    for (const resource of resources.slice(0, 3)) {
      if (!resource.id) continue
      await probeDataStore(datasetCode, resource.id, resource.datastore_active ?? false)
    }
  } catch (error) {
    console.log(JSON.stringify({
      status: 'DATA_GOV_SOURCE_DIAGNOSTIC_ERROR',
      datasetCode,
      message: error instanceof Error ? error.message : String(error),
    }, null, 2))
  }
}

async function probeCurrentRegistryDistribution(resourceUrl: string) {
  const candidates = [...new Set([
    resourceUrl,
    resourceUrl.replace(/^http:/i, 'https:'),
  ])]

  for (const candidate of candidates) {
    try {
      const response = await fetch(candidate, {
        redirect: 'follow',
        headers: {
          accept: 'text/csv,application/csv,application/octet-stream;q=0.9,*/*;q=0.5',
          'user-agent': 'DocenteOS-MIM-Source-Contract/2026.27',
        },
        signal: AbortSignal.timeout(60_000),
      })
      const text = response.ok ? await response.text() : ''
      const firstLine = text.split(/\r?\n/, 1)[0] ?? ''
      console.log(JSON.stringify({
        status: 'MIM_CURRENT_REGISTRY_DISTRIBUTION_PROBE',
        requestedUrl: candidate,
        finalUrl: response.url,
        httpStatus: response.status,
        contentType: response.headers.get('content-type'),
        byteLength: Buffer.byteLength(text),
        firstLine: firstLine.slice(0, 1000),
        delimiterGuess: firstLine.includes(';') && !firstLine.includes(',') ? 'SEMICOLON' : firstLine.includes(',') ? 'COMMA' : 'UNKNOWN',
        containsInstituteCode: text.includes(SCHOOL_CODE),
        containsExpectedSecondarySchoolCode: text.includes(EXPECTED_SECONDARY_SCHOOL_CODE),
      }, null, 2))
    } catch (error) {
      console.log(JSON.stringify({
        status: 'MIM_CURRENT_REGISTRY_DISTRIBUTION_PROBE_ERROR',
        requestedUrl: candidate,
        message: error instanceof Error ? error.message : String(error),
      }, null, 2))
    }
  }
}

async function probeDataStore(datasetCode: string, resourceId: string, declaredActive: boolean) {
  try {
    const url = new URL('datastore_search', DATA_GOV_BASE)
    url.searchParams.set('resource_id', resourceId)
    url.searchParams.set('limit', '1')
    const response = await fetch(url, {
      headers: {
        accept: 'application/json',
        'user-agent': 'DocenteOS-MIM-Source-Contract/2026.27',
      },
      signal: AbortSignal.timeout(15_000),
    })
    const payload = response.ok ? await response.json() as {
      success?: boolean
      result?: { total?: number; records?: unknown[]; fields?: unknown[] }
      error?: unknown
    } : null
    console.log(JSON.stringify({
      status: 'DATA_GOV_DATASTORE_PROBE',
      datasetCode,
      resourceId,
      declaredActive,
      httpStatus: response.status,
      success: payload?.success ?? false,
      total: payload?.result?.total ?? null,
      sampleRecord: payload?.result?.records?.[0] ?? null,
      error: payload?.error ?? null,
    }, null, 2))
  } catch (error) {
    console.log(JSON.stringify({
      status: 'DATA_GOV_DATASTORE_PROBE_ERROR',
      datasetCode,
      resourceId,
      declaredActive,
      message: error instanceof Error ? error.message : String(error),
    }, null, 2))
  }
}

function safeHostname(value: string | undefined) {
  if (!value) return ''
  try {
    return new URL(value).hostname
  } catch {
    return ''
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
