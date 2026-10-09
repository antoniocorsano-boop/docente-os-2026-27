import fs from 'node:fs/promises'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import { loginE2E, requireE2ECredentials } from '../support/e2e-auth.mjs'

requireE2ECredentials()

const outputRoot = process.env.EXPERIENCE_OUTPUT_DIR ?? 'test-results/experience'

test('Journey: Atlas → associa materiali alla lezione', async ({ page }, testInfo) => {
  await loginE2E(page)
  await page.goto('/classi')

  const classes = page.locator('a.canonicalClassCard')
  const count = await classes.count()
  let sectionId = ''
  let classLabel = ''

  for (let index = 0; index < count; index += 1) {
    const card = classes.nth(index)
    const label = (await card.locator('h2').innerText()).trim()
    if (!/^1(?:\D|$)/u.test(label)) continue
    const href = await card.getAttribute('href')
    const match = href?.match(/^\/classi\/([^/?#]+)/u)
    if (!match) continue
    sectionId = decodeURIComponent(match[1])
    classLabel = label
    break
  }

  test.skip(!sectionId, 'La fixture HVA non espone una classe prima canonica per verificare il return Atlas.')

  const bundle = {
    schema: 'studio-atlas.material-bundle/v0.1',
    source: 'studio-atlas',
    bundleId: 'hva-atlas-return-bundle',
    sourceUdaId: '1-00',
    generatedAt: '2026-10-09T00:00:00.000Z',
    items: [
      {
        materialId: 'hva-atlas-presentation',
        type: 'presentation',
        title: 'Presentazione per la lezione',
        description: 'Materiale tecnico sintetico per la sola verifica visuale HVA.',
        origin: 'atlas',
      },
      {
        materialId: 'hva-atlas-worksheet',
        type: 'worksheet',
        title: 'Scheda di lavoro per la classe',
        description: 'Materiale tecnico sintetico per la sola verifica visuale HVA.',
        origin: 'atlas',
      },
    ],
  }
  const encodedBundle = Buffer.from(JSON.stringify(bundle), 'utf8').toString('base64url')
  const route = `/progetta/atlas/ritorno?sectionId=${encodeURIComponent(sectionId)}&uda=1-00&blockId=B01#bundle=${encodedBundle}`

  await page.goto(route)
  await expect(page.getByRole('heading', { name: 'Associa i materiali alla lezione' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Materiali scelti' }).locator('article')).toHaveCount(2)
  await expect(page.getByText('Presentazione', { exact: true })).toBeVisible()
  await expect(page.getByText('Scheda di lavoro', { exact: true })).toBeVisible()

  const lesson = page.getByLabel('Lezione')
  await expect(lesson).toBeEnabled()
  await expect(lesson).toHaveValue('B01')

  const primary = page.getByRole('button', { name: 'Associa alla lezione' })
  await expect(primary).toBeEnabled()

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  )
  expect(hasHorizontalOverflow, 'Il return Atlas non deve introdurre overflow orizzontale.').toBe(false)

  const screenshotDir = path.join(outputRoot, 'screenshots')
  await fs.mkdir(screenshotDir, { recursive: true })
  await page.screenshot({
    path: path.join(screenshotDir, `${safe(testInfo.project.name)}--journey-atlas-material-return.png`),
    fullPage: true,
  })

  const journeyDir = path.join(outputRoot, 'journeys')
  await fs.mkdir(journeyDir, { recursive: true })
  await fs.writeFile(
    path.join(journeyDir, `${safe(testInfo.project.name)}--atlas-material-return.json`),
    `${JSON.stringify({
      schemaVersion: 1,
      id: 'atlas-material-return',
      label: 'Atlas → associa materiali alla lezione',
      project: testInfo.project.name,
      status: 'PASS',
      note: `Return Atlas pronto per ${classLabel}; nessuna scrittura eseguita.`,
      capturedAt: new Date().toISOString(),
    }, null, 2)}\n`,
  )
})

function safe(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9_-]+/g, '-')
}
