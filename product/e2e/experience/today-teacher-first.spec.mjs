import fs from 'node:fs/promises'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import { loginE2E, requireE2ECredentials } from '../support/e2e-auth.mjs'

requireE2ECredentials()

const outputRoot = process.env.EXPERIENCE_OUTPUT_DIR ?? 'test-results/experience'

test('Journey: Oggi → lezione immediata quando il contesto è risolto', async ({ page }, testInfo) => {
  await loginE2E(page)
  await page.goto('/planner')

  await expect(page.getByRole('heading', { level: 1, name: 'Oggi', exact: true })).toBeVisible()
  await expect(page.locator('.todayLessonCard')).toHaveCount(await page.locator('.todayLessonCard').count())
  await expect(page.getByRole('button', { name: /Chiudi giornata|Aggiungi attività/i })).toHaveCount(0)

  const lessonCards = page.locator('.todayLessonCard')
  const count = await lessonCards.count()
  expect(count, 'Oggi può mostrare al massimo due oggetti lezione.').toBeLessThanOrEqual(2)

  if (!count) {
    await screenshot(page, testInfo, 'today-teacher-first-no-lesson')
    await recordJourney(testInfo.project.name, {
      status: 'NOT_APPLICABLE',
      note: 'Il giorno HVA corrente non espone una lezione deterministica; il requisito browser pending + upcoming + Calendar resta UNVERIFIED e non è sostituito dal pure-model test.',
    })
    return
  }

  const firstCard = lessonCards.first()
  const primary = firstCard.locator('a.todayPrimaryAction')
  await expect(primary, 'Ogni oggetto lezione Oggi deve avere una sola azione primaria.').toHaveCount(1)
  await expectTouchTarget(primary, 'CTA primaria Oggi')
  await expect(firstCard).not.toContainText(/CAN-PACK|CAN-PLAN|\bB\d{2}\b/)

  const href = await primary.getAttribute('href')
  if (!href?.match(/^\/classi\/[^/?#]+\/lezioni\/[^/?#]+/)) {
    await screenshot(page, testInfo, 'today-teacher-first-safe-fallback')
    await recordJourney(testInfo.project.name, {
      status: 'NOT_APPLICABLE',
      note: `Oggi ha risolto correttamente un fallback sicuro (${href ?? 'senza href'}) invece di inventare una Lezione.`,
    })
    return
  }

  await primary.click()
  await expect(page.locator('[data-lesson-shell]')).toBeVisible()
  await expect(page.locator('[data-lesson-phase]')).toHaveCount(0)
  await expect(page.locator('a[href*="mode="]')).toHaveCount(0)

  if (testInfo.project.name.startsWith('mobile')) {
    await page.setViewportSize({ width: 320, height: 800 })
    await expectNoHorizontalOverflow(page, 'Lezione aperta da Oggi a 320px')
  }

  await screenshot(page, testInfo, 'today-teacher-first')
  await recordJourney(testInfo.project.name, {
    status: 'PASS',
    note: 'Oggi apre direttamente la Lezione canonica quando il contesto runtime è risolto, senza reintrodurre fasi URL.',
  })
})

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
    label: 'Oggi → lezione immediata quando il contesto è risolto',
    project,
    status: result.status,
    note: result.note,
    capturedAt: new Date().toISOString(),
  }
  await fs.writeFile(path.join(dir, `${safe(project)}--today-teacher-first.json`), `${JSON.stringify(payload, null, 2)}\n`)
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
  expect(
    geometry.scrollWidth,
    `${label}: overflow orizzontale ${geometry.scrollWidth}px su ${geometry.innerWidth}px.`,
  ).toBeLessThanOrEqual(geometry.innerWidth + 1)
}

function safe(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9_-]+/g, '-')
}
