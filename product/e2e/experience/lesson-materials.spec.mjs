import fs from 'node:fs/promises'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import { loginE2E, requireE2ECredentials } from '../support/e2e-auth.mjs'

requireE2ECredentials()

const outputRoot = process.env.EXPERIENCE_OUTPUT_DIR ?? 'test-results/experience'

test('RV-1 / LP-3B — Materiali prossima lezione: RoleView operativa o fail-closed esplicito', async ({ page }, testInfo) => {
  await loginE2E(page)

  const response = await page.goto('/materiali/prossima')
  if (!response) throw new Error('No navigation response for /materiali/prossima')
  expect(response.status()).toBeLessThan(400)
  await expect(page.locator('h1').first()).toBeVisible({ timeout: 30_000 })

  const viewNav = page.getByRole('navigation', { name: 'Scegli la vista dei materiali' })
  const hasMaterialWorkspace = await viewNav.count()

  if (!hasMaterialWorkspace) {
    const blockedRoleView = page.locator('[data-roleview-status="blocked"]')
    if (await blockedRoleView.count()) {
      await expect(blockedRoleView).toBeVisible()
      await expect(blockedRoleView.getByRole('heading', { name: 'Preparazione della lezione bloccata' })).toBeVisible()
      await expect(blockedRoleView.getByRole('link', { name: 'Torna a Oggi' })).toBeVisible()
      await screenshot(page, testInfo, 'lesson-materials-roleview-blocked')
      return
    }

    await expect(
      page.getByRole('heading', { name: 'La preparazione non è disponibile con sufficiente certezza.' }),
      'Se la preparazione non è risolvibile, la superficie deve fallire chiusa in modo esplicito.',
    ).toBeVisible()
    await expect(page.getByRole('link', { name: 'Torna a Oggi' })).toBeVisible()
    await screenshot(page, testInfo, 'lesson-materials-fail-closed')
    return
  }

  const roleView = page.locator('[data-roleview-status]')
  await expect(roleView, 'La superficie materiali deve mostrare la RoleView docente derivata dal manifesto.').toBeVisible()
  await expect(roleView.getByText(/PREPARAZIONE · (PRONTA|DA COMPLETARE)/)).toBeVisible()
  await expect(roleView.getByRole('definition')).toHaveCount(4)
  await expect(roleView.getByRole('link').first()).toBeVisible()
  await screenshot(page, testInfo, 'lesson-materials-roleview')

  const lim = page.getByRole('button', { name: 'Proietta' })
  const student = page.getByRole('button', { name: 'Scheda studenti' })
  const teacher = page.getByRole('button', { name: 'Guida docente' })

  await expect(lim).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('group', { name: 'Controlli proiezione' })).toBeVisible()
  await screenshot(page, testInfo, 'lesson-materials-lim')

  await student.click()
  await expect(student).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('heading', { name: 'Scheda studenti', level: 2 }).first()).toBeVisible()
  await expect(page.getByRole('region', { name: 'Schede studenti stampabili' })).toBeVisible()
  await screenshot(page, testInfo, 'lesson-materials-student')

  await teacher.click()
  await expect(teacher).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('heading', { name: 'Guida docente', level: 2 }).first()).toBeVisible()
  await expect(page.getByRole('region', { name: 'Guida docente' })).toBeVisible()
  await screenshot(page, testInfo, 'lesson-materials-teacher')

  await lim.click()
  await expect(lim).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('group', { name: 'Controlli proiezione' })).toBeVisible()

  const next = page.getByRole('button', { name: 'Avanti' })
  if (await next.isEnabled()) {
    await next.click()
    await expect(page.locator('[aria-live="polite"]')).toBeVisible()
    await page.keyboard.press('ArrowLeft')
    await expect(page.locator('[aria-live="polite"]')).toBeVisible()
  }
})

test('LP-4 — Oggi, Home e Classe espongono lo stesso accesso contestuale ai materiali', async ({ page }, testInfo) => {
  await loginE2E(page)

  let response = await page.goto('/classi')
  if (!response) throw new Error('No navigation response for /classi')
  expect(response.status()).toBeLessThan(400)

  const classCard = page.locator('a.canonicalClassCard').first()
  await expect(classCard, 'La journey LP-4 richiede almeno una classe canonica nel workspace HVA.').toBeVisible({ timeout: 30_000 })
  const classHref = await classCard.getAttribute('href')
  if (!classHref?.startsWith('/classi/')) throw new Error('Canonical class href unavailable for LP-4 HVA')
  const sectionId = decodeURIComponent(classHref.slice('/classi/'.length))

  await page.route('**/api/assistant/today-context', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(todayContextFixture(sectionId)),
    })
  })

  response = await page.goto('/planner')
  if (!response) throw new Error('No navigation response for /planner')
  expect(response.status()).toBeLessThan(400)
  await expect(page.getByRole('heading', { name: 'Oggi', level: 1 })).toBeVisible({ timeout: 30_000 })
  let entrypoint = page.getByTestId('lesson-materials-entrypoint')
  await expect(entrypoint).toBeVisible({ timeout: 30_000 })
  await expect(entrypoint.getByRole('link', { name: 'Apri materiali' })).toHaveAttribute('href', '/materiali/prossima')
  await screenshot(page, testInfo, 'lesson-materials-entrypoint-today')

  response = await page.goto('/')
  if (!response) throw new Error('No navigation response for /')
  expect(response.status()).toBeLessThan(400)
  await expect(page.getByRole('heading', { name: 'Adesso e dopo', level: 1 })).toBeVisible({ timeout: 30_000 })
  entrypoint = page.getByTestId('lesson-materials-entrypoint')
  await expect(entrypoint).toBeVisible({ timeout: 30_000 })
  await expect(entrypoint.getByRole('link', { name: 'Apri materiali' })).toHaveAttribute('href', '/materiali/prossima')
  await screenshot(page, testInfo, 'lesson-materials-entrypoint-home')

  response = await page.goto(classHref)
  if (!response) throw new Error('No navigation response for authoritative class')
  expect(response.status()).toBeLessThan(400)
  entrypoint = page.getByTestId('lesson-materials-entrypoint')
  await expect(entrypoint).toBeVisible({ timeout: 30_000 })
  await expect(entrypoint.getByRole('link', { name: 'Apri materiali' })).toHaveAttribute('href', '/materiali/prossima')
  await screenshot(page, testInfo, 'lesson-materials-entrypoint-class')

  response = await page.goto('/classi')
  if (!response) throw new Error('No navigation response for /classi')
  expect(response.status()).toBeLessThan(400)
  await expect(page.getByTestId('lesson-materials-entrypoint')).toHaveCount(0)
})

function todayContextFixture(sectionId) {
  const localDate = '2026-09-15'
  const lesson = {
    logicalId: 'hva-lp4-next-lesson',
    localDate,
    startAt: `${localDate}T15:00:00`,
    endAt: `${localDate}T16:00:00`,
    title: 'Classe HVA · Tecnologia',
    sectionId,
    disciplineId: 'technology',
    timetableVersionId: 'hva-timetable',
    timetableSlotId: 'hva-slot',
    authority: 'IN_FORCE',
    recorded: false,
  }

  return {
    surface: 'TODAY',
    workspaceId: 'hva-workspace',
    academicYearId: 'hva-year',
    object: { type: 'TEACHER_DAY', id: localDate, title: 'Giornata HVA LP-4', state: 'IN_FORCE' },
    provenance: [{ kind: 'TIMETABLE_IN_FORCE', ref: 'today:hva', label: 'Orario in vigore' }],
    availableCapabilities: ['TODAY_READ', 'NEXT_LESSON_PREPARATION'],
    forbiddenCapabilities: [],
    missingInformation: [],
    today: {
      localDate,
      authority: 'IN_FORCE',
      calendarState: 'SCHOOL_DAY',
      calendarLabel: null,
      timetableState: 'IN_FORCE',
      lessons: [lesson],
      lessonCount: 1,
      pendingRegistrationCount: 0,
      primary: { kind: 'UPCOMING_LESSON', lesson, minutesUntilStart: 30 },
    },
    planner: {
      localDate,
      activeCount: 0,
      openCount: 0,
      waitingCount: 0,
      overdueCount: 0,
      todayCount: 0,
      urgentCount: 0,
      highCount: 0,
      undatedCount: 0,
      tasks: [],
    },
    nextLessonPreparation: {
      lesson: {
        logicalId: lesson.logicalId,
        startAt: lesson.startAt,
        endAt: lesson.endAt,
        title: lesson.title,
        sectionId,
        disciplineId: lesson.disciplineId,
        authority: 'IN_FORCE',
      },
      canonicalLesson: {
        sectionLabel: 'Classe HVA',
        blockId: 'B03',
        title: 'Misurare con precisione',
        objective: 'Misurare e rappresentare con una procedura controllabile.',
        durationMinutes: 60,
        udaTitle: 'Misurare e rappresentare',
        progressStatus: 'PIANIFICATO',
        preparationPreview: [],
        remainingPreparationCount: 0,
        readyTitles: ['Scheda studente'],
        readyCount: 1,
        statusLabel: 'ENRICHED',
      },
      knowledgeResources: [],
      missingInformation: [],
      provenance: [{ kind: 'TIMETABLE_IN_FORCE', ref: 'today:hva', label: 'Orario in vigore' }],
    },
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

function safe(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9_-]+/g, '-')
}
