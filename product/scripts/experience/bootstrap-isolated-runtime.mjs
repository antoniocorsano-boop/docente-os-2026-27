import fs from 'node:fs'
import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { generateTotp, millisecondsUntilNextTotpStep } from '../../e2e/support/totp.mjs'

const url = requiredEnv('NEXT_PUBLIC_SUPABASE_URL')
const publishableKey = requiredEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')
const serviceRoleKey = requiredEnv('ISOLATED_SUPABASE_SERVICE_ROLE_KEY')
const githubEnv = requiredEnv('GITHUB_ENV')

const email = 'docente-os-hva-local@example.invalid'
const password = 'DocenteOS-HVA-Local-2026!'

const admin = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
})
const userClient = createClient(url, publishableKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
})

const { data: created, error: createError } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
})
if (createError || !created?.user?.id) throw new Error(`isolated user bootstrap failed: ${createError?.message ?? 'missing user'}`)
const userId = created.user.id

const { error: signInError } = await userClient.auth.signInWithPassword({ email, password })
if (signInError) throw new Error(`isolated user sign-in failed: ${signInError.message}`)

const { data: enrollment, error: enrollError } = await userClient.auth.mfa.enroll({
  factorType: 'totp',
  friendlyName: 'Docente OS CI',
})
if (enrollError || !enrollment?.id || !enrollment?.totp?.secret) {
  throw new Error(`isolated TOTP enrollment failed: ${enrollError?.message ?? 'missing factor data'}`)
}
const totpSecret = enrollment.totp.secret
await verifyEnrolledTotp(userClient, enrollment.id, totpSecret)

const { data: aal, error: aalError } = await userClient.auth.mfa.getAuthenticatorAssuranceLevel()
if (aalError || aal?.currentLevel !== 'aal2') {
  throw new Error(`isolated user did not reach AAL2: ${aalError?.message ?? aal?.currentLevel ?? 'unknown'}`)
}

const { data: workspaceId, error: workspaceError } = await userClient.rpc('bootstrap_personal_workspace', {
  workspace_name: 'Docente OS HVA isolated workspace',
})
if (workspaceError || !workspaceId) throw new Error(`isolated workspace bootstrap failed: ${workspaceError?.message ?? 'missing id'}`)

const academicYearId = crypto.randomUUID()
await must(admin.from('academic_years').insert({
  id: academicYearId,
  workspace_id: workspaceId,
  label: '2026/2027 HVA isolated',
  starts_on: '2026-09-01',
  ends_on: '2027-08-31',
  is_active: true,
}), 'academic year')

for (const code of ['CAN-PLAN-1', 'CAN-PLAN-2', 'CAN-PLAN-3']) {
  const assetId = crypto.randomUUID()
  const generationId = crypto.randomUUID()
  await must(admin.from('knowledge_assets').insert({
    id: assetId,
    workspace_id: workspaceId,
    academic_year_id: academicYearId,
    asset_kind: 'GENERATED',
    source_provider: 'SYSTEM',
    original_name: `HVA isolated ${code}`,
    processing_status: 'INDEXED',
    source_metadata: { canonicalExecCode: code, fixture: 'isolated-hva' },
    created_by: userId,
  }), `${code} asset`)
  await must(admin.from('knowledge_processing_generations').insert({
    id: generationId,
    asset_id: assetId,
    workspace_id: workspaceId,
    generation_no: 1,
    status: 'SUCCEEDED',
    processor_label: 'isolated-hva-bootstrap',
    finished_at: new Date().toISOString(),
  }), `${code} generation`)
  await must(admin.from('knowledge_assets').update({ current_generation_id: generationId }).eq('id', assetId), `${code} current generation`)
  const { error: bindingError } = await admin.rpc('bind_canonical_plan_runtime_source', {
    p_workspace_id: workspaceId,
    p_academic_year_id: academicYearId,
    p_canonical_plan_code: code,
    p_asset_id: assetId,
    p_generation_id: generationId,
  })
  if (bindingError) throw new Error(`${code} binding failed: ${bindingError.message}`)
}

const sectionId = crypto.randomUUID()
await must(userClient.from('annual_plan_sections').insert({
  id: sectionId,
  workspace_id: workspaceId,
  academic_year_id: academicYearId,
  grade: 'SECONDA',
  section_code: 'A',
  status: 'CONFERMATA',
  source_note: 'Isolated exact-head browser certification fixture',
  created_by: userId,
}), 'confirmed SECONDA/A section')

const disciplineId = crypto.randomUUID()
await must(admin.from('teaching_disciplines').insert({
  id: disciplineId,
  workspace_id: workspaceId,
  academic_year_id: academicYearId,
  name: 'Tecnologia',
  is_active: true,
  created_by: userId,
}), 'Tecnologia discipline')

const assignmentId = crypto.randomUUID()
await must(admin.from('teaching_assignments').insert({
  id: assignmentId,
  workspace_id: workspaceId,
  academic_year_id: academicYearId,
  section_id: sectionId,
  discipline_id: disciplineId,
  weekly_minutes: 120,
  status: 'CONFIRMED',
  source_note: 'Isolated exact-head browser certification fixture',
  created_by: userId,
}), '2A Tecnologia teaching assignment')

const timetableVersionId = crypto.randomUUID()
await must(admin.from('timetable_versions').insert({
  id: timetableVersionId,
  workspace_id: workspaceId,
  academic_year_id: academicYearId,
  label: 'Orario HVA isolato',
  status: 'DRAFT',
  effective_from: '2026-09-01',
  source_kind: 'MANUAL',
  source_ref: 'isolated-hva-bootstrap',
  created_by: userId,
}), 'isolated HVA timetable draft')

await must(admin.from('timetable_slots').insert({
  id: crypto.randomUUID(),
  timetable_version_id: timetableVersionId,
  weekday: 1,
  start_time: '08:00:00',
  end_time: '09:00:00',
  slot_kind: 'LESSON',
  section_id: sectionId,
  discipline_id: disciplineId,
  teaching_assignment_id: assignmentId,
  ordinal: 1,
  created_by: userId,
}), 'isolated HVA lesson slot')

await must(admin.from('timetable_versions').update({
  status: 'ACTIVE',
}).eq('id', timetableVersionId), 'activate isolated HVA timetable')

fs.appendFileSync(
  githubEnv,
  [
    `E2E_EMAIL=${email}`,
    `E2E_PASSWORD=${password}`,
    `E2E_TOTP_SECRET=${totpSecret}`,
    `ISOLATED_HVA_USER_ID=${userId}`,
    `ISOLATED_HVA_WORKSPACE_ID=${workspaceId}`,
    `ISOLATED_HVA_ACADEMIC_YEAR_ID=${academicYearId}`,
    '',
  ].join('\n'),
  'utf8',
)

process.stdout.write(`Isolated HVA runtime fixture ready for workspace ${workspaceId}\n`)
await userClient.auth.signOut().catch(() => {})

async function verifyEnrolledTotp(client, factorId, secret) {
  let lastError = null
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const remaining = millisecondsUntilNextTotpStep()
    if (remaining < 5_000) await sleep(remaining + 500)

    const { data: challenge, error: challengeError } = await client.auth.mfa.challenge({ factorId })
    if (challengeError) {
      lastError = challengeError
    } else {
      const { error: verifyError } = await client.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code: generateTotp(secret),
      })
      if (!verifyError) return
      lastError = verifyError
    }
    if (attempt < 3) await sleep(millisecondsUntilNextTotpStep() + 500)
  }
  throw new Error(`isolated TOTP verification failed: ${lastError?.message ?? 'unknown error'}`)
}

async function must(query, label) {
  const { error } = await query
  if (error) throw new Error(`${label} bootstrap failed: ${error.message}`)
}

function requiredEnv(name) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is required for isolated HVA runtime bootstrap`)
  return value
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
