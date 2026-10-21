import { expect, test } from '@playwright/test'
import { loginE2E, requireE2ECredentials } from '../support/e2e-auth.mjs'
import { screenshotPath } from '../support/experience-observer.mjs'

requireE2ECredentials()

const TECHNICAL_ID = /CAN-(?:PACK|PLAN)|\bB\d{2}\b|[0-9a-f]{8}-[0-9a-f-]{27,}/i

test('DOS-IA-RESET: root converge su Oggi e Oggi resta sparso', async ({ page }, testInfo) => {
  await loginE2E(page)
  await page.goto('/')
  await expect(page).toHaveURL(/\/planner(?:\?|$)/)
  await expect(page.getByRole('heading', { level: 1, name: 'Oggi' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Calendario', exact: true }).first()).toHaveAttribute('href', '/calendario')

  await expect(page.getByText('Chiudi giornata', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Planner', { exact: true })).toHaveCount(0)
  await expect(page.locator('form[action*="planner"], .plannerQuickActions, .plannerTaskBoard')).toHaveCount(0)

  const lessonActions = page.locator('a.todayPrimaryAction')
  for (let index = 0; index < await lessonActions.count(); index += 1) {
    const href = await lessonActions.nth(index).getAttribute('href')
    expect(href).toMatch(/^\/(?:classi(?:\/[^/?#]+(?:\/lezioni\/[^/?#]+)?)?|orario)(?:\?|$)/)
    expect(href).not.toMatch(/[?&]mode=(?:prepare|teach|observe|record)/)
  }

  const firstLevel = await page.locator('#dos-main-content').innerText()
  expect(firstLevel).not.toMatch(TECHNICAL_ID)
  await page.screenshot({ path: await screenshotPath(testInfo.project.name, 'dos-ia-reset-oggi'), fullPage: true })
})

test('DOS-IA-RESET: Orario conserva Giorno/Settimana e separa consultazione da modifica', async ({ page }, testInfo) => {
  await loginE2E(page)
  await page.goto('/orario')
  await expect(page.getByRole('heading', { level: 1, name: 'Il tuo orario' })).toBeVisible()

  const week = page.getByRole('button', { name: 'Settimana', exact: true })
  const day = page.getByRole('button', { name: 'Giorno', exact: true })
  await expect(week).toBeVisible()
  await expect(day).toBeVisible()
  await week.click()
  await expect(week).toHaveClass(/active/)
  await day.click()
  await expect(day).toHaveClass(/active/)

  await week.click()
  const lesson = page.locator('button.occupiedTimetableCell.kind-lesson').first()
  if (await lesson.count()) {
    await lesson.click()
    const primary = page.locator('.timetableContextActions a.contextPrimaryAction').first()
    await expect(primary).toBeVisible()
    const href = await primary.getAttribute('href')
    expect(href).toMatch(/^\/classi\//)
    expect(href).not.toMatch(/[?&]mode=(?:prepare|teach|observe|record)/)
  }

  await page.goto('/orario/aggiorna')
  await expect(page.getByRole('heading', { level: 1, name: 'Modifica orario' })).toBeVisible()
  await expect(page.locator('.timetable-update')).toBeVisible()
  await page.screenshot({ path: await screenshotPath(testInfo.project.name, 'dos-ia-reset-orario'), fullPage: true })
})

test('DOS-IA-RESET: Classi conduce a Classe con Diario e Altro della classe', async ({ page }, testInfo) => {
  await loginE2E(page)
  await page.goto('/classi')
  const firstClass = page.locator('a.canonicalClassCard').first()
  await expect(firstClass).toBeVisible()
  await firstClass.click()
  await expect(page).toHaveURL(/\/classi\/[^/?#]+(?:\?|$)/)
  await expect(page.locator('h1').first()).toBeVisible()

  const diary = page.getByRole('link', { name: 'Apri Diario', exact: true })
  await expect(diary).toBeVisible()
  await expect(diary).toHaveAttribute('href', /\/classi\/[^/?#]+\/diario$/)
  await expect(page.locator('details#altro-della-classe > summary')).toHaveText('Altro della classe')

  const lessonLink = page.locator('a[href*="/lezioni/"]').first()
  if (await lessonLink.count()) {
    const canonicalHref = await lessonLink.getAttribute('href')
    expect(canonicalHref).not.toMatch(/[?&]mode=/)
    await lessonLink.click()
    await expect(page.locator('[data-lesson-shell]')).toBeVisible()
    await expect(page.getByRole('navigation', { name: /Fasi della lezione/i })).toHaveCount(0)

    const observation = page.getByRole('link', { name: /Osserv/i }).or(page.getByRole('button', { name: /Osserv/i })).first()
    const materials = page.getByRole('link', { name: 'Materiali', exact: true }).or(page.getByRole('button', { name: 'Materiali', exact: true })).first()
    if (await observation.count()) await expect(observation).toBeVisible()
    if (await materials.count()) await expect(materials).toBeVisible()
  }

  await page.screenshot({ path: await screenshotPath(testInfo.project.name, 'dos-ia-reset-classe'), fullPage: true })
})

test('DOS-IA-RESET: Altro ospita Materiali e fonti e le route legacy restano sicure', async ({ page }) => {
  await loginE2E(page)
  await page.goto('/altro')
  const materialsHome = page.getByRole('link', { name: /Materiali e fonti/ }).first()
  await expect(materialsHome).toHaveAttribute('href', '/knowledge')
  await materialsHome.click()
  await expect(page).toHaveURL(/\/knowledge(?:\?|$)/)

  await page.goto('/knowledge?focus=domani')
  await expect(page.getByText('MATERIALI DI DOMANI', { exact: true })).toBeVisible()

  for (const legacyPath of ['/materiali/domani', '/materiali/prossima']) {
    await page.goto(legacyPath)
    await expect(page.locator('#dos-main-content')).toBeVisible()
    await expect(page).not.toHaveURL(/\/login(?:\?|$)/)
  }
})

test('DOS-IA-RESET: legacy mode resta input compatibile ma la nuova Lezione non emette fasi URL', async ({ page }) => {
  await loginE2E(page)
  await page.goto('/classi')
  const firstClass = page.locator('a.canonicalClassCard').first()
  await expect(firstClass).toBeVisible()
  await firstClass.click()
  const lessonLink = page.locator('a[href*="/lezioni/"]').first()
  if (!(await lessonLink.count())) return

  const href = await lessonLink.getAttribute('href')
  if (!href) return
  const legacyHref = `${href}${href.includes('?') ? '&' : '?'}mode=prepare`
  await page.goto(legacyHref)
  await expect(page.locator('[data-lesson-shell]')).toBeVisible()
  await expect(page.getByRole('navigation', { name: /Fasi della lezione/i })).toHaveCount(0)
  await expect(page.locator('a[href*="mode="]')).toHaveCount(0)
})

for (const viewport of [
  { width: 320, height: 800 },
  { width: 390, height: 844 },
]) {
  test(`DOS-IA-RESET: gerarchia responsive ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await loginE2E(page)
    await page.goto('/planner')
    await expect(page.locator('#dos-main-content')).toBeVisible()

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(1)

    const primary = page.locator('.dosBottomNav a')
    await expect(primary).toHaveCount(4)
    const labels = await primary.locator('small').allTextContents()
    expect(labels).toEqual(['Oggi', 'Orario', 'Classi', 'Altro'])
    for (let index = 0; index < await primary.count(); index += 1) {
      const box = await primary.nth(index).boundingBox()
      expect(box, `touch target ${index + 1} non misurabile`).not.toBeNull()
      expect(box.width).toBeGreaterThanOrEqual(44)
      expect(box.height).toBeGreaterThanOrEqual(44)
    }

    const firstLevel = await page.locator('#dos-main-content').innerText()
    expect(firstLevel).not.toMatch(TECHNICAL_ID)
  })
}
