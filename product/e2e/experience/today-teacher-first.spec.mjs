import fs from 'node:fs/promises'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import { authenticatedAal2Supabase } from '../support/direct-aal2-supabase.mjs'
import { loginE2E, requireE2ECredentials } from '../support/e2e-auth.mjs'

requireE2ECredentials()

const outputRoot = process.env.EXPERIENCE_OUTPUT_DIR ?? 'test-results/experience'
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
const BOOKS_FIXTURE_NOTE = 'HVA · Libri di testo · Cattedra tecnica'
const BOOKS_FIXTURE_DISCIPLINE = 'Tecnologia HVA Libri'
const CANONICAL_DISCIPLINE = 'Tecnologia'

test('Journey: Oggi → prossima lezione → preparazione', async ({ page }, testInfo) => {
  await loginE2E(page)
  await page.goto('/planner')

  await expect(page.getByRole('heading', { level: 1, name: 'Oggi', exact: true })).toBeVisible()

  const focus = page.locator('.todayTeachingFocus')
  await expect(
    focus,
    'La fixture HVA deve esporre una lezione corrente/prossima deterministica: J1 non può essere NOT_APPLICABLE.',
  ).toBeVisible()

  const fixture = await ensureCanonicalJ1Fixture(focus)

  try {
    if (fixture.changed) {
      await page.goto('/planner')
      await expect(focus).toBeVisible()
    }

    const secondary = page.locator('.todaySecondaryWork')
    await expect(secondary).toBeVisible()
    const order = await page.evaluate(() => {
      const teaching = document.querySelector('.todayTeachingFocus')
      const generic = document.querySelector('.todaySecondaryWork')
      if (!teaching || !generic) return null
      return teaching.compareDocumentPosition(generic)
    })
    expect(order, 'Impossibile confrontare focus didattico e contenuto secondario.').not.toBeNull()
    expect(
      Boolean(order & 4),
      'Il focus della prossima lezione deve precedere timeline e Planner nel DOM.',
    ).toBe(true)

    const classLabel = (await focus.locator('.todayTeachingClassBadge').innerText()).trim()
    const lessonTitle = (await focus.getByRole('heading', { level: 2 }).innerText()).trim()
    expect(classLabel, 'La card J1 deve rendere riconoscibile la classe.').not.toBe('')
    expect(lessonTitle, 'La card J1 deve rendere riconoscibile la lezione.').not.toBe('')

    const primary = focus.locator('a.todayTeachingPrimaryAction')
    await expect(primary, 'La card J1 deve avere una sola azione primaria.').toHaveCount(1)
    await expect(primary).toHaveText(/Prepara lezione/)
    await expect(primary).toHaveAttribute('href', /^\/classi\/[^/?#]+\/lezioni\/[^/?#]+\?mode=prepare$/)

    await screenshot(page, testInfo, 'today-teacher-first')

    const href = await primary.getAttribute('href')
    await primary.click()
    await expect(page).toHaveURL(new RegExp(`${escapeRegExp(href)}$`))
    await expect(page.getByText(/PRIMA DELLA LEZIONE/).first()).toBeVisible()
    await expect(page.getByRole('heading', { level: 1, name: lessonTitle, exact: true })).toBeVisible()
    await expect(page.getByText(classLabel, { exact: false }).first()).toBeVisible()

    const backToToday = page.locator('a[href="/planner"]:visible').first()
    await expect(backToToday, 'Dalla preparazione Oggi deve restare raggiungibile tramite la navigazione governata.').toBeVisible()
    await backToToday.click()
    await expect(page).toHaveURL(/\/planner$/)
    await expect(page.locator('.todayTeachingFocus')).toBeVisible()

    if (testInfo.project.name.startsWith('mobile')) {
      await page.setViewportSize({ width: 320, height: 800 })
      await page.goto('/planner')
      await expect(page.locator('.todayTeachingFocus')).toBeVisible()
      await expect(page.locator('.todayTeachingPrimaryAction')).toBeVisible()
      const geometry = await page.evaluate(() => ({
        innerWidth: window.innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }))
      expect(
        geometry.scrollWidth,
        `Oggi non deve produrre overflow orizzontale a 320px: ${geometry.scrollWidth}px su ${geometry.innerWidth}px.`,
      ).toBeLessThanOrEqual(geometry.innerWidth + 1)
      await screenshot(page, testInfo, 'today-teacher-first-320')
    }

    await recordJourney(testInfo.project.name, {
      status: 'PASS',
      note: `Oggi espone ${classLabel} · ${lessonTitle} e apre direttamente la preparazione canonica.`,
    })
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
    throw new Error('NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY sono richiesti dalla fixture J1 governata')
  }

  const href = await primary.getAttribute('href')
  const sectionMatch = href?.match(/^\/classi\/([^/?#]+)$/)
  if (!sectionMatch) {
    throw new Error(`J1 non può isolare la fixture: fallback inatteso ${href ?? 'senza href'}`)
  }
  const sectionId = sectionMatch[1]

  const { supabase } = await authenticatedAal2Supabase({
    supabaseUrl,
    supabasePublishableKey,
    label: 'J1 canonical fixture',
  })

  const { data: assignments, error: assignmentsError } = await supabase
    .from('teaching_assignments')
    .select('id,status,discipline_id,source_note')
    .eq('section_id', sectionId)
  if (assignmentsError) throw new Error(`J1 fixture assignment lookup failed: ${assignmentsError.message}`)

  const assignment = assignments?.find((item) => item.source_note === BOOKS_FIXTURE_NOTE)
  if (!assignment) {
    throw new Error('J1 fallback non appartiene alla Cattedra tecnica HVA nota: nessuna mutazione viene tentata')
  }

  const { data: discipline, error: disciplineError } = await supabase
    .from('teaching_disciplines')
    .select('id,workspace_id,academic_year_id,name,is_active')
    .eq('id', assignment.discipline_id)
    .single()
  if (disciplineError || !discipline) {
    throw new Error(`J1 fixture discipline lookup failed: ${disciplineError?.message ?? 'discipline missing'}`)
  }
  if (discipline.name !== BOOKS_FIXTURE_DISCIPLINE && discipline.name !== CANONICAL_DISCIPLINE) {
    throw new Error(`J1 refuses unexpected technical discipline: ${discipline.name}`)
  }

  const { data: canonicalConflicts, error: conflictError } = await supabase
    .from('teaching_disciplines')
    .select('id')
    .eq('workspace_id', discipline.workspace_id)
    .eq('academic_year_id', discipline.academic_year_id)
    .eq('name', CANONICAL_DISCIPLINE)
    .neq('id', discipline.id)
  if (conflictError) throw new Error(`J1 fixture canonical-discipline check failed: ${conflictError.message}`)
  if (canonicalConflicts?.length) {
    throw new Error('J1 fixture refuses to rename the technical discipline because a canonical Tecnologia already exists')
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
      if (error) throw new Error(`J1 fixture discipline promotion failed: ${error.message}`)
      disciplineChanged = true
    }

    if (assignment.status !== 'CONFIRMED') {
      const { error } = await supabase
        .from('teaching_assignments')
        .update({ status: 'CONFIRMED' })
        .eq('id', assignment.id)
      if (error) throw new Error(`J1 fixture assignment promotion failed: ${error.message}`)
      assignmentChanged = true
    }
  } catch (error) {
    await restoreJ1Fixture({
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
    restore: async () => restoreJ1Fixture({
      supabase,
      assignmentId: assignment.id,
      disciplineId: discipline.id,
      original,
      assignmentChanged,
      disciplineChanged,
    }),
  }
}

async function restoreJ1Fixture({
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
    if (error) throw new Error(`J1 fixture assignment restore failed: ${error.message}`)
  }

  if (disciplineChanged) {
    const { error } = await supabase
      .from('teaching_disciplines')
      .update({ name: original.disciplineName, is_active: original.disciplineActive })
      .eq('id', disciplineId)
    if (error) throw new Error(`J1 fixture discipline restore failed: ${error.message}`)
  }
}

async function screenshot(page, testInfo, name) {
  const dir = path.join(outputRoot, 'screenshots')
  await fs.mkdir(dir, { recursive: true })
  await page.screenshot({
    path: path.join(dir, `${safe(testInfo.project.name)}--journey-${safe(name)}.png`),
    fullPage: true,
  })
}

async function recordJourney(project, result) {
  const dir = path.join(outputRoot, 'journeys')
  await fs.mkdir(dir, { recursive: true })
  const payload = {
    schemaVersion: 1,
    id: 'today-teacher-first',
    label: 'Oggi → prossima lezione → preparazione',
    project,
    status: result.status,
    note: result.note,
    capturedAt: new Date().toISOString(),
  }
  await fs.writeFile(path.join(dir, `${safe(project)}--today-teacher-first.json`), `${JSON.stringify(payload, null, 2)}\n`)
}

function escapeRegExp(value) {
  return String(value ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function safe(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9_-]+/g, '-')
}
