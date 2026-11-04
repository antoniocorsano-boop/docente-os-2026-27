import fs from 'node:fs/promises'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { expect, test } from '@playwright/test'
import { loginE2E, requireE2ECredentials } from '../support/e2e-auth.mjs'

requireE2ECredentials()

// UX-R1B visual evidence. Read-only: uses the governed authenticated HVA
// workspace without creating, changing or deleting any classes or assets.
// The no-classes state requires a separate isolated fixture: this test does
// not pretend to exercise it when the governed HVA workspace has classes.
const outputRoot = process.env.EXPERIENCE_OUTPUT_DIR ?? 'test-results/experience'
const mobileSizes = [
  { width: 320, height: 915 },
  { width: 390, height: 844 },
  { width: 412, height: 915 },
]

test('UX-R1B: Progetta mostra la classe nella prima area utilizzabile, non il catalogo', async ({ page }, testInfo) => {
  await loginE2E(page)
  await page.goto('/classi')
  const expectedClassCount = await page.locator('a.canonicalClassCard').count()
  expect(expectedClassCount, 'La fixture HVA deve contenere classi per verificare la scelta contestuale.').toBeGreaterThan(0)

  await page.goto('/progetta')
  await expect(page.locator('.progettaEntryHeader h1')).toHaveText('Scegli una classe')
  await expect(page.locator('.progettaEntryClass')).toHaveCount(expectedClassCount)
  await expect(page.locator('.progettaGroups')).toHaveCount(0)
  await expect(page.locator('.progettaEntryExplore a[href="/progetta?view=catalog"]')).toBeVisible()

  const sizes = testInfo.project.name.startsWith('mobile')
    ? mobileSizes
    : [{ width: 1440, height: 1000 }]
  const results = []

  for (const size of sizes) {
    await page.setViewportSize(size)
    await page.waitForTimeout(150)
    const geometry = await page.evaluate(() => {
      const header = document.querySelector('.progettaEntryHeader')
      const firstClass = document.querySelector('a.progettaEntryClass')
      const bottomNavigation = document.querySelector('.dosBottomNav')
      if (!header || !firstClass) return null

      const headerRect = header.getBoundingClientRect()
      const classRect = firstClass.getBoundingClientRect()
      const navRect = bottomNavigation?.getBoundingClientRect()
      const navVisible = navRect && navRect.height > 0 && getComputedStyle(bottomNavigation).display !== 'none'
      const usableBottom = navVisible ? Math.min(window.innerHeight, navRect.top) : window.innerHeight
      return {
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        documentWidth: document.documentElement.scrollWidth,
        documentHeight: document.documentElement.scrollHeight,
        headerTop: headerRect.top,
        headerBottom: headerRect.bottom,
        firstClassTop: classRect.top,
        firstClassBottom: classRect.bottom,
        firstClassWidth: classRect.width,
        firstClassHeight: classRect.height,
        usableBottom,
        bottomNavigationVisible: Boolean(navVisible),
      }
    })

    expect(geometry, 'Intestazione e prima classe devono essere misurabili.').not.toBeNull()
    expect(geometry.viewportWidth, 'Larghezza CSS effettiva diversa dalla configurazione del collaudo.').toBe(size.width)
    expect(geometry.documentWidth, 'La pagina iniziale non deve eccedere la larghezza dello schermo.').toBeLessThanOrEqual(size.width + 1)
    expect(geometry.headerTop, 'Il titolo non deve risultare nascosto sopra lo schermo.').toBeGreaterThanOrEqual(0)
    expect(geometry.firstClassTop, 'La prima classe deve trovarsi nell’area iniziale.').toBeGreaterThanOrEqual(0)
    expect(geometry.firstClassHeight, 'La classe deve essere un obiettivo tattile utile.').toBeGreaterThanOrEqual(44)
    expect(geometry.firstClassBottom,
      'La prima classe deve essere interamente visibile sopra la navigazione inferiore, senza scorrere.',
    ).toBeLessThanOrEqual(geometry.usableBottom - 4)

    const name = testInfo.project.name + '--progetta-entry-' + size.width + 'x' + size.height
    const screenshotDir = path.join(outputRoot, 'screenshots')
    await fs.mkdir(screenshotDir, { recursive: true })
    await page.screenshot({ path: path.join(screenshotDir, name + '--viewport.png'), fullPage: false })
    await page.screenshot({ path: path.join(screenshotDir, name + '--full.png'), fullPage: true })
    results.push({ width: size.width, height: size.height, ...geometry, result: 'PASS' })
  }

  const firstHref = await page.locator('.progettaEntryClass').first().getAttribute('href')
  expect(firstHref).toMatch(/^\/classi\/[^/?#]+$/)
  await page.locator('.progettaEntryClass').first().click()
  await expect(page).toHaveURL(new RegExp(firstHref.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'))
  await expect(page.locator('#dos-main-content h1')).toBeVisible()
  await writeEvidence(testInfo, 'entry-visible', { expectedClassCount, results, firstHref, state: 'classes-present' })
})

test('UX-R1B: collegamenti invalidi recuperano la scelta classe senza aprire UDA estranee', async ({ page }, testInfo) => {
  await loginE2E(page)

  await page.goto('/progetta?grade=quarta')
  await expect(page).toHaveURL(/\/progetta\?notice=path-not-available/)
  await expect(page.locator('.progettaEntryHeader h1')).toHaveText('Scegli una classe')
  await expect(page.locator('.progettaEntryNotice[role="status"]')).toContainText('percorso richiesto non è disponibile')
  await expect(page.locator('.progettaGroups')).toHaveCount(0)
  await screenshot(page, testInfo, 'invalid-focus')

  await page.goto('/progetta?section=invalid-section-id')
  await expect(page).toHaveURL(/\/progetta\?notice=class-not-available/)
  await expect(page.locator('.progettaEntryNotice[role="status"]')).toContainText('classe richiesta non è disponibile')
  await expect(page.locator('.progettaEntryExplore a[href="/progetta?view=catalog"]')).toBeVisible()
  await screenshot(page, testInfo, 'invalid-section')

  await writeEvidence(testInfo, 'invalid-context', {
    cases: ['invalid-grade -> path-not-available', 'foreign-or-unknown-section -> class-not-available'],
    state: 'safe-recovery',
  })
})

async function screenshot(page, testInfo, name) {
  const dir = path.join(outputRoot, 'screenshots')
  await fs.mkdir(dir, { recursive: true })
  await page.screenshot({
    path: path.join(dir, testInfo.project.name + '--progetta-entry-' + name + '.png'),
    fullPage: false,
  })
}

async function writeEvidence(testInfo, name, data) {
  const dir = path.join(outputRoot, 'progetta-entry')
  await fs.mkdir(dir, { recursive: true })
  const record = {
    schemaVersion: 1,
    project: testInfo.project.name,
    testedCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    capturedAt: new Date().toISOString(),
    ...data,
    noClassesScenario: 'NOT_TESTED_REQUIRES_ISOLATED_EMPTY_WORKSPACE',
  }
  await fs.writeFile(path.join(dir, testInfo.project.name + '--' + name + '.json'), JSON.stringify(record, null, 2) + '\n')
}
