import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'
import { loginE2E, requireE2ECredentials } from '../support/e2e-auth.mjs'

requireE2ECredentials()

const here = path.dirname(fileURLToPath(import.meta.url))
const fixtureDir = path.resolve(here, '../fixtures')
const fixturePdf = Buffer.from(
  fs.readFileSync(path.join(fixtureDir, 'timetable-real-shape-28-09-2026.pdf.b64'), 'utf8').trim(),
  'base64',
)
const expected = JSON.parse(
  fs.readFileSync(path.join(fixtureDir, 'timetable-real-shape-28-09-2026.expected.json'), 'utf8'),
)

test('Orario mobile: PDF tabellare reale sanitizzato ricostruisce tutte le lezioni del docente', async ({ page }, testInfo) => {
  await loginE2E(page)
  await page.goto('/orario/aggiorna')

  await expect(page.getByRole('heading', { name: 'Aggiorna orario', level: 1 })).toBeVisible()

  const fileInput = page.locator('.timetableLocalFilePicker input[type="file"]')
  await expect(fileInput).toBeAttached()
  await fileInput.setInputFiles({
    name: 'orario provvisorio dal 28-09-2026.pdf',
    mimeType: 'application/pdf',
    buffer: fixturePdf,
  })

  await expect(page.getByText('orario provvisorio dal 28-09-2026.pdf', { exact: true })).toBeVisible()

  const teacherInput = page.getByLabel('Cognome o etichetta con cui compari nell’orario')
  await teacherInput.fill(expected.teacherLabel)

  const extractButton = page.getByRole('button', { name: 'Estrai il mio orario' })
  await expect(extractButton).toBeEnabled({ timeout: 30_000 })
  await extractButton.click()

  await expect(page.getByText(`${expected.expectedLessons.length} lezioni trovate`, { exact: true })).toBeVisible({ timeout: 20_000 })
  await expect(page.getByText(/Non trovo il nominativo nel testo leggibile del PDF/)).toHaveCount(0)

  for (const lesson of expected.expectedLessons) {
    await expect(
      page.getByText(`${lesson.day} · ${lesson.ordinal}ª ora · ${lesson.classLabel}`, { exact: true }),
      `Manca ${lesson.day} ${lesson.ordinal}ª ora ${lesson.classLabel}`,
    ).toBeVisible()
  }

  await expect(page.getByRole('button', { name: 'Selezione manuale (fallback)' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Continua' })).toBeEnabled()

  if (testInfo.project.name.startsWith('mobile')) {
    const hierarchy = await page.evaluate(() => {
      const hero = document.querySelector('.timetableHero')
      const nav = document.querySelector('.timetableModeNav')
      const importCard = document.querySelector('.timetableImportCard')
      if (!hero || !nav || !importCard) return null
      const heroRect = hero.getBoundingClientRect()
      const navRect = nav.getBoundingClientRect()
      const importRect = importCard.getBoundingClientRect()
      return {
        heroTop: heroRect.top + window.scrollY,
        navTop: navRect.top + window.scrollY,
        importTop: importRect.top + window.scrollY,
      }
    })
    expect(hierarchy, 'Impossibile misurare la gerarchia mobile dell’Orario.').not.toBeNull()
    expect(hierarchy.heroTop).toBeLessThan(hierarchy.navTop)
    expect(hierarchy.navTop).toBeLessThan(hierarchy.importTop)
  }
})
