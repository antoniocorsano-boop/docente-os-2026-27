import fs from 'node:fs/promises'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import { loginE2E, requireE2ECredentials } from '../support/e2e-auth.mjs'
import { createClassroomMaterialFixture } from '../support/classroom-material-fixture.mjs'
import { deleteKnowledgeAsset } from '../support/knowledge-fixture-hygiene.mjs'

requireE2ECredentials()

const outputRoot = process.env.EXPERIENCE_OUTPUT_DIR ?? 'test-results/experience'

for (const classMatcher of [/2ª\s*A/i]) {
  test('Journey: Classe → In classe → strumenti rapidi', async ({ page }, testInfo) => {
    await loginE2E(page)
    await page.goto('/classi')

    const classCard = page.locator('a.canonicalClassCard').filter({ hasText: classMatcher }).first()
    await expect(classCard, 'La fixture HVA deve avere una 2ª A utilizzabile per il cockpit.').toBeVisible()
    const classHref = await classCard.getAttribute('href')
    const sectionId = sectionIdFromHref(classHref)

    const fixture = await createClassroomMaterialFixture({
      sectionId,
      suffix: `${process.env.GITHUB_RUN_ID ?? 'local'}-${testInfo.project.name}-${Date.now()}`,
    })

    try {
      await page.goto(`/classi/${encodeURIComponent(sectionId)}`)

      const prepared = page.locator(`a[href="/classi/${sectionId}/in-classe/${fixture.assetId}"]`)
      await expect(prepared, 'Il materiale predisposto deve comparire nella classe corretta.').toBeVisible()
      await expect(prepared).toContainText('Predisposto')
      await expect(prepared).toContainText('Per la classe')

      await prepared.click()
      await expect(page).toHaveURL(new RegExp(`/classi/${escapeRegExp(sectionId)}/in-classe/${escapeRegExp(fixture.assetId)}$`))
      await expect(page.locator('.classroomHero')).toBeVisible()
      await expect(page.locator('.classroomStepCard')).toBeVisible()
      await expect(page.locator('.classroomAssistant')).toBeVisible()
      await expect(page.getByRole('link', { name: /Apri presentazione Canva/i })).toHaveAttribute('href', /^https:\/\//)

      const readiness = page.locator('.classroomReadiness')
      await expect(readiness).toContainText('Presentazione')
      await expect(readiness).toContainText('Pronta')
      await expect(readiness).toContainText('Generazione immagini')
      await expect(readiness).toContainText('Non configurata')
      await expect(readiness).toContainText('Supporto locale attivo')

      await page.getByRole('button', { name: 'Spiega più semplice' }).click()
      await expect(page.locator('.classroomAssistantAnswer')).toContainText('Un sistema riceve qualcosa')
      await expect(page.locator('.classroomAssistantAnswer')).toContainText('supporto locale', { ignoreCase: true })

      await page.getByRole('button', { name: 'Dammi un esempio' }).click()
      await expect(page.locator('.classroomAssistantAnswer')).toContainText('energia elettrica')

      await page.getByRole('button', { name: 'Domanda flash' }).click()
      await expect(page.locator('.classroomAssistantAnswer')).toContainText('Qual è l’ingresso')

      await page.getByRole('button', { name: 'Idea visuale' }).click()
      await expect(page.locator('.classroomAssistantAnswer')).toContainText('ingresso → processo → uscita')
      await expect(page.locator('.classroomAssistantAnswer')).toContainText('senza AI')
      await expect(page.getByRole('button', { name: /Genera visuale/i })).toHaveCount(0)

      await page.getByRole('button', { name: 'Passo successivo' }).click()
      await expect(page.locator('.classroomStepCard')).toContainText('PASSO 2 DI 2')
      await expect(page.locator('.classroomStepCard')).toContainText('Controlla la comprensione')

      await page.getByRole('button', { name: 'Dammi un esempio' }).click()
      await expect(page.locator('.classroomAssistantAnswer')).toContainText('interruttore')

      const geometry = await page.evaluate(() => ({
        viewport: window.innerWidth,
        document: document.documentElement.scrollWidth,
      }))
      expect(geometry.document, 'Il cockpit non deve produrre overflow orizzontale.').toBeLessThanOrEqual(geometry.viewport)

      await screenshot(page, testInfo, 'classroom-cockpit')
      await recordJourney(testInfo.project.name, {
        status: 'PASS',
        note: `${fixture.classLabel} · fallback locale · 2 passaggi · 4 strumenti rapidi verificati`,
      })
    } finally {
      await deleteKnowledgeAsset(page, fixture.assetId).catch(() => {})
    }
  })
}

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
    id: 'classroom-cockpit',
    label: 'Classe → In classe → strumenti rapidi',
    project,
    status: result.status,
    note: result.note,
    capturedAt: new Date().toISOString(),
  }
  await fs.writeFile(path.join(dir, `${safe(project)}--classroom-cockpit.json`), `${JSON.stringify(payload, null, 2)}\n`)
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
