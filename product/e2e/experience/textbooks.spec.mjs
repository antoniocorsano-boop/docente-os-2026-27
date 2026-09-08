import fs from 'node:fs/promises'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import { loginE2E, requireE2ECredentials } from '../support/e2e-auth.mjs'

requireE2ECredentials()

const outputRoot = process.env.EXPERIENCE_OUTPUT_DIR ?? 'test-results/experience'

test('Libri di testo: un ISBN può essere preparato per più Cattedre senza inviare la foto', async ({ page }, testInfo) => {
  await loginE2E(page)
  await page.goto('/impostazioni/libri-di-testo')

  await expect(page.getByRole('heading', { name: 'Controlla i libri associati alle tue classi' })).toBeVisible()

  const bulk = page.getByRole('heading', { name: 'Un libro, più classi in un solo passaggio' }).locator('..').locator('..')
  await expect(bulk, 'Il fallback ad alta efficienza deve essere disponibile quando esiste almeno una Cattedra confermata.').toBeVisible()

  const isbn = bulk.locator('input[name="isbn13"]')
  await expect(isbn).toBeVisible()
  await expect(isbn).toHaveAttribute('inputmode', 'numeric')

  const photo = bulk.locator('input[type="file"]')
  await expect(photo).toHaveCount(1)
  await expect(photo).toHaveAttribute('accept', 'image/*')
  await expect(photo).toHaveAttribute('capture', 'environment')
  await expect(photo, 'La foto deve restare fuori dal payload del form: il file input non deve avere un name inviabile al server.').not.toHaveAttribute('name', /.+/)

  const assignments = bulk.locator('input[type="checkbox"][name="teachingAssignmentIds"]')
  const assignmentCount = await assignments.count()
  expect(assignmentCount, 'Servono Cattedre confermate selezionabili nel test HVA.').toBeGreaterThan(0)

  const selectionCount = Math.min(2, assignmentCount)
  for (let index = 0; index < selectionCount; index += 1) await assignments.nth(index).check()

  await expect(bulk.getByText(new RegExp(`${selectionCount} Cattedr`))).toBeVisible()
  await isbn.fill('9788808950758')

  const submit = bulk.getByRole('button', { name: new RegExp(`Recupera una volta e proponi in ${selectionCount}`) })
  await expect(submit, 'La stessa ricerca ISBN deve poter essere applicata in un solo gesto alle Cattedre selezionate.').toBeEnabled()

  await screenshot(page, testInfo, 'textbooks-bulk-isbn')
})

async function screenshot(page, testInfo, name) {
  const dir = path.join(outputRoot, 'screenshots')
  await fs.mkdir(dir, { recursive: true })
  await page.screenshot({ path: path.join(dir, `${safe(testInfo.project.name)}--${safe(name)}.png`), fullPage: true })
}

function safe(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9_-]+/g, '-')
}
