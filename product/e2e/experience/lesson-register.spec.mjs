import fs from 'node:fs/promises'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import { loginE2E, requireE2ECredentials } from '../support/e2e-auth.mjs'
import { createClassroomMaterialFixture } from '../support/classroom-material-fixture.mjs'
import { deleteKnowledgeAsset } from '../support/knowledge-fixture-hygiene.mjs'

requireE2ECredentials()

const outputRoot = process.env.EXPERIENCE_OUTPUT_DIR ?? 'test-results/experience'

test('Journey: In classe → Registra la lezione', async ({ page }, testInfo) => {
  await loginE2E(page)
  await page.goto('/classi')

  const classCard = page.locator('a.canonicalClassCard').filter({ hasText: /2ª\s*A/i }).first()
  await expect(classCard).toBeVisible()
  const sectionId = sectionIdFromHref(await classCard.getAttribute('href'))
  const fixture = await createClassroomMaterialFixture({
    sectionId,
    suffix: `lesson-register-${process.env.GITHUB_RUN_ID ?? 'local'}-${testInfo.project.name}-${Date.now()}`,
  })

  try {
    await page.goto(`/classi/${encodeURIComponent(sectionId)}/in-classe/${fixture.assetId}`)
    const registerLink = page.getByRole('link', { name: 'Registra la lezione' })
    await expect(registerLink).toBeVisible()
    await registerLink.click()

    await expect(page).toHaveURL(new RegExp(`/classi/${escapeRegExp(sectionId)}/in-classe/${escapeRegExp(fixture.assetId)}/registra$`))
    await expect(page.getByRole('heading', { name: new RegExp(fixture.classLabel) })).toBeVisible()
    await expect(page.getByText('Attività prevista')).toBeVisible()
    await expect(page.getByRole('link', { name: /Apri materiale Canva/i })).toHaveAttribute('href', /^https:\/\//)

    for (const label of [
      'Che cosa hai svolto?',
      'Che cosa hai osservato?',
      'Difficoltà?',
      'Idee emerse?',
      'Che cosa potrebbe cambiare nell’UDA?',
      'Qual è la prossima attività?',
    ]) {
      await expect(page.getByText(label, { exact: true })).toBeVisible()
    }
    await expect(page.getByRole('button', { name: 'Registra la lezione' })).toBeVisible()
    await expect(page.getByText(/Non inserire nomi degli alunni/i)).toBeVisible()
    await expect(page.getByText(/non modifica automaticamente l’UDA/i)).toBeVisible()

    const geometry = await page.evaluate(() => ({
      viewport: window.innerWidth,
      document: document.documentElement.scrollWidth,
    }))
    expect(geometry.document, 'Il diario non deve produrre overflow orizzontale.').toBeLessThanOrEqual(geometry.viewport)

    await screenshot(page, testInfo, 'lesson-register')
  } finally {
    await deleteKnowledgeAsset(page, fixture.assetId).catch(() => {})
  }
})

async function screenshot(page, testInfo, name) {
  const dir = path.join(outputRoot, 'screenshots')
  await fs.mkdir(dir, { recursive: true })
  await page.screenshot({ path: path.join(dir, `${safe(testInfo.project.name)}--journey-${safe(name)}.png`), fullPage: true })
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
