import { createClient } from 'npm:@supabase/supabase-js@2.57.0'
import { createRemoteJWKSet, jwtVerify } from 'npm:jose@6.2.12'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const TOKEN_HEADER = 'x-docente-os-sync-token'
const MAX_SCHOOL_BATCH = 500
const MAX_ADOPTION_BATCH = 250

const GITHUB_OIDC_ISSUER = 'https://token.actions.githubusercontent.com'
const GITHUB_OIDC_JWKS = createRemoteJWKSet(new URL('https://token.actions.githubusercontent.com/.well-known/jwks'))
const GITHUB_OIDC_AUDIENCE = 'docente-os-mim-textbook-annual-sync'
const GITHUB_REPOSITORY = 'antoniocorsano-boop/docente-os-2026-27'
const GITHUB_REPOSITORY_ID = '1341201345'
const GITHUB_WORKFLOW_NAME = 'MIM Textbook Annual Sync'
const GITHUB_WORKFLOW_PATH = '.github/workflows/mim-textbook-annual-sync.yml'
const GITHUB_ALLOWED_REFS = new Set([
  'refs/heads/feat/mim-textbook-cache',
  'refs/heads/develop',
  'refs/heads/main',
])
const GITHUB_ALLOWED_EVENTS = new Set(['push', 'workflow_dispatch'])

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error('Supabase Edge runtime credentials are unavailable')
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

type JsonObject = Record<string, unknown>

type SyncPayload = {
  action?: string
  runId?: string
  academicYearCode?: string
  sourceManifest?: JsonObject
  records?: unknown[]
}

Deno.serve(async (request: Request) => {
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)
  if (!(await authorized(request))) return json({ error: 'unauthorized' }, 401)

  let payload: SyncPayload
  try {
    payload = await request.json() as SyncPayload
  } catch {
    return json({ error: 'invalid_json' }, 400)
  }

  try {
    switch (payload.action) {
      case 'scope':
        return await scope()
      case 'begin':
        return await begin(payload)
      case 'schools':
        return await schools(payload)
      case 'adoptions':
        return await adoptions(payload)
      case 'commit':
        return await commit(payload)
      case 'fail':
        return await fail(payload)
      default:
        return json({ error: 'unsupported_action' }, 400)
    }
  } catch (error) {
    console.error('mim-textbook-sync', error)
    return json({
      error: 'sync_action_failed',
      message: error instanceof Error ? error.message : 'Unknown sync failure',
    }, 500)
  }
})

async function authorized(request: Request) {
  const token = request.headers.get(TOKEN_HEADER)?.trim() ?? ''
  if (token.length < 32 || token.length > 8_192) return false

  if (token.split('.').length === 3 && await authorizedGitHubOidc(token)) return true
  return await authorizedLegacyToken(token)
}

async function authorizedGitHubOidc(token: string) {
  try {
    const { payload } = await jwtVerify(token, GITHUB_OIDC_JWKS, {
      issuer: GITHUB_OIDC_ISSUER,
      audience: GITHUB_OIDC_AUDIENCE,
      algorithms: ['RS256'],
      clockTolerance: 10,
    })

    const ref = typeof payload.ref === 'string' ? payload.ref : ''
    const workflowRef = typeof payload.workflow_ref === 'string' ? payload.workflow_ref : ''
    const eventName = typeof payload.event_name === 'string' ? payload.event_name : ''

    if (payload.repository !== GITHUB_REPOSITORY) return false
    if (String(payload.repository_id ?? '') !== GITHUB_REPOSITORY_ID) return false
    if (!GITHUB_ALLOWED_REFS.has(ref)) return false
    if (!GITHUB_ALLOWED_EVENTS.has(eventName)) return false
    if (payload.workflow !== GITHUB_WORKFLOW_NAME) return false
    if (workflowRef !== `${GITHUB_REPOSITORY}/${GITHUB_WORKFLOW_PATH}@${ref}`) return false
    if (payload.ref_type !== 'branch') return false
    if (payload.runner_environment !== 'github-hosted') return false

    return true
  } catch {
    return false
  }
}

async function authorizedLegacyToken(token: string) {
  if (token.length > 256) return false
  const digest = await sha256(token)
  const { data, error } = await supabase
    .from('mim_textbook_sync_credentials')
    .select('token_sha256')
    .eq('singleton', true)
    .maybeSingle()

  if (error || !data?.token_sha256) return false
  return constantTimeEqual(digest, data.token_sha256)
}

async function scope() {
  const { data, error } = await supabase.rpc('mim_textbook_cache_scope')
  if (error) throw new Error(error.message)
  return json({ scope: data ?? [] })
}

async function begin(payload: SyncPayload) {
  const academicYearCode = requiredAcademicYear(payload.academicYearCode)
  const sourceManifest = payload.sourceManifest ?? {}
  if (!isPlainObject(sourceManifest) || JSON.stringify(sourceManifest).length > 20_000) {
    return json({ error: 'invalid_source_manifest' }, 400)
  }

  const { data, error } = await supabase
    .from('mim_textbook_sync_runs')
    .insert({
      academic_year_code: academicYearCode,
      status: 'PREPARING',
      source_manifest: sourceManifest,
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)
  return json({ runId: data.id }, 201)
}

async function schools(payload: SyncPayload) {
  const run = await preparingRun(payload.runId)
  const records = boundedRecords(payload.records, MAX_SCHOOL_BATCH)

  const normalized = records.map((candidate) => {
    const row = object(candidate)
    return {
      run_id: run.id,
      academic_year_code: run.academic_year_code,
      institute_code: schoolCode(row.instituteCode),
      school_code: schoolCode(row.schoolCode),
      province: nullableText(row.province, 120),
    }
  })

  if (normalized.length) {
    const { error } = await supabase
      .from('mim_school_scope_cache')
      .upsert(normalized, {
        onConflict: 'run_id,institute_code,school_code',
        ignoreDuplicates: true,
      })
    if (error) throw new Error(error.message)
  }

  return json({ accepted: normalized.length })
}

async function adoptions(payload: SyncPayload) {
  const run = await preparingRun(payload.runId)
  const records = boundedRecords(payload.records, MAX_ADOPTION_BATCH)
  const { data: scopeRows, error: scopeError } = await supabase
    .from('mim_school_scope_cache')
    .select('school_code')
    .eq('run_id', run.id)
  if (scopeError) throw new Error(scopeError.message)
  const allowedSchools = new Set((scopeRows ?? []).map((row) => row.school_code))
  if (!allowedSchools.size) return json({ error: 'school_scope_required' }, 409)

  const normalized = records.map((candidate) => {
    const row = object(candidate)
    const code = schoolCode(row.schoolCode)
    if (!allowedSchools.has(code)) throw new Error(`School ${code} is outside the staged MIM scope`)

    return {
      run_id: run.id,
      academic_year_code: run.academic_year_code,
      source_dataset: requiredText(row.sourceDataset, 80),
      school_code: code,
      grade_number: integer(row.gradeNumber, 1, 8),
      section_code: requiredText(row.sectionCode, 12).toUpperCase(),
      school_grade_type: nullableText(row.schoolGradeType, 240),
      combination: nullableText(row.combination, 240),
      discipline: requiredText(row.discipline, 240),
      isbn13: isbn13(row.isbn13),
      authors: nullableText(row.authors, 1000),
      title: requiredText(row.title, 600),
      subtitle: nullableText(row.subtitle, 600),
      volume: nullableText(row.volume, 240),
      publisher: requiredText(row.publisher, 300),
      price: nullableText(row.price, 120),
      new_adoption: nullableText(row.newAdoption, 120),
      to_purchase: nullableText(row.toPurchase, 120),
      recommended: nullableText(row.recommended, 120),
      source_subject: requiredText(row.sourceSubject, 1000),
    }
  })

  if (normalized.length) {
    const { error } = await supabase
      .from('mim_textbook_adoption_cache')
      .upsert(normalized, {
        onConflict: 'run_id,school_code,grade_number,section_code,isbn13,discipline,source_subject',
        ignoreDuplicates: true,
      })
    if (error) throw new Error(error.message)
  }

  return json({ accepted: normalized.length })
}

async function commit(payload: SyncPayload) {
  const run = await preparingRun(payload.runId)
  const { error } = await supabase.rpc('mim_textbook_cache_activate', { p_run_id: run.id })
  if (error) throw new Error(error.message)

  const { data, error: readError } = await supabase
    .from('mim_textbook_sync_runs')
    .select('id,status,school_record_count,adoption_record_count,activated_at')
    .eq('id', run.id)
    .single()
  if (readError) throw new Error(readError.message)
  return json({ run: data })
}

async function fail(payload: SyncPayload) {
  const runId = uuid(payload.runId)
  const { error } = await supabase
    .from('mim_textbook_sync_runs')
    .update({ status: 'FAILED' })
    .eq('id', runId)
    .eq('status', 'PREPARING')
  if (error) throw new Error(error.message)
  return json({ failed: true })
}

async function preparingRun(value: unknown) {
  const runId = uuid(value)
  const { data, error } = await supabase
    .from('mim_textbook_sync_runs')
    .select('id,academic_year_code,status')
    .eq('id', runId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) throw new Error('Unknown MIM sync run')
  if (data.status !== 'PREPARING') throw new Error('MIM sync run is not PREPARING')
  return data
}

function boundedRecords(value: unknown, limit: number) {
  if (!Array.isArray(value)) throw new Error('records must be an array')
  if (value.length > limit) throw new Error(`batch exceeds ${limit} records`)
  return value
}

function object(value: unknown): JsonObject {
  if (!isPlainObject(value)) throw new Error('record must be an object')
  return value
}

function isPlainObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function requiredAcademicYear(value: unknown) {
  const text = String(value ?? '').trim()
  if (!/^20[0-9]{4}$/.test(text)) throw new Error('invalid academic year code')
  return text
}

function schoolCode(value: unknown) {
  const text = String(value ?? '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (!/^[A-Z0-9]{6,12}$/.test(text)) throw new Error('invalid school code')
  return text
}

function uuid(value: unknown) {
  const text = String(value ?? '').trim()
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text)) {
    throw new Error('invalid run id')
  }
  return text
}

function requiredText(value: unknown, maxLength: number) {
  const text = String(value ?? '').trim()
  if (!text || text.length > maxLength) throw new Error('invalid text field')
  return text
}

function nullableText(value: unknown, maxLength: number) {
  const text = String(value ?? '').trim()
  if (!text) return null
  if (text.length > maxLength) throw new Error('text field exceeds limit')
  return text
}

function integer(value: unknown, min: number, max: number) {
  const number = Number(value)
  if (!Number.isInteger(number) || number < min || number > max) throw new Error('invalid integer field')
  return number
}

function isbn13(value: unknown) {
  const digits = String(value ?? '').replace(/[^0-9]/g, '')
  if (!/^[0-9]{13}$/.test(digits)) throw new Error('invalid ISBN-13')
  return digits
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false
  let difference = 0
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index)
  }
  return difference === 0
}

function json(body: JsonObject, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}
