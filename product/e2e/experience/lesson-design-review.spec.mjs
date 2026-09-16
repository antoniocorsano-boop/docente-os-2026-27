import fs from 'node:fs/promises'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import { loginE2E, requireE2ECredentials } from '../support/e2e-auth.mjs'

requireE2ECredentials()

const outputRoot = process.env.EXPERIENCE_OUTPUT_DIR ?? 'test-results/experience'

test('LP-6 — la revisione governata apre gli strumenti di progettazione della lezione', async ({ page }, testInfo) => {
  await loginE2E(page)
  await page.goto('/classi')

  const classCard = page.locator('a.canonicalClassCard').filter({ hasText: /2ª\s*A/i }).first()
  await expect(classCard, 'La fixture HVA deve avere una 2ª A utilizzabile.').toBeVisible()
  const sectionId = sectionIdFromHref(await classCard.getAttribute('href'))

  const response = await page.goto(
    `/classi/${encodeURIComponent(sectionId)}/lezioni/B01?mode=prepare&review=design#lesson-design-tools-title`,
  )
  if (!response) throw new Error('No navigation response for governed lesson design review')
  expect(response.status()).toBeLessThan(400)

  const title = page.getByRole('heading', { name: 'Arricchisci solo se serve' })
  await expect(title, 'La CTA di revisione deve rivelare gli strumenti di progettazione.').toBeVisible({ timeout: 30_000 })

  const disclosure = page.locator('details').filter({ has: title }).first()
  await expect(disclosure).toHaveJSProperty('open', true)
  await expect(page).toHaveURL(/review=design/)

  const dir = path.join(outputRoot, 'screenshots')
  await fs.mkdir(dir, { recursive: true })
  await page.screenshot({
    path: path.join(dir, `${safe(testInfo.project.name)}--journey-lesson-design-review.png`),
    fullPage: true,
  })
})

function sectionIdFromHref(value) {
  const match = typeof value === 'string' ? value.match(/^\/classi\/([^/?#]+)$/) : null
  if (!match) throw new Error(`Section id not found in class href: ${value}`)
  return decodeURIComponent(match[1])
}

function safe(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9_-]+/g, '-')
}
