import fs from 'node:fs/promises'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import { loginE2E, requireE2ECredentials } from '../support/e2e-auth.mjs'
import { createClassroomMaterialFixture } from '../support/classroom-material-fixture.mjs'
import { deleteKnowledgeAsset } from '../support/knowledge-fixture-hygiene.mjs'

requireE2ECredentials()

const outputRoot = process.env.EXPERIENCE_OUTPUT_DIR ?? 'test-results/experience'

test('UX-0E: Classe → Conoscenza contestuale → risorsa → Classe', async ({ page }, testInfo) => {
  await loginE2E(page)
  await page.goto('/classi')

  const classCard = page.locator('a.canonicalClassCard').filter({ hasText: /2ª\s*A/i }).first()
  await expect(classCard, 'La fixture HVA deve avere una 2ª A utilizzabile.').toBeVisible()
  const classHref = await classCard.getAttribute('href')
  const sectionId = sectionIdFromHref(classHref)

  const fixture = await createClassroomMaterialFixture({
    sectionId,
    suffix: `ux0e-${process.env.GITHUB_RUN_ID ?? 'local'}-${testInfo.project.name}-${Date.now()}`,
  })

  try {
    await page.goto(`/classi/${encodeURIComponent(sectionId)}`)

    const otherPaths = page.locator('details.humanTaskSecondary').filter({ hasText: 'Contesto della classe e altri percorsi' })
    await expect(otherPaths).toBeVisible()
    await otherPaths.locator('summary').click()

    const knowledgeLink = otherPaths.getByRole('link', { name: /Conoscenza/ })
    const knowledgeHref = await knowledgeLink.getAttribute('href')
    expect(knowledgeHref).toBeTruthy()
    const listUrl = new URL(knowledgeHref, 'https://docente-os.local')
    expect(listUrl.pathname).toBe('/knowledge')
    expect(listUrl.searchParams.get('mode')).toBe('class')
    expect(listUrl.searchParams.get('returnTo')).toBe(`/classi/${sectionId}`)
    expect(listUrl.searchParams.get('section')).toBe(sectionId)
    expect(listUrl.searchParams.get('classLabel')).toBe(fixture.classLabel)

    await knowledgeLink.click()
    await expect(page).toHaveURL(/\/knowledge\?.*mode=class/)
    const context = page.getByTestId('knowledge-task-context')
    await expect(context).toContainText('Stai cercando un materiale per la classe corrente.')
    await expect(context.getByRole('link', { name: 'Torna alla classe' })).toHaveAttribute('href', `/classi/${sectionId}`)

    for (const form of [page.locator('form.knowledgeSearch'), page.locator('form.knowledgeFilters')]) {
      await expect(form.locator('input[name="mode"]')).toHaveValue('class')
      await expect(form.locator('input[name="returnTo"]')).toHaveValue(`/classi/${sectionId}`)
      await expect(form.locator('input[name="section"]')).toHaveValue(sectionId)
    }

    const assetLink = page.locator('a.knowledgeAssetRow').filter({ hasText: fixture.title }).first()
    await expect(assetLink, 'La risorsa della fixture deve restare visibile nel filtro di classe.').toBeVisible()
    const assetHref = await assetLink.getAttribute('href')
    const detailUrl = new URL(assetHref, 'https://docente-os.local')
    expect(detailUrl.pathname).toBe(`/knowledge/${fixture.assetId}`)
    expect(detailUrl.searchParams.get('mode')).toBe('class')
    expect(detailUrl.searchParams.get('returnTo')).toBe(`/classi/${sectionId}`)
    expect(detailUrl.searchParams.get('section')).toBe(sectionId)

    await assetLink.click()
    await expect(page.locator('.focusedKnowledgeContext')).toContainText('Torna alla classe')
    await expect(page.locator('.focusedKnowledgeHero')).toContainText(fixture.title)

    await screenshot(page, testInfo, 'ux0e-contextual-knowledge')

    await page.getByRole('link', { name: 'Torna alla classe' }).first().click()
    await expect(page).toHaveURL(new RegExp(`/classi/${escapeRegExp(sectionId)}$`))
    await expect(page.locator('.classWorkspaceHeader')).toBeVisible()

    await recordJourney(testInfo.project.name, {
      status: 'PASS',
      note: `${fixture.classLabel} · Classe → Conoscenza task-aware → risorsa → ritorno alla Classe con section/returnTo preservati`,
    })
  } finally {
    await deleteKnowledgeAsset(page, fixture.assetId).catch(() => {})
  }
})

async function screenshot(page, testInfo, name) {
  const dir = path.join(outputRoot, 'screenshots')
  await fs.mkdir(dir, { recursive: true })
  await page.screenshot({ path: path.join(dir, `${safe(testInfo.project.name)}--journey-${safe(name)}.png`), fullPage: true })
}

async function recordJourney(project, result) {
  const dir = path.join(outputRoot, 'journeys')
  await fs.mkdir(dir, { recursive: true })
  const payload = {
    schemaVersion: 1,
    id: 'ux0e-contextual-capabilities',
    label: 'Classe → Conoscenza contestuale → risorsa → Classe',
    project,
    status: result.status,
    note: result.note,
    capturedAt: new Date().toISOString(),
  }
  await fs.writeFile(path.join(dir, `${safe(project)}--ux0e-contextual-capabilities.json`), `${JSON.stringify(payload, null, 2)}\n`)
}

function sectionIdFromHref(value) {
  const match = typeof value === 'string' ? value.match(/^\/classi\/([^/?#]+)$/) : null
  if (!match) throw new Error(`Section id not found in class href: ${value}`)
  return decodeURIComponent(match[1])
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function safe(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9_-]+/g, '-')
}
