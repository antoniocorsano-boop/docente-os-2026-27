import fs from 'node:fs/promises'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import { loginE2E, requireE2ECredentials } from '../support/e2e-auth.mjs'

requireE2ECredentials()

const outputRoot = process.env.EXPERIENCE_OUTPUT_DIR ?? 'test-results/experience'
const FIXTURE_NOTE = 'HVA · Libri di testo · Cattedra tecnica'
const TEST_ISBN = '9788808950758'

test('Libri di testo: un ISBN può essere preparato per più Cattedre senza inviare la foto', async ({ page }, testInfo) => {
  await loginE2E(page)
  const fixture = await ensureConfirmedTeachingAssignment(page)

  try {
    await page.addInitScript(({ isbn }) => {
      Object.defineProperty(globalThis, 'BarcodeDetector', {
        configurable: true,
        value: class BarcodeDetector {
          async detect() { return [{ rawValue: isbn }] }
        },
      })
      Object.defineProperty(globalThis, 'createImageBitmap', {
        configurable: true,
        value: async () => ({ close() {} }),
      })
    }, { isbn: TEST_ISBN })

    await page.goto('/impostazioni/libri-di-testo')
    await expect(page.getByRole('heading', { name: 'Controlla i libri associati alle tue classi' })).toBeVisible()

    const bulkHeading = page.getByRole('heading', { name: 'Un libro, più classi in un solo passaggio' })
    const bulk = page.locator('section').filter({ has: bulkHeading }).first()
    await expect(bulk, 'Il fallback ad alta efficienza deve essere disponibile quando esiste almeno una Cattedra confermata.').toBeVisible()

    const isbn = bulk.locator('input[name="isbn13"]')
    await expect(isbn).toBeVisible()
    await expect(isbn).toHaveAttribute('inputmode', 'numeric')

    const photo = bulk.locator('input[type="file"]')
    await expect(photo).toHaveCount(1)
    await expect(photo).toHaveAttribute('accept', 'image/*')
    await expect(photo).toHaveAttribute('capture', 'environment')
    await expect(photo, 'La foto deve restare fuori dal payload del form: il file input non deve avere un name inviabile al server.').not.toHaveAttribute('name', /.+/)

    await photo.setInputFiles({
      name: 'isbn-e2e.png',
      mimeType: 'image/png',
      buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
    })
    await expect(isbn, 'La lettura locale della foto deve trasferire soltanto l’ISBN nel campo testuale.').toHaveValue(TEST_ISBN)
    await expect(bulk.getByRole('status')).toContainText(`ISBN ${TEST_ISBN} riconosciuto dalla foto`)

    const assignments = bulk.locator('input[type="checkbox"][name="teachingAssignmentIds"]')
    const assignmentCount = await assignments.count()
    expect(assignmentCount, 'Servono Cattedre confermate selezionabili nel test HVA.').toBeGreaterThan(0)

    const selectionCount = Math.min(2, assignmentCount)
    for (let index = 0; index < selectionCount; index += 1) await assignments.nth(index).check()

    await expect(bulk.getByText(new RegExp(`${selectionCount} Cattedr`))).toBeVisible()

    const submit = bulk.getByRole('button', { name: new RegExp(`Recupera una volta e proponi in ${selectionCount}`) })
    await expect(submit, 'La stessa ricerca ISBN deve poter essere applicata in un solo gesto alle Cattedre selezionate.').toBeEnabled()

    await screenshot(page, testInfo, 'textbooks-bulk-isbn')
  } finally {
    await fixture.restore()
  }
})

async function ensureConfirmedTeachingAssignment(page) {
  await page.goto('/impostazioni#cattedra')
  await expect(page.locator('#cattedra')).toBeVisible()

  const alreadyConfirmed = page.locator('#cattedra .humanAssignmentRow.isConfirmed').first()
  if (await alreadyConfirmed.count()) return { restore: async () => {} }

  let row = page.locator('#cattedra .humanAssignmentRow.needsConfirmation').filter({ hasText: FIXTURE_NOTE }).first()
  if (!(await row.count())) row = page.locator('#cattedra .humanAssignmentRow.needsConfirmation').first()

  if (!(await row.count())) {
    const form = page.locator('#cattedra form.settingsAssignmentForm')
    await expect(
      form,
      'L’account E2E deve avere almeno una coppia classe-disciplina disponibile per costruire una Cattedra fixture.',
    ).toBeVisible()
    await form.locator('input[name="sourceNote"]').fill(FIXTURE_NOTE)
    await form.getByRole('button', { name: 'Aggiungi alla cattedra' }).click()
    row = page.locator('#cattedra .humanAssignmentRow.needsConfirmation').filter({ hasText: FIXTURE_NOTE }).first()
    await expect(row, 'La Cattedra fixture deve essere creata tramite il normale flusso Impostazioni.').toBeVisible()
  }

  const assignmentId = await row.locator('input[name="assignmentId"]').first().inputValue()
  await row.getByRole('button', { name: 'Conferma', exact: true }).click()

  const confirmedRow = assignmentRow(page, assignmentId)
  await expect(confirmedRow, 'La Cattedra fixture deve diventare confermata prima del test libri.').toHaveClass(/isConfirmed/)

  return {
    restore: async () => {
      await page.goto('/impostazioni#cattedra')
      const current = assignmentRow(page, assignmentId)
      if (!(await current.count())) return
      if (!(await current.evaluate((element) => element.classList.contains('isConfirmed')))) return

      const details = current.locator('details.humanAssignmentDetails')
      if (await details.getAttribute('open') === null) await details.locator(':scope > summary').click()
      await current.getByRole('button', { name: 'Rimetti da controllare' }).click()
      await expect(assignmentRow(page, assignmentId), 'La fixture E2E deve essere riportata allo stato provvisorio dopo il test.').toHaveClass(/needsConfirmation/)
    },
  }
}

function assignmentRow(page, assignmentId) {
  return page.locator('#cattedra .humanAssignmentRow').filter({
    has: page.locator(`input[name="assignmentId"][value="${assignmentId}"]`),
  }).first()
}

async function screenshot(page, testInfo, name) {
  const dir = path.join(outputRoot, 'screenshots')
  await fs.mkdir(dir, { recursive: true })
  await page.screenshot({ path: path.join(dir, `${safe(testInfo.project.name)}--${safe(name)}.png`), fullPage: true })
}

function safe(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9_-]+/g, '-')
}
