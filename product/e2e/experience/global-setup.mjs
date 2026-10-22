import { chromium, expect } from '@playwright/test'
import { loginE2E, requireE2ECredentials } from '../support/e2e-auth.mjs'
import { authenticatedAal2Supabase } from '../support/direct-aal2-supabase.mjs'
import {
  deleteAllKnowledgeFixtures,
  knowledgeFixtureAssetIds,
  retainNewestKnowledgeFixture,
} from '../support/knowledge-fixture-hygiene.mjs'
import {
  EXPERIENCE_UDA_FIXTURE_TEXT,
  experienceUdaFixtureTitle,
} from '../support/experience-uda-fixture.mjs'
import { writeExperienceFixtureState } from './surfaces.mjs'

const baseURL = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3000'
const HVA_DISCIPLINE_FIXTURE_NAME = 'Tecnologia HVA Libri'
const HVA_CANONICAL_DISCIPLINE_NAME = 'Tecnologia'

export default async function globalSetup() {
  requireE2ECredentials()
  const title = experienceUdaFixtureTitle()
  const disciplineFixture = process.env.EXPERIENCE_TARGET === 'local'
    ? await normalizeCanonicalDisciplineFixture()
    : null
  const browser = await chromium.launch()
  const context = await browser.newContext({
    baseURL,
    locale: 'it-IT',
    timezoneId: 'Europe/Rome',
    viewport: { width: 1280, height: 900 },
  })
  const page = await context.newPage()

  try {
    await loginE2E(page)
    let assetId = await retainNewestKnowledgeFixture(page, title)

    if (!assetId) {
      await page.goto('/knowledge')
      const capture = page.locator('details.knowledgeCaptureDisclosure')
      await expect(capture).toBeVisible()
      if (await capture.getAttribute('open') === null) await capture.locator(':scope > summary').click()
      await expect(capture).toHaveAttribute('open', '')
      await page.locator('input[name="title"]').fill(title)
      await page.locator('textarea[name="text"]').fill(EXPERIENCE_UDA_FIXTURE_TEXT)
      await Promise.all([
        page.waitForURL(/\/knowledge\/[^/?#]+$/, { timeout: 60_000 }),
        page.getByRole('button', { name: 'Salva e organizza' }).click(),
      ])
      assetId = assetIdFromUrl(page.url())
    } else {
      await page.goto(`/knowledge/${encodeURIComponent(assetId)}`)
    }

    const contextForm = page.locator('form.contextForm')
    await expect(contextForm).toBeVisible()
    await contextForm.locator('select[name="contentCategory"]').selectOption('UDA')
    await contextForm.locator('input[name="disciplines"]').fill('Tecnologia')
    await contextForm.locator('input[name="classLabels"]').fill('1A')
    await expect(contextForm.locator('input[name="contextStatus"]')).toHaveValue('REVIEWED')
    // Correcting professional context must not imply that the source itself was verified.
    await expect(contextForm.locator('input[name="reliability"]')).toHaveValue('AUTO')
    await Promise.all([
      page.waitForURL(new RegExp(`/knowledge/${escapeRegExp(assetId)}\\?context=updated$`), { timeout: 30_000 }),
      contextForm.getByRole('button', { name: 'Salva correzione' }).click(),
    ])

    await page.goto('/progetta?grade=prima')
    const udaGroup = page.locator('.progettaGroup').filter({ hasText: /Unità di apprendimento|UDA/i }).first()
    await expect(udaGroup, 'Il provisioning deve rendere disponibile il gruppo UDA della classe prima.').toBeVisible()
    const udaLink = udaGroup.locator(`a[href^="/knowledge/${assetId}?"]`).first()
    await expect(
      udaLink,
      'L’UDA tecnica deve essere raggiungibile da Progetta tramite la normale risorsa Knowledge.',
    ).toBeVisible()
    await expect(
      udaLink,
      'Progetta deve già esporre la UDA tecnica nel contesto di preparazione.',
    ).toHaveAttribute('href', /[?&]mode=prepare(?:&|$)/)

    await writeExperienceFixtureState({ udaAssetId: assetId })
    process.stdout.write(`HVA UDA fixture ready: ${assetId}\n`)
  } catch (error) {
    await deleteAllKnowledgeFixtures(page, title).catch(() => {})
    await restoreCanonicalDisciplineFixture(disciplineFixture).catch(() => {})
    throw error
  } finally {
    await browser.close()
  }

  return async () => {
    try {
      await cleanupFixture(title)
    } finally {
      await restoreCanonicalDisciplineFixture(disciplineFixture)
    }
  }
}

async function normalizeCanonicalDisciplineFixture() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()
  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error('Local HVA discipline fixture requires Supabase URL and publishable key')
  }

  const { supabase } = await authenticatedAal2Supabase({
    supabaseUrl,
    supabasePublishableKey,
    label: 'HVA canonical discipline fixture',
  })
  const { data: disciplines, error: disciplinesError } = await supabase
    .from('teaching_disciplines')
    .select('id, workspace_id, academic_year_id, name, is_active')
  if (disciplinesError) throw new Error(`HVA discipline lookup failed: ${disciplinesError.message}`)

  const technical = (disciplines ?? []).filter((item) => item.name.trim() === HVA_DISCIPLINE_FIXTURE_NAME)
  const canonical = (disciplines ?? []).filter((item) => item.name.trim() === HVA_CANONICAL_DISCIPLINE_NAME)
  if (technical.length > 1) throw new Error('HVA discipline fixture is ambiguous')

  const discipline = technical[0] ?? (canonical.length === 1 ? canonical[0] : null)
  if (!discipline) {
    throw new Error(`HVA discipline fixture must expose exactly one ${HVA_DISCIPLINE_FIXTURE_NAME} or ${HVA_CANONICAL_DISCIPLINE_NAME} discipline`)
  }

  const canonicalConflict = canonical.find((item) =>
    item.id !== discipline.id
    && item.workspace_id === discipline.workspace_id
    && item.academic_year_id === discipline.academic_year_id,
  )
  if (canonicalConflict) throw new Error('HVA discipline fixture cannot be normalized because Tecnologia already exists in the same context')

  const { data: assignments, error: assignmentsError } = await supabase
    .from('teaching_assignments')
    .select('id, status')
    .eq('discipline_id', discipline.id)
  if (assignmentsError) throw new Error(`HVA assignment lookup failed: ${assignmentsError.message}`)
  if (!(assignments ?? []).length) throw new Error('HVA canonical discipline fixture has no teaching assignment')

  const originalAssignments = assignments.map((item) => ({ id: item.id, status: item.status }))
  const assignmentIdsToConfirm = originalAssignments.filter((item) => item.status !== 'CONFIRMED').map((item) => item.id)

  if (discipline.name !== HVA_CANONICAL_DISCIPLINE_NAME || discipline.is_active !== true) {
    const { error } = await supabase
      .from('teaching_disciplines')
      .update({ name: HVA_CANONICAL_DISCIPLINE_NAME, is_active: true })
      .eq('id', discipline.id)
    if (error) throw new Error(`HVA discipline normalization failed: ${error.message}`)
  }

  if (assignmentIdsToConfirm.length) {
    const { error } = await supabase
      .from('teaching_assignments')
      .update({ status: 'CONFIRMED' })
      .in('id', assignmentIdsToConfirm)
    if (error) throw new Error(`HVA assignment normalization failed: ${error.message}`)
  }

  process.stdout.write(`HVA canonical discipline fixture ready: ${HVA_CANONICAL_DISCIPLINE_NAME}; assignments=${originalAssignments.length}\n`)
  return {
    supabase,
    disciplineId: discipline.id,
    originalName: discipline.name,
    originalIsActive: discipline.is_active,
    assignments: originalAssignments,
  }
}

async function restoreCanonicalDisciplineFixture(fixture) {
  if (!fixture) return

  for (const assignment of fixture.assignments) {
    if (assignment.status === 'CONFIRMED') continue
    const { error } = await fixture.supabase
      .from('teaching_assignments')
      .update({ status: assignment.status })
      .eq('id', assignment.id)
    if (error) throw new Error(`HVA assignment restore failed: ${error.message}`)
  }

  if (fixture.originalName !== HVA_CANONICAL_DISCIPLINE_NAME || fixture.originalIsActive !== true) {
    const { error } = await fixture.supabase
      .from('teaching_disciplines')
      .update({ name: fixture.originalName, is_active: fixture.originalIsActive })
      .eq('id', fixture.disciplineId)
    if (error) throw new Error(`HVA discipline restore failed: ${error.message}`)
  }

  process.stdout.write('HVA canonical discipline fixture restored.\n')
}

async function cleanupFixture(title) {
  const browser = await chromium.launch()
  const context = await browser.newContext({
    baseURL,
    locale: 'it-IT',
    timezoneId: 'Europe/Rome',
    viewport: { width: 1280, height: 900 },
  })
  const page = await context.newPage()

  try {
    await loginE2E(page)
    await deleteAllKnowledgeFixtures(page, title)
    const remaining = await knowledgeFixtureAssetIds(page, title)
    if (remaining.length) throw new Error(`HVA UDA cleanup incomplete: ${remaining.length} fixture remain`)
    process.stdout.write('HVA UDA fixture cleanup complete.\n')
  } finally {
    await browser.close()
  }
}

function assetIdFromUrl(url) {
  const match = new URL(url).pathname.match(/^\/knowledge\/([^/?#]+)$/)
  if (!match) throw new Error(`Knowledge asset id not found in URL: ${url}`)
  return decodeURIComponent(match[1])
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
