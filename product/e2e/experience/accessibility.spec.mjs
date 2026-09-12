import fs from 'node:fs/promises'
import path from 'node:path'
import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { loginE2E, requireE2ECredentials } from '../support/e2e-auth.mjs'
import { EXPERIENCE_SURFACES } from './surfaces.mjs'

requireE2ECredentials()

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const OUTPUT_DIR = path.join('test-results', 'accessibility')

async function writeEvidence(testInfo, id, results) {
  await fs.mkdir(OUTPUT_DIR, { recursive: true })
  const file = path.join(OUTPUT_DIR, `${testInfo.project.name}-${id}.json`)
  const evidence = {
    schemaVersion: 1,
    standard: 'WCAG 2.2',
    targetLevel: 'AA',
    project: testInfo.project.name,
    surface: id,
    url: results.url,
    timestamp: results.timestamp,
    violations: results.violations,
    incomplete: results.incomplete,
    passes: results.passes.map(({ id: ruleId, impact, tags }) => ({ id: ruleId, impact, tags })),
  }
  await fs.writeFile(file, JSON.stringify(evidence, null, 2))
  await testInfo.attach(`wcag-${id}`, { path: file, contentType: 'application/json' })
}

function violationSummary(violations) {
  return violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    help: violation.help,
    tags: violation.tags,
    nodes: violation.nodes.map((node) => ({ target: node.target, failureSummary: node.failureSummary })),
  }))
}

async function analyzePage(page, testInfo, id) {
  const results = await new AxeBuilder({ page })
    .withTags(WCAG_TAGS)
    .analyze()

  await writeEvidence(testInfo, id, results)
  const violations = violationSummary(results.violations)
  expect(violations, `${id} has automated WCAG A/AA violations`).toEqual([])
}

test.describe('M5-03 — WCAG 2.2 AA automated assurance', () => {
  test('login: automated WCAG A/AA baseline', async ({ page }, testInfo) => {
    const response = await page.goto('/login')
    if (!response) throw new Error('No navigation response for /login')
    expect(response.status()).toBeLessThan(400)
    await expect(page.locator('h1').first()).toBeVisible()
    await analyzePage(page, testInfo, 'login')
  })

  test('AppShell: il primo Tab espone il bypass e porta il focus al main', async ({ page }) => {
    await loginE2E(page)
    const response = await page.goto('/planner')
    if (!response) throw new Error('No navigation response for /planner')
    expect(response.status()).toBeLessThan(400)
    const skip = page.getByRole('link', { name: 'Salta al contenuto' })
    await page.keyboard.press('Tab')
    await expect(skip).toBeFocused()
    await expect(skip).toBeVisible()
    await page.keyboard.press('Enter')
    await expect(page.locator('#dos-main-content')).toBeFocused()
  })

  for (const surface of EXPERIENCE_SURFACES) {
    test(`${surface.id}: automated WCAG A/AA baseline`, async ({ page }, testInfo) => {
      await loginE2E(page)
      const response = await page.goto(surface.path)
      if (!response) throw new Error(`No navigation response for ${surface.path}`)
      expect(response.status(), `${surface.id} returned HTTP ${response.status()}`).toBeLessThan(400)
      await expect(page.locator('.workSurface')).toBeVisible({ timeout: 30_000 })
      await expect(page.locator('h1').first()).toBeVisible()
      await analyzePage(page, testInfo, surface.id)
    })
  }
})
