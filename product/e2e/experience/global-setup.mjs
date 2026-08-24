import { chromium, expect } from '@playwright/test'
import { loginE2E, requireE2ECredentials } from '../support/e2e-auth.mjs'
import {
  deleteAllKnowledgeFixtures,
  knowledgeFixtureAssetIds,
  retainNewestKnowledgeFixture,
} from '../support/knowledge-fixture-hygiene.mjs'
import {
  EXPERIENCE_UDA_FIXTURE_TEXT,
  experienceUdaFixtureTitle,
} from '../support/experience-uda-fixture.mjs'

const baseURL = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3000'

export default async function globalSetup() {
  requireE2ECredentials()
  const title = experienceUdaFixtureTitle()
  const browser = await chromium.launch()
  const context = await browser.newContext({
    baseURL,
    locale: 'it-IT',
    timezoneId: 'Europe/Rome',
    viewport: { width: 1280, height: 900 },
  })
  const page = await context.newPage()

  try {
    await loginE2E(page)
    let assetId = await retainNewestKnowledgeFixture(page, title)

    if (!assetId) {
      await page.goto('/knowledge')
      await page.locator('input[name="title"]').fill(title)
      await page.locator('textarea[name="text"]').fill(EXPERIENCE_UDA_FIXTURE_TEXT)
      await Promise.all([
        page.waitForURL(/\/knowledge\/[^/?#]+$/, { timeout: 60_000 }),
        page.getByRole('button', { name: 'Salva e organizza' }).click(),
      ])
      assetId = assetIdFromUrl(page.url())
    } else {
      await page.goto(`/knowledge/${encodeURIComponent(assetId)}`)
    }

    const contextForm = page.locator('form.contextForm')
    await expect(contextForm).toBeVisible()
    await contextForm.locator('select[name="contentCategory"]').selectOption('UDA')
    await contextForm.locator('input[name="disciplines"]').fill('Tecnologia')
    await contextForm.locator('input[name="classLabels"]').fill('1A')
    await contextForm.locator('select[name="contextStatus"]').selectOption('REVIEWED')
    await contextForm.locator('select[name="reliability"]').selectOption('VERIFIED')
    await Promise.all([
      page.waitForURL(new RegExp(`/knowledge/${escapeRegExp(assetId)}\\?context=updated$`), { timeout: 30_000 }),
      contextForm.getByRole('button', { name: 'Salva contesto' }).click(),
    ])

    await page.goto('/progetta?grade=prima')
    const udaGroup = page.locator('.progettaGroup').filter({ hasText: /Unità di apprendimento|UDA/i }).first()
    await expect(udaGroup, 'Il provisioning deve rendere disponibile il gruppo UDA della classe prima.').toBeVisible()
    const udaLink = udaGroup.locator(`a[href^="/knowledge/${assetId}?"]`).first()
    await expect(
      udaLink,
      'L’UDA tecnica deve essere raggiungibile da Progetta tramite la normale risorsa Knowledge.',
    ).toBeVisible()
    await expect(
      udaLink,
      'Progetta deve già esporre la UDA tecnica nel contesto di preparazione.',
    ).toHaveAttribute('href', /[?&]mode=prepare(?:&|$)/)

    process.stdout.write(`HVA UDA fixture ready: ${assetId}\n`)
  } catch (error) {
    await deleteAllKnowledgeFixtures(page, title).catch(() => {})
    throw error
  } finally {
    await browser.close()
  }

  return async () => {
    await cleanupFixture(title)
  }
}

async function cleanupFixture(title) {
  const browser = await chromium.launch()
  const context = await browser.newContext({
    baseURL,
    locale: 'it-IT',
    timezoneId: 'Europe/Rome',
    viewport: { width: 1280, height: 900 },
  })
  const page = await context.newPage()

  try {
    await loginE2E(page)
    await deleteAllKnowledgeFixtures(page, title)
    const remaining = await knowledgeFixtureAssetIds(page, title)
    if (remaining.length) throw new Error(`HVA UDA cleanup incomplete: ${remaining.length} fixture remain`)
    process.stdout.write('HVA UDA fixture cleanup complete.\n')
  } finally {
    await browser.close()
  }
}

function assetIdFromUrl(url) {
  const match = new URL(url).pathname.match(/^\/knowledge\/([^/?#]+)$/)
  if (!match) throw new Error(`Knowledge asset id not found in URL: ${url}`)
  return decodeURIComponent(match[1])
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}