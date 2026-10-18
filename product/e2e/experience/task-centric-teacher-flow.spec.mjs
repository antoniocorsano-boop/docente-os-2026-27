import { expect, test } from '@playwright/test'
import { authenticatedAal2Supabase } from '../support/direct-aal2-supabase.mjs'
import { loginE2E, requireE2ECredentials } from '../support/e2e-auth.mjs'

requireE2ECredentials()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
const BOOKS_FIXTURE_NOTE = 'HVA · Libri di testo · Cattedra tecnica'
const BOOKS_FIXTURE_DISCIPLINE = 'Tecnologia HVA Libri'
const CANONICAL_DISCIPLINE = 'Tecnologia'

test('Journey: Oggi → Prepara → Materiali preserves one teacher task', async ({ page }, testInfo) => {
  await loginE2E(page)
  await page.goto('/planner')

  const focus = page.locator('.todayTeachingFocus')
  await expect(focus).toBeVisible()
  const fixture = await ensureCanonicalJ1Fixture(focus)

  try {
    if (fixture.changed) {
      await page.goto('/planner')
      await expect(focus).toBeVisible()
    }

    const classLabel = (await focus.locator('.todayTeachingClassBadge').innerText()).trim()
    const lessonTitle = (await focus.getByRole('heading', { level: 2 }).innerText()).trim()
    const primary = focus.locator('a.todayTeachingPrimaryAction')

    await expect(primary).toHaveText(/Prepara lezione/)
    await primary.click()

    const shell = page.locator('[data-lesson-shell]')
    await expect(
      shell,
      'PREPARA deve mantenere una Lesson Shell persistente invece di cambiare identità di prodotto.',
    ).toBeVisible()
    await expect(shell).toContainText(classLabel)
    await expect(shell).toContainText(lessonTitle)
    await expect(page.locator('[data-lesson-phase="prepare"]')).toHaveAttribute('aria-current', 'step')

    const materials = page.getByRole('button', { name: 'Materiali', exact: true })
      .or(page.getByRole('link', { name: 'Materiali', exact: true }))
    await expect(
      materials,
      'Materiali deve essere un subtask diretto di PREPARA, non nascosto dentro progettazione completa.',
    ).toBeVisible()
    await materials.click()

    await expect(page.locator('[data-lesson-subtask="materials"]')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Riutilizza', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Adatta', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: /Crea/ })).toBeVisible()
    await expect(page.getByText('Conoscenza', { exact: true })).toHaveCount(0)
    await expect(page.getByText('Progetta', { exact: true })).toHaveCount(0)

    const firstPreview = page.getByRole('link', { name: 'Controlla', exact: true }).first()
    await expect(
      firstPreview,
      'Una risorsa Knowledge proposta in Materiali deve aprirsi nel Viewer focalizzato del compito.',
    ).toBeVisible()
    await firstPreview.click()

    const materialPreview = page.locator('[data-lesson-material-preview]')
    await expect(
      materialPreview,
      'Il Viewer deve restare una superficie della lezione, non diventare la scheda generica di Conoscenza.',
    ).toBeVisible()
    await expect(page.locator('[data-lesson-shell]')).toContainText(classLabel)
    await expect(page.locator('[data-lesson-shell]')).toContainText(lessonTitle)
    await expect(materialPreview.getByRole('button', { name: 'Usa nella lezione', exact: true })).toBeVisible()
    await expect(materialPreview).not.toContainText(/\bB\d{2}\b/)
    await expect(page.getByText('Conoscenza', { exact: true })).toHaveCount(0)

    const backToMaterials = page.getByRole('link', { name: 'Torna ai materiali', exact: true })
    await expect(backToMaterials).toBeVisible()
    await backToMaterials.click()
    await expect(page.locator('[data-lesson-subtask="materials"]')).toBeVisible()
    await expect(page.locator('[data-lesson-shell]')).toContainText(classLabel)
    await expect(page.locator('[data-lesson-shell]')).toContainText(lessonTitle)

    if (testInfo.project.name.startsWith('mobile')) {
      await page.setViewportSize({ width: 320, height: 800 })
      const geometry = await page.evaluate(() => ({
        innerWidth: window.innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }))
      expect(
        geometry.scrollWidth,
        `Il flusso focalizzato non deve produrre overflow orizzontale a 320px: ${geometry.scrollWidth}px su ${geometry.innerWidth}px.`,
      ).toBeLessThanOrEqual(geometry.innerWidth + 1)
    }
  } finally {
    await fixture.restore()
  }
})

async function ensureCanonicalJ1Fixture(focus) {
  const primary = focus.locator('a.todayTeachingPrimaryAction')
  const currentLabel = (await primary.innerText()).trim()
  const existingBadge = await focus.locator('.todayTeachingClassBadge').count()
  if (/Prepara lezione/i.test(currentLabel) && existingBadge === 1) {
    return { changed: false, restore: async () => {} }
  }

  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY sono richiesti dalla fixture task-centric governata')
  }

  const href = await primary.getAttribute('href')
  const sectionMatch = href?.match(/^\/classi\/([^/?#]+)$/)
  if (!sectionMatch) {
    throw new Error(`Task-centric flow non può isolare la fixture: fallback inatteso ${href ?? 'senza href'}`)
  }
  const sectionId = sectionMatch[1]

  const { supabase } = await authenticatedAal2Supabase({
    supabaseUrl,
    supabasePublishableKey,
    label: 'DOS-UX-01 canonical fixture',
  })

  const { data: assignments, error: assignmentsError } = await supabase
    .from('teaching_assignments')
    .select('id,status,discipline_id,source_note')
    .eq('section_id', sectionId)
  if (assignmentsError) throw new Error(`Task-centric fixture assignment lookup failed: ${assignmentsError.message}`)

  const assignment = assignments?.find((item) => item.source_note === BOOKS_FIXTURE_NOTE)
  if (!assignment) {
    throw new Error('Task-centric fallback non appartiene alla Cattedra tecnica HVA nota: nessuna mutazione viene tentata')
  }

  const { data: discipline, error: disciplineError } = await supabase
    .from('teaching_disciplines')
    .select('id,workspace_id,academic_year_id,name,is_active')
    .eq('id', assignment.discipline_id)
    .single()
  if (disciplineError || !discipline) {
    throw new Error(`Task-centric fixture discipline lookup failed: ${disciplineError?.message ?? 'discipline missing'}`)
  }
  if (discipline.name !== BOOKS_FIXTURE_DISCIPLINE && discipline.name !== CANONICAL_DISCIPLINE) {
    throw new Error(`Task-centric flow refuses unexpected technical discipline: ${discipline.name}`)
  }

  const { data: canonicalConflicts, error: conflictError } = await supabase
    .from('teaching_disciplines')
    .select('id')
    .eq('workspace_id', discipline.workspace_id)
    .eq('academic_year_id', discipline.academic_year_id)
    .eq('name', CANONICAL_DISCIPLINE)
    .neq('id', discipline.id)
  if (conflictError) throw new Error(`Task-centric fixture canonical-discipline check failed: ${conflictError.message}`)
  if (canonicalConflicts?.length) {
    throw new Error('Task-centric fixture refuses to rename the technical discipline because a canonical Tecnologia already exists')
  }

  const original = {
    assignmentStatus: assignment.status,
    disciplineName: discipline.name,
    disciplineActive: discipline.is_active,
  }
  let disciplineChanged = false
  let assignmentChanged = false

  try {
    if (discipline.name !== CANONICAL_DISCIPLINE || !discipline.is_active) {
      const { error } = await supabase
        .from('teaching_disciplines')
        .update({ name: CANONICAL_DISCIPLINE, is_active: true })
        .eq('id', discipline.id)
      if (error) throw new Error(`Task-centric fixture discipline promotion failed: ${error.message}`)
      disciplineChanged = true
    }

    if (assignment.status !== 'CONFIRMED') {
      const { error } = await supabase
        .from('teaching_assignments')
        .update({ status: 'CONFIRMED' })
        .eq('id', assignment.id)
      if (error) throw new Error(`Task-centric fixture assignment promotion failed: ${error.message}`)
      assignmentChanged = true
    }
  } catch (error) {
    await restoreFixture({
      supabase,
      assignmentId: assignment.id,
      disciplineId: discipline.id,
      original,
      assignmentChanged,
      disciplineChanged,
    }).catch(() => {})
    throw error
  }

  return {
    changed: disciplineChanged || assignmentChanged,
    restore: async () => restoreFixture({
      supabase,
      assignmentId: assignment.id,
      disciplineId: discipline.id,
      original,
      assignmentChanged,
      disciplineChanged,
    }),
  }
}

async function restoreFixture({
  supabase,
  assignmentId,
  disciplineId,
  original,
  assignmentChanged,
  disciplineChanged,
}) {
  if (assignmentChanged) {
    const { error } = await supabase
      .from('teaching_assignments')
      .update({ status: original.assignmentStatus })
      .eq('id', assignmentId)
    if (error) throw new Error(`Task-centric fixture assignment restore failed: ${error.message}`)
  }

  if (disciplineChanged) {
    const { error } = await supabase
      .from('teaching_disciplines')
      .update({ name: original.disciplineName, is_active: original.disciplineActive })
      .eq('id', disciplineId)
    if (error) throw new Error(`Task-centric fixture discipline restore failed: ${error.message}`)
  }
}
