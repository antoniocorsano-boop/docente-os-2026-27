import fs from 'node:fs/promises'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import { loginE2E, requireE2ECredentials } from '../support/e2e-auth.mjs'

requireE2ECredentials()

const outputRoot = process.env.EXPERIENCE_OUTPUT_DIR ?? 'test-results/experience'

test('Journey: Oggi → prossima lezione → preparazione', async ({ page }, testInfo) => {
  await loginE2E(page)
  await page.goto('/planner')

  await expect(page.getByRole('heading', { level: 1, name: 'Oggi', exact: true })).toBeVisible()

  const focus = page.locator('.todayTeachingFocus')
  await expect(
    focus,
    'La fixture HVA deve esporre una lezione corrente/prossima deterministica: J1 non può essere NOT_APPLICABLE.',
  ).toBeVisible()

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
