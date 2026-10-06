import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { expect, test } from '@playwright/test'
import { loginE2E, requireE2ECredentials } from './support/e2e-auth.mjs'
import { generateTotp, governedMfaRetryJitterMs, millisecondsUntilNextTotpStep } from './support/totp.mjs'

requireE2ECredentials()

const expectedRuntimeSha = process.env.EXPECTED_RUNTIME_SHA
const expectedDeployId = process.env.EXPECTED_DEPLOY_ID
const marker = process.env.CANARY_MARKER
const effectiveDate = process.env.CANARY_EFFECTIVE_DATE
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

for (const [name, value] of Object.entries({
  EXPECTED_RUNTIME_SHA: expectedRuntimeSha,
  EXPECTED_DEPLOY_ID: expectedDeployId,
  CANARY_MARKER: marker,
  CANARY_EFFECTIVE_DATE: effectiveDate,
  NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: supabaseKey,
})) {
  if (!value) throw new Error(`${name} is required for DOS-M4 runtime canary`)
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function writeReceipt(receipt) {
  const outputDir = path.join(process.cwd(), 'test-results', 'dos-m4-canary')
  fs.mkdirSync(outputDir, { recursive: true })
  fs.writeFileSync(path.join(outputDir, 'receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`, 'utf8')
}

async function elevateSupabaseToGovernedAal2(supabase) {
  const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors()
  if (factorsError) throw new Error(`Could not list governed canary MFA factors: ${factorsError.message}`)

  const verifiedTotp = (factorsData?.totp ?? []).filter((factor) => factor.status === 'verified')
  const factor = verifiedTotp.find((candidate) => candidate.friendly_name === 'Docente OS CI') ?? verifiedTotp[0]
  if (!factor) throw new Error('Governed canary account has no verified TOTP factor')

  // Browser login has just consumed a TOTP code. Move to the next step before
  // elevating the independent RLS client so replay protection cannot couple the probes.
  await sleep(millisecondsUntilNextTotpStep() + 750 + governedMfaRetryJitterMs())

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: factor.id })
    if (challengeError || !challenge?.id) {
      throw new Error(`Could not start governed canary MFA challenge: ${challengeError?.message ?? 'missing challenge id'}`)
    }

    const code = generateTotp(process.env.E2E_TOTP_SECRET)
    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: factor.id,
      challengeId: challenge.id,
      code,
    })

    if (!verifyError) {
      const { data: aal, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      if (aalError) throw new Error(`Could not verify governed canary AAL: ${aalError.message}`)
      if (aal?.currentLevel === 'aal2') return
    }

    if (attempt === 3) {
      throw new Error(`Governed canary RLS client did not reach AAL2: ${verifyError?.message ?? 'unknown verification failure'}`)
    }
    await sleep(millisecondsUntilNextTotpStep() + 750 + governedMfaRetryJitterMs())
  }
}

async function readWorkspaceContext(supabase) {
  const { data, error } = await supabase.rpc('current_workspace_context')
  if (error) throw new Error(`Could not read current workspace context through governed RLS: ${error.message}`)
  const row = data?.[0]
  if (!row?.workspace_id || !row?.academic_year_id) {
    throw new Error(`Governed RLS session returned no active workspace/year context: ${JSON.stringify(data)}`)
  }
  return row
}

async function readVersions(supabase, workspaceId, academicYearId) {
  const { data, error } = await supabase
    .from('timetable_versions')
    .select('id,workspace_id,academic_year_id,label,status,effective_from,effective_to,created_at,updated_at')
    .eq('workspace_id', workspaceId)
    .eq('academic_year_id', academicYearId)
    .order('created_at', { ascending: true })
  if (error) throw new Error(`Could not read timetable versions through RLS: ${error.message}`)
  return data ?? []
}

async function markerSlotCount(supabase, versionId) {
  const { count, error } = await supabase
    .from('timetable_slots')
    .select('id', { count: 'exact', head: true })
    .eq('timetable_version_id', versionId)
    .eq('note', marker)
  if (error) throw new Error(`Could not read marker slots for ${versionId} through RLS: ${error.message}`)
  return count ?? 0
}

async function waitForLifecycle(supabase, workspaceId, academicYearId, activatedVersionId, previousActiveVersionId) {
  let last = []
  for (let attempt = 1; attempt <= 20; attempt += 1) {
    last = await readVersions(supabase, workspaceId, academicYearId)
    const activated = last.find((version) => version.id === activatedVersionId)
    const previous = last.find((version) => version.id === previousActiveVersionId)
    const nextDraft = last.find((version) => version.status === 'DRAFT' && version.id !== activatedVersionId)
    if (activated?.status === 'ACTIVE' && previous?.status === 'ARCHIVED' && nextDraft) {
      return { versions: last, activated, previous, nextDraft }
    }
    await sleep(500)
  }
  throw new Error(`Timetable lifecycle did not converge after activation: ${JSON.stringify(last)}`)
}

test('DOS-M4-01 runtime canary: Orario persists, activates and preserves lineage', async ({ page, request }) => {
  test.setTimeout(300_000)

  const buildInfoResponse = await request.get('/api/build-info')
  expect(buildInfoResponse.ok()).toBeTruthy()
  const buildInfo = await buildInfoResponse.json()
  expect(buildInfo.commit).toBe(expectedRuntimeSha)

  await loginE2E(page)

  await page.goto('/orario/aggiorna?fase=data')
  await expect(page.getByRole('heading', { name: 'Da quando deve valere?' })).toBeVisible()
  const draftVersionId = await page.locator('input[name="versionId"]').inputValue()
  expect(draftVersionId).toBeTruthy()

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: process.env.E2E_EMAIL,
    password: process.env.E2E_PASSWORD,
  })
  if (signInError) throw new Error(`Governed canary RLS sign-in failed: ${signInError.message}`)
  await elevateSupabaseToGovernedAal2(supabase)

  const workspaceContext = await readWorkspaceContext(supabase)
  const versionsBefore = await readVersions(supabase, workspaceContext.workspace_id, workspaceContext.academic_year_id)
  const draftBefore = versionsBefore.find((version) => version.id === draftVersionId)
  expect(draftBefore, `UI draft ${draftVersionId} must be visible through the same governed AAL2 RLS context`).toBeTruthy()
  expect(draftBefore.status).toBe('DRAFT')
  const previousActive = versionsBefore.find((version) => version.status === 'ACTIVE')
  expect(previousActive, 'La canary L4 richiede una sostituzione reale di una versione ACTIVE esistente').toBeTruthy()
  expect(previousActive.id).not.toBe(draftVersionId)
  const archivedBefore = versionsBefore.filter((version) => version.status === 'ARCHIVED').length

  await page.goto('/orario/aggiorna')
  await expect(page.getByRole('heading', { name: 'Modifica orario' })).toBeVisible()

  const existingMarker = page.locator('.occupiedTimetableCell').filter({ hasText: marker })
  if ((await existingMarker.count()) === 0) {
    const emptyCell = page.locator('button[aria-label^="Aggiungi attività:"]:visible').first()
    await expect(emptyCell, 'La canary richiede almeno una cella vuota visibile nell’account E2E governato').toBeVisible()
    await emptyCell.click()

    const editor = page.locator('.timetableEditor')
    await expect(editor).toBeVisible()
    await page.getByLabel('Che cosa fai in quest’ora?').selectOption('OTHER')
    await editor.getByText('Dettagli opzionali', { exact: true }).click()
    await page.getByLabel('Nota').fill(marker)
    await page.getByRole('button', { name: 'Aggiungi', exact: true }).click()
  }

  const markerCell = page.locator('.occupiedTimetableCell').filter({ hasText: marker })
  await expect(markerCell).toHaveCount(1)
  await expect.poll(() => markerSlotCount(supabase, draftVersionId), { timeout: 20_000 }).toBe(1)

  await page.reload()
  await expect(page.locator('.occupiedTimetableCell').filter({ hasText: marker })).toHaveCount(1)

  await page.goto('/orario/aggiorna?fase=data')
  await expect(page.getByRole('heading', { name: 'Da quando deve valere?' })).toBeVisible()
  await page.getByLabel('In uso dal').fill(effectiveDate)
  await page.getByRole('button', { name: 'Continua', exact: true }).click()
  await page.waitForURL(/\/orario\/aggiorna\?fase=controllo/, { timeout: 30_000 })

  await expect(page.getByRole('heading', { name: 'Controlla e attiva' })).toBeVisible()
  await expect(page.locator('.occupiedTimetableCell').filter({ hasText: marker })).toHaveCount(1)
  await expect(page.getByRole('heading', { name: 'Vuoi metterlo in uso?' })).toBeVisible()
  await page.getByRole('button', { name: 'Metti in uso', exact: true }).click()
  await page.waitForURL(/\/orario(?:\?.*)?$/, { timeout: 30_000 })

  const [year, month, day] = effectiveDate.split('-')
  await expect(page.getByText(`In uso dal ${day}/${month}/${year}.`, { exact: true })).toBeVisible()
  await expect(page.locator('.occupiedTimetableCell').filter({ hasText: marker })).toHaveCount(1)

  await page.reload()
  await expect(page.getByText(`In uso dal ${day}/${month}/${year}.`, { exact: true })).toBeVisible()
  await expect(page.locator('.occupiedTimetableCell').filter({ hasText: marker })).toHaveCount(1)

  const lifecycle = await waitForLifecycle(
    supabase,
    workspaceContext.workspace_id,
    workspaceContext.academic_year_id,
    draftVersionId,
    previousActive.id,
  )

  expect(lifecycle.activated.effective_from).toBe(effectiveDate)
  expect(lifecycle.previous.effective_to).toBeTruthy()
  const archivedAfter = lifecycle.versions.filter((version) => version.status === 'ARCHIVED').length
  expect(archivedAfter).toBeGreaterThanOrEqual(archivedBefore + 1)
  expect(await markerSlotCount(supabase, draftVersionId)).toBe(1)
  expect(await markerSlotCount(supabase, lifecycle.nextDraft.id)).toBe(1)

  writeReceipt({
    id: 'EV-MAT-DOS-RUNTIME-CANARY-2026-10-06',
    type: 'RUNTIME_CANARY',
    area: 'docente-os',
    status: 'PASS',
    observedAt: new Date().toISOString(),
    confidence: 'HIGH',
    freshness: { policy: 'RUNTIME_BOUND' },
    supports: [{ level: 4 }],
    source: {
      repository: 'antoniocorsano-boop/docente-os-2026-27',
      ref: expectedDeployId,
    },
    binding: {
      areaRef: 'docente-os',
      releaseRef: expectedDeployId,
      exactHead: expectedRuntimeSha,
    },
    runtime: {
      buildInfo,
      baseUrl: process.env.E2E_BASE_URL,
    },
    canary: {
      marker,
      effectiveDate,
      draftPersistenceVerified: true,
      activationVerified: true,
      activePersistenceAfterReloadVerified: true,
      lineageVerifiedThroughRls: true,
      previousActiveVersionId: previousActive.id,
      activatedVersionId: draftVersionId,
      nextDraftVersionId: lifecycle.nextDraft.id,
      previousActiveArchived: lifecycle.previous.status === 'ARCHIVED',
      archivedBefore,
      archivedAfter,
      markerInActivatedVersion: true,
      markerPropagatedToNextDraft: true,
    },
  })
})
