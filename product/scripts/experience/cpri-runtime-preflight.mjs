import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'
import {
  generateTotp,
  governedMfaRetryJitterMs,
  millisecondsUntilNextTotpStep,
} from '../../e2e/support/totp.mjs'

const EXPECTED_MIGRATION = '0088_canonical_plan_runtime_identity'
const EXPECTED_CODES = ['CAN-PLAN-1', 'CAN-PLAN-2', 'CAN-PLAN-3']
const GRADE_TO_PLAN = {
  PRIMA: 'CAN-PLAN-1',
  SECONDA: 'CAN-PLAN-2',
  TERZA: 'CAN-PLAN-3',
}
const LEGACY_RUNTIME_UUIDS = [
  '4a027986-5b6d-49db-9b52-01cfae679c08',
  'd327355b-76a9-496f-99cb-dc942fd950e4',
  '36ef3be5-925f-4e28-afff-df11097827a9',
  'a1066c0a-2720-40b0-841e-306cb998ce3e',
  '978702f8-4579-452d-925b-8e4d890e19f9',
  'bd4cb766-5d46-4420-bc82-f979528a14b2',
]

const outputDir = path.resolve(process.cwd(), 'test-results/cpri')
const outputPath = path.join(outputDir, 'runtime-preflight.json')
const checks = []

export async function runCpriRuntimePreflight() {
  fs.mkdirSync(outputDir, { recursive: true })

  const supabaseUrl = requiredEnv('NEXT_PUBLIC_SUPABASE_URL')
  const publishableKey = requiredEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')
  const email = requiredEnv('E2E_EMAIL')
  const password = requiredEnv('E2E_PASSWORD')
  const totpSecret = requiredEnv('E2E_TOTP_SECRET')
  const expectedCommit = requiredEnv('CPRI_TESTED_SHA')
  const targetGrade = (process.env.CPRI_TARGET_GRADE ?? 'SECONDA').trim().toUpperCase()
  const targetSectionCode = (process.env.CPRI_TARGET_SECTION_CODE ?? 'C').trim().toUpperCase()

  const supabase = createClient(supabaseUrl, publishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })

  try {
    verifyExactHead(expectedCommit)
    verifyStaticRuntimeAuthority()

    await signInAtAal2(supabase, { email, password, totpSecret })

    const { data: schemaSnapshot, error: schemaError } = await supabase.rpc('runtime_schema_contract_snapshot')
    requireCheck(!schemaError, 'runtime-schema-rpc', schemaError?.message ?? 'runtime schema snapshot unavailable')
    requireCheck(
      schemaSnapshot?.migrationId === EXPECTED_MIGRATION
        && schemaSnapshot?.lineageOk === true
        && Array.isArray(schemaSnapshot?.missingMigrations)
        && schemaSnapshot.missingMigrations.length === 0,
      'runtime-schema-0088',
      `expected ${EXPECTED_MIGRATION} with complete lineage`,
    )

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
    requireCheck(!sessionError && sessionData?.session?.access_token, 'aal2-session', 'authenticated AAL2 session unavailable')
    await verifyAtlasAcceptanceRpc(supabaseUrl, publishableKey, sessionData.session.access_token)

    const { data: contextRows, error: contextError } = await supabase.rpc('current_workspace_context')
    requireCheck(!contextError, 'workspace-context-rpc', contextError?.message ?? 'workspace context unavailable')
    const current = Array.isArray(contextRows) ? contextRows[0] : null
    requireCheck(Boolean(current?.workspace_id), 'active-workspace', 'active workspace not resolved')
    requireCheck(
      Boolean(current?.academic_year_id) && current?.academic_year_is_active === true,
      'active-academic-year',
      'active academic year not resolved',
    )

    const workspaceId = current.workspace_id
    const academicYearId = current.academic_year_id

    const { data: bindings, error: bindingError } = await supabase
      .from('canonical_plan_runtime_bindings')
      .select('canonical_plan_code,workspace_id,academic_year_id,asset_id,generation_id')
      .eq('workspace_id', workspaceId)
      .eq('academic_year_id', academicYearId)
    requireCheck(!bindingError, 'binding-read', bindingError?.message ?? 'runtime binding read failed')

    const byCode = new Map((bindings ?? []).map((binding) => [binding.canonical_plan_code, binding]))
    requireCheck(
      (bindings ?? []).length === EXPECTED_CODES.length
        && EXPECTED_CODES.every((code) => byCode.has(code)),
      'canonical-bindings',
      'expected exactly one active binding for CAN-PLAN-1/2/3',
    )

    const assetIds = [...new Set((bindings ?? []).map((binding) => binding.asset_id))]
    const { data: assets, error: assetError } = await supabase
      .from('knowledge_assets')
      .select('id,workspace_id,academic_year_id')
      .in('id', assetIds)
    requireCheck(!assetError, 'binding-assets-read', assetError?.message ?? 'bound assets unavailable')
    const assetById = new Map((assets ?? []).map((asset) => [asset.id, asset]))
    requireCheck(
      assetIds.length === EXPECTED_CODES.length
        && assetIds.every((assetId) => {
          const asset = assetById.get(assetId)
          return asset?.workspace_id === workspaceId && asset?.academic_year_id === academicYearId
        }),
      'binding-assets-context',
      'bound assets must belong to the active workspace/year',
    )

    const generationIds = [...new Set((bindings ?? []).map((binding) => binding.generation_id))]
    const { data: generations, error: generationError } = await supabase
      .from('knowledge_processing_generations')
      .select('id,asset_id,workspace_id,status')
      .in('id', generationIds)
    requireCheck(!generationError, 'binding-generations-read', generationError?.message ?? 'bound generations unavailable')
    const generationById = new Map((generations ?? []).map((generation) => [generation.id, generation]))
    requireCheck(
      generationIds.length === EXPECTED_CODES.length
        && (bindings ?? []).every((binding) => {
          const generation = generationById.get(binding.generation_id)
          return generation?.asset_id === binding.asset_id
            && generation?.workspace_id === workspaceId
            && generation?.status === 'SUCCEEDED'
        }),
      'binding-generations-context',
      'bound generations must match asset/workspace and be SUCCEEDED',
    )

    const { data: annualSnapshot, error: annualError } = await supabase.rpc('annual_plan_execution_snapshot', {
      target_workspace_id: workspaceId,
      target_academic_year_id: academicYearId,
    })
    requireCheck(!annualError, 'annual-plan-snapshot', annualError?.message ?? 'annual plan snapshot unavailable')
    const confirmedSections = (annualSnapshot?.sections ?? []).filter((section) => section.status === 'CONFERMATA')
    requireCheck(confirmedSections.length > 0, 'confirmed-sections', 'no confirmed annual-plan sections found')
    requireCheck(
      confirmedSections.every((section) =>
        section.workspace_id === workspaceId
        && section.academic_year_id === academicYearId
        && byCode.has(GRADE_TO_PLAN[section.grade]),
      ),
      'section-binding-coverage',
      'every confirmed section must belong to the active context and resolve a CAN-PLAN binding',
    )

    const targetSection = confirmedSections.find((section) =>
      section.grade === targetGrade && section.section_code === targetSectionCode
    )
    requireCheck(
      Boolean(targetSection),
      'target-section',
      `target section ${targetGrade}/${targetSectionCode} is not confirmed in the active workspace/year`,
    )
    requireCheck(
      byCode.has(GRADE_TO_PLAN[targetSection.grade]),
      'target-section-binding',
      'target section does not resolve the expected runtime CAN-PLAN binding',
    )

    verifyLessonDesignRuntimeContract()

    writeReceipt('READY', {
      testedSha: expectedCommit,
      target: `${targetGrade}/${targetSectionCode}`,
      bindingCount: bindings.length,
      confirmedSectionCount: confirmedSections.length,
      checks,
    })
    process.stdout.write(`CPRI runtime preflight READY on ${expectedCommit}\n`)
    return { status: 'READY', checks }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    writeReceipt('BLOCKED', { error: message, checks })
    throw error
  } finally {
    await supabase.auth.signOut().catch(() => {})
  }
}

async function signInAtAal2(supabase, { email, password, totpSecret }) {
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
  requireCheck(!signInError, 'password-auth', signInError?.message ?? 'password authentication failed')

  let { data: aal, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  requireCheck(!aalError, 'aal-read', aalError?.message ?? 'AAL unavailable')

  if (aal?.currentLevel !== 'aal2') {
    const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors()
    requireCheck(!factorsError, 'mfa-factors', factorsError?.message ?? 'MFA factors unavailable')
    const verifiedTotp = (factors?.totp ?? []).filter((factor) => factor.status === 'verified')
    const preferred = verifiedTotp.find((factor) => factor.friendly_name === 'Docente OS CI')
      ?? (verifiedTotp.length === 1 ? verifiedTotp[0] : null)
    requireCheck(Boolean(preferred), 'mfa-factor-selection', 'governed verified TOTP factor is not uniquely available')

    let verified = false
    let lastError = null
    for (let attempt = 1; attempt <= 3 && !verified; attempt += 1) {
      const remaining = millisecondsUntilNextTotpStep()
      const jitter = governedMfaRetryJitterMs()
      if (remaining < 6_000 + jitter) await sleep(remaining + 750 + jitter)
      else if (jitter) await sleep(jitter)

      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: preferred.id })
      if (challengeError) {
        lastError = challengeError
      } else {
        const { error: verifyError } = await supabase.auth.mfa.verify({
          factorId: preferred.id,
          challengeId: challenge.id,
          code: generateTotp(totpSecret),
        })
        if (!verifyError) verified = true
        else lastError = verifyError
      }

      if (!verified && attempt < 3) await sleep(millisecondsUntilNextTotpStep() + 750)
    }
    requireCheck(verified, 'mfa-verification', lastError?.message ?? 'TOTP verification failed')

    ;({ data: aal, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel())
    requireCheck(!aalError, 'aal2-read', aalError?.message ?? 'post-MFA AAL unavailable')
  }

  requireCheck(aal?.currentLevel === 'aal2', 'aal2-required', 'governed session did not reach AAL2')
}

async function verifyAtlasAcceptanceRpc(supabaseUrl, publishableKey, accessToken) {
  const response = await fetch(`${supabaseUrl}/rest/v1/`, {
    headers: {
      apikey: publishableKey,
      authorization: `Bearer ${accessToken}`,
      accept: 'application/openapi+json',
    },
  })
  requireCheck(response.ok, 'postgrest-openapi', `PostgREST schema returned ${response.status}`)
  const schema = await response.json()
  const paths = Object.keys(schema?.paths ?? {})
  requireCheck(
    paths.includes('/rpc/accept_atlas_material_bundle'),
    'atlas-acceptance-rpc',
    'accept_atlas_material_bundle RPC is not exposed in the runtime schema',
  )
}

function verifyExactHead(expectedCommit) {
  const actual = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
  requireCheck(actual === expectedCommit, 'exact-head', `expected ${expectedCommit}, found ${actual}`)
}

function verifyStaticRuntimeAuthority() {
  const srcRoot = path.resolve(process.cwd(), 'src')
  const offenders = []
  for (const file of runtimeSourceFiles(srcRoot)) {
    const text = fs.readFileSync(file, 'utf8')
    if (LEGACY_RUNTIME_UUIDS.some((uuid) => text.includes(uuid))) {
      offenders.push(path.relative(process.cwd(), file))
    }
  }
  requireCheck(offenders.length === 0, 'no-static-canonical-uuids', `legacy CAN-PLAN UUIDs remain in runtime source: ${offenders.join(', ')}`)

  const model = fs.readFileSync(path.join(srcRoot, 'app/piano-annuale/model.ts'), 'utf8')
  const start = model.indexOf('export const CANONICAL_PLAN_SOURCES')
  const end = start >= 0 ? model.indexOf('\n}\n', start) : -1
  const sourceMap = start >= 0 && end > start ? model.slice(start, end + 2) : ''
  requireCheck(
    sourceMap.length > 0 && !/\b(?:assetId|generationId)\b/.test(sourceMap),
    'logical-only-source-map',
    'CANONICAL_PLAN_SOURCES must expose logical codes only',
  )
}

function verifyLessonDesignRuntimeContract() {
  const designActions = fs.readFileSync(
    path.resolve(process.cwd(), 'src/app/classi/[sectionId]/lezioni/[blockId]/design-actions.ts'),
    'utf8',
  )
  requireCheck(
    designActions.includes('SupabaseCanonicalPlanSourceRepository')
      && designActions.includes('canonicalPlanAssetId: runtimeSource.assetId')
      && designActions.includes('canonicalGenerationId: runtimeSource.generationId'),
    'lesson-design-runtime-binding',
    'lesson design context must use the governed runtime CAN-PLAN source',
  )

  const atlasReturn = fs.readFileSync(
    path.resolve(process.cwd(), 'src/app/progetta/atlas/ritorno/actions.ts'),
    'utf8',
  )
  requireCheck(
    atlasReturn.includes('SupabaseCanonicalPlanSourceRepository')
      && !LEGACY_RUNTIME_UUIDS.some((uuid) => atlasReturn.includes(uuid)),
    'atlas-return-runtime-binding',
    'Atlas return must resolve the governed runtime CAN-PLAN source',
  )
}

function runtimeSourceFiles(root) {
  const out = []
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === '__tests__') continue
      out.push(...runtimeSourceFiles(full))
      continue
    }
    if (!/\.[cm]?[jt]sx?$/.test(entry.name)) continue
    if (/\.(?:test|spec)\.[cm]?[jt]sx?$/.test(entry.name)) continue
    out.push(full)
  }
  return out
}

function requireCheck(condition, id, detail) {
  if (!condition) {
    checks.push({ id, status: 'BLOCKED', detail })
    throw new Error(`${id}: ${detail}`)
  }
  checks.push({ id, status: 'PASS' })
}

function writeReceipt(status, payload) {
  fs.writeFileSync(
    outputPath,
    `${JSON.stringify({
      schema: 'docente-os.cpri-runtime-preflight.v1',
      status,
      generatedAt: new Date().toISOString(),
      ...payload,
    }, null, 2)}\n`,
    'utf8',
  )
}

function requiredEnv(name) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is required for CPRI runtime preflight`)
  return value
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runCpriRuntimePreflight().catch((error) => {
    process.stderr.write(`CPRI runtime preflight BLOCKED: ${error instanceof Error ? error.message : String(error)}\n`)
    process.exitCode = 1
  })
}
