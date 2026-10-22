import { expect, test } from '@playwright/test'
import { loginE2E, requireE2ECredentials } from '../support/e2e-auth.mjs'
import { screenshotPath } from '../support/experience-observer.mjs'

requireE2ECredentials()

test('DOS-IA-RESET: root converge su Oggi e Oggi resta una superficie sparsa', async ({ page }, testInfo) => {
  await loginE2E(page)
  await page.goto('/')
  await expect(page).toHaveURL(/\/planner(?:[?#]|$)/)
  await expect(page.getByRole('heading', { level: 1, name: 'Oggi' })).toBeVisible()

  const lessonCards = page.locator('.todayLessonCard')
  expect(await lessonCards.count(), 'Oggi non deve trasformarsi in una bacheca di attività').toBeLessThanOrEqual(2)
  for (let index = 0; index < await lessonCards.count(); index += 1) {
    await expect(lessonCards.nth(index).locator('a.todayPrimaryAction')).toHaveCount(1)
  }

  await expect(page.getByRole('button', { name: /Chiudi giornata|Aggiungi attività/i })).toHaveCount(0)
  const commitments = page.locator('.todayCalendarCommitments')
  if (await commitments.count()) {
    await expect(commitments.getByRole('heading', { level: 2, name: 'Impegni' })).toBeVisible()
    const links = commitments.locator('a')
    for (let index = 0; index < await links.count(); index += 1) {
      expect(await links.nth(index).getAttribute('href')).toMatch(/^\/calendario(?:[?#]|$)/)
    }
  }

  await page.screenshot({
    path: await screenshotPath(testInfo.project.name, 'dos-ia-reset-oggi-sparse'),
    fullPage: true,
  })
})

test('DOS-IA-RESET: Orario separa consultazione diretta della Lezione e modifica della griglia', async ({ page }, testInfo) => {
  await loginE2E(page)
  await page.goto('/orario')
  await expect(page.getByRole('heading', { level: 1, name: 'Il tuo orario' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Settimana', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Giorno', exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Giorno', exact: true }).click()
  await expect(page.locator('.dayNavigator')).toBeVisible()
  await page.getByRole('button', { name: 'Settimana', exact: true }).click()
  await expect(page.locator('.dayNavigator')).toHaveCount(0)

  const lessonHref = await openResolvedLessonFromReadOnlyGrid(page)
  expect(lessonHref).toMatch(/^\/classi\/[^/?#]+\/lezioni\/[^/?#]+/)
  await page.locator('.timetableContextSheet').getByRole('button', { name: 'Chiudi' }).click()

  await page.goto('/orario/aggiorna?fase=modifica')
  await expect(page.getByRole('heading', { level: 1, name: 'Modifica orario' })).toBeVisible()
  await ensureWeekViewWhenCurrentDayHasNoLessons(page)
  const editableLesson = page.locator('.occupiedTimetableCell.kind-lesson').first()
  await expect(editableLesson).toBeVisible()
  await editableLesson.click()
  await expect(page.locator('.timetableEditorForm')).toBeVisible()
  await expect(page.locator('.timetableEditor').getByRole('link', { name: 'Apri lezione' })).toHaveCount(0)

  await page.screenshot({
    path: await screenshotPath(testInfo.project.name, 'dos-ia-reset-orario-edit-separation'),
    fullPage: true,
  })
})

test('DOS-IA-RESET: Classi è selettore e Classe mantiene continuità, Diario e un solo Altro della classe', async ({ page }, testInfo) => {
  await loginE2E(page)
  await page.goto('/classi')
  await expect(page.getByRole('heading', { level: 1, name: 'Scegli una classe' })).toBeVisible()

  const classCards = page.locator('a.canonicalClassCard')
  expect(await classCards.count(), 'La prova HVA richiede almeno una classe governata').toBeGreaterThan(0)
  await classCards.first().click()

  await expect(page.locator('[data-testid="class-continuity-primary"]')).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: 'Ultimo lavoro' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: 'Prossima attività' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: 'Avanzamento' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: 'Contesto recente' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Apri Diario', exact: true })).toBeVisible()
  await expect(page.locator('details#altro-della-classe > summary')).toHaveText('Altro della classe')
  await expect(page.locator('details#altro-della-classe')).toHaveCount(1)

  await page.screenshot({
    path: await screenshotPath(testInfo.project.name, 'dos-ia-reset-classe-continuity'),
    fullPage: true,
  })
})

test('DOS-IA-RESET: Lezione usa una sola shell, emette subtask canonici e accetta mode solo in ingresso', async ({ page }) => {
  await loginE2E(page)
  await page.goto('/orario')
  const lessonHref = await openResolvedLessonFromReadOnlyGrid(page)
  await page.goto(lessonHref)

  const shell = page.locator('[data-lesson-shell]')
  await expect(shell).toBeVisible()
  await expect(page.locator('[data-lesson-phase]')).toHaveCount(0)
  await expect(page.locator('a[href*="mode="]')).toHaveCount(0)

  const legacyUrl = new URL(lessonHref, 'http://docente-os.local')
  legacyUrl.searchParams.set('mode', 'prepare')
  await page.goto(`${legacyUrl.pathname}${legacyUrl.search}`)
  await expect(page.locator('[data-lesson-shell]')).toBeVisible()
  await expect(page.locator('[data-lesson-phase]')).toHaveCount(0)

  const materials = page.getByRole('link', { name: 'Materiali', exact: true })
  if (await materials.count()) {
    await materials.first().click()
    await expect(page).toHaveURL(/subtask=materials/)
    expect(page.url()).not.toMatch(/[?&]mode=/)
    await expect(page.locator('[data-lesson-subtask="materials"]')).toBeVisible()
  }
})

test('DOS-IA-RESET: Altro → Materiali e fonti → Materiali di domani usa la casa stabile', async ({ page }) => {
  await loginE2E(page)
  await page.goto('/altro')
  await page.getByRole('link', { name: /Materiali e fonti/ }).click()
  await expect(page).toHaveURL(/\/knowledge(?:[?#]|$)/)

  await page.goto('/knowledge?focus=domani')
  await expect(page.getByText('MATERIALI DI DOMANI', { exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: /Materiali e fonti/ })).toBeVisible()

  await page.goto('/materiali/domani')
  await expect(page.getByText('MATERIALI DI DOMANI', { exact: true })).toBeVisible()
  await page.goto('/materiali/prossima')
  await expect(page.locator('#dos-main-content')).toBeVisible()
})

test('DOS-IA-RESET responsive 320×800: gerarchia e touch target restano utilizzabili', async ({ page }) => {
  await loginE2E(page)
  await page.setViewportSize({ width: 320, height: 800 })
  await page.goto('/planner')
  await expectNoHorizontalOverflow(page, 'Oggi 320×800')
  await assertMobilePrimaryTargets(page)
  await expect(page.locator('#dos-main-content')).not.toContainText(/CAN-PACK|CAN-PLAN|[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i)
})

test('DOS-IA-RESET responsive 390×844: Classe mantiene Diario e Altro senza overflow', async ({ page }) => {
  await loginE2E(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/classi')
  const classCards = page.locator('a.canonicalClassCard')
  expect(await classCards.count(), 'La prova responsive richiede almeno una classe governata').toBeGreaterThan(0)
  await classCards.first().click()
  await expectNoHorizontalOverflow(page, 'Classe 390×844')
  await assertMobilePrimaryTargets(page)
  await expectTouchTarget(page.getByRole('link', { name: 'Apri Diario', exact: true }), 'Apri Diario 390×844')
  await expectTouchTarget(page.locator('details#altro-della-classe > summary'), 'Altro della classe 390×844')
})

async function openResolvedLessonFromReadOnlyGrid(page) {
  await ensureWeekViewWhenCurrentDayHasNoLessons(page)
  const cells = page.locator('.occupiedTimetableCell.kind-lesson')
  const count = await cells.count()
  expect(count, 'L’Orario HVA deve contenere almeno una lezione').toBeGreaterThan(0)

  for (let index = 0; index < count; index += 1) {
    await cells.nth(index).click()
    const sheet = page.locator('.timetableContextSheet')
    await expect(sheet).toBeVisible()
    const lessonLink = sheet.getByRole('link', { name: 'Apri lezione', exact: true })
    if (await lessonLink.count()) {
      const href = await lessonLink.getAttribute('href')
      expect(href, 'Apri lezione deve avere una route canonica').not.toBeNull()
      return href
    }
    await sheet.getByRole('button', { name: 'Chiudi' }).click()
  }
  throw new Error('Nessuna voce dell’Orario HVA risolve una Lezione canonica senza ambiguità')
}

async function ensureWeekViewWhenCurrentDayHasNoLessons(page) {
  const lessons = page.locator('.occupiedTimetableCell.kind-lesson')
  if (await lessons.count()) return

  const weekView = page.getByRole('button', { name: 'Settimana', exact: true })
  if (await weekView.count()) {
    await weekView.click()
    await expect(weekView).toHaveClass(/active/)
  }
}

async function assertMobilePrimaryTargets(page) {
  const primary = page.locator('.dosBottomNav')
  await expect(primary).toBeVisible()
  expect(await primary.locator('small').allTextContents()).toEqual(['Oggi', 'Orario', 'Classi', 'Altro'])
  const links = primary.locator('a')
  for (let index = 0; index < await links.count(); index += 1) {
    await expectTouchTarget(links.nth(index), `Navigazione mobile ${index + 1}`)
  }
}

async function expectTouchTarget(locator, label) {
  const box = await locator.boundingBox()
  expect(box, `${label}: target non misurabile`).not.toBeNull()
  expect(box.height, `${label}: altezza target sotto 44px`).toBeGreaterThanOrEqual(44)
  expect(box.width, `${label}: larghezza target sotto 44px`).toBeGreaterThanOrEqual(44)
}

async function expectNoHorizontalOverflow(page, label) {
  const geometry = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))
  expect(geometry.scrollWidth, `${label}: overflow ${geometry.scrollWidth}px su ${geometry.innerWidth}px`).toBeLessThanOrEqual(geometry.innerWidth + 1)
}
