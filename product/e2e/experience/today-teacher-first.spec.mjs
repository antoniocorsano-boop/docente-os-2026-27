import fs from 'node:fs/promises'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import { loginE2E, requireE2ECredentials } from '../support/e2e-auth.mjs'
import { assertHvaTodayCoexistenceRuntime } from '../support/hva-today-coexistence-fixture.mjs'

requireE2ECredentials()
test.skip(process.env.EXPERIENCE_TARGET !== 'local', 'HVA-GOV-01 Today is qualified only by the controlled local application-acceptance clock.')

const outputRoot = process.env.EXPERIENCE_OUTPUT_DIR ?? 'test-results/experience'

test('Journey: Oggi qualifica registrazione pendente + prossima lezione + impegno Calendario', async ({ page }, testInfo) => {
  await loginE2E(page)

  try {
    await assertHvaTodayCoexistenceRuntime()
  } catch (error) {
    if (isUnverifiedJourney(error)) {
      await recordJourney(testInfo.project.name, {
        status: 'UNVERIFIED',
        note: String(error instanceof Error ? error.message : error),
      })
    }
    throw error
  }

  await page.goto('/planner')

  await expect(page.getByRole('heading', { level: 1, name: 'Oggi', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: /Chiudi giornata|Aggiungi attività/i })).toHaveCount(0)

  const lessonCards = page.locator('.todayLessonCard')
  await expect(lessonCards, 'Task 9 richiede browser evidence deterministica con una registrazione pendente e una prossima lezione.').toHaveCount(2)

  const pendingCard = lessonCards.filter({ hasText: 'LEZIONE DA REGISTRARE' })
  const upcomingCard = lessonCards.filter({ hasText: 'PROSSIMA LEZIONE' })
  await expect(pendingCard, 'Oggi deve rendere visibile la lezione conclusa ancora da registrare.').toHaveCount(1)
  await expect(upcomingCard, 'Oggi deve rendere visibile la prossima lezione della giornata.').toHaveCount(1)

  const commitments = page.locator('.todayCalendarCommitments')
  await expect(commitments, 'Task 9 richiede nello stesso stato browser almeno un impegno Calendario compatto.').toBeVisible()
  await expect(commitments.getByRole('heading', { level: 2, name: 'Impegni' })).toBeVisible()
  const commitmentLinks = commitments.locator('a.todayCommitment')
  expect(await commitmentLinks.count(), 'Oggi deve mostrare almeno un impegno Calendario reale.').toBeGreaterThan(0)
  for (let index = 0; index < await commitmentLinks.count(); index += 1) {
    expect(await commitmentLinks.nth(index).getAttribute('href')).toMatch(/^\/calendario(?:[?#]|$)/)
  }

  const primary = upcomingCard.locator('a.todayPrimaryAction')
  await expect(primary, 'La prossima lezione deve avere una sola azione primaria.').toHaveCount(1)
  await expectTouchTarget(primary, 'CTA prossima lezione Oggi')
  await expect(upcomingCard).not.toContainText(/CAN-PACK|CAN-PLAN|\bB\d{2}\b/)
  const href = await primary.getAttribute('href')
  expect(href, 'La prossima lezione HVA deve risolvere una route Lezione canonica.').toMatch(/^\/classi\/[^/?#]+\/lezioni\/[^/?#]+/)

  await screenshot(page, testInfo, 'today-teacher-first-coexistence')
  await primary.click()
  await expect(page.locator('[data-lesson-shell]')).toBeVisible()
  await expect(page.locator('[data-lesson-phase]')).toHaveCount(0)
  await expect(page.locator('a[href*="mode="]')).toHaveCount(0)

  if (testInfo.project.name.startsWith('mobile')) {
    await page.setViewportSize({ width: 320, height: 800 })
    await expectNoHorizontalOverflow(page, 'Lezione aperta da Oggi a 320px')
  }

  await screenshot(page, testInfo, 'today-teacher-first-lesson')
  await recordJourney(testInfo.project.name, {
    status: 'PASS',
    note: 'Oggi rende insieme registrazione pendente, prossima lezione e impegno Calendario e apre la Lezione canonica senza reintrodurre fasi URL.',
  })
})

async function screenshot(page, testInfo, name) {
  const dir = path.join(outputRoot, 'screenshots')
  await fs.mkdir(dir, { recursive: true })
  await page.screenshot({ path: path.join(dir, `${safe(testInfo.project.name)}--journey-${safe(name)}.png`), fullPage: true })
}
async function recordJourney(project, result) {
  const dir = path.join(outputRoot, 'journeys')
  await fs.mkdir(dir, { recursive: true })
  const payload = { schemaVersion: 1, id: 'today-teacher-first', label: 'Oggi → registrazione pendente + prossima lezione + impegno Calendario', project, status: result.status, note: result.note, capturedAt: new Date().toISOString() }
  await fs.writeFile(path.join(dir, `${safe(project)}--today-teacher-first.json`), `${JSON.stringify(payload, null, 2)}\n`)
}
function isUnverifiedJourney(error) { return String(error instanceof Error ? error.message : error).includes('HVA-JOURNEY-UNVERIFIED') }
async function expectTouchTarget(locator, label) { const box = await locator.boundingBox(); expect(box, `${label}: target non misurabile`).not.toBeNull(); expect(box.height, `${label}: altezza target sotto 44px`).toBeGreaterThanOrEqual(44); expect(box.width, `${label}: larghezza target sotto 44px`).toBeGreaterThanOrEqual(44) }
async function expectNoHorizontalOverflow(page, label) { const geometry = await page.evaluate(() => ({ innerWidth: window.innerWidth, scrollWidth: document.documentElement.scrollWidth })); expect(geometry.scrollWidth, `${label}: overflow orizzontale ${geometry.scrollWidth}px su ${geometry.innerWidth}px.`).toBeLessThanOrEqual(geometry.innerWidth + 1) }
function safe(value) { return String(value).toLowerCase().replace(/[^a-z0-9_-]+/g, '-') }
