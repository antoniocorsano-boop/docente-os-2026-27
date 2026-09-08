import fs from 'node:fs/promises'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import { loginE2E, requireE2ECredentials } from '../support/e2e-auth.mjs'

requireE2ECredentials()

const outputRoot = process.env.EXPERIENCE_OUTPUT_DIR ?? 'test-results/experience'
const FIXTURE_DISCIPLINE = 'Tecnologia HVA Libri'
const FIXTURE_NOTE = 'HVA · Libri di testo · Cattedra tecnica'
const TEST_ISBN = '9788808950758'

test('Libri di testo: il percorso resta semplice e ISBN/foto è un fallback locale per più classi', async ({ page }, testInfo) => {
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
    await expect(page.getByRole('heading', { name: 'Libri di testo', exact: true })).toBeVisible()
    await expect(page.getByText('Trova', { exact: true })).toBeVisible()
    await expect(page.getByText('Controlla', { exact: true })).toBeVisible()
    await expect(page.getByText('Conferma', { exact: true })).toBeVisible()

    const fallback = page.locator('details#aggiungi-isbn')
    await expect(fallback, 'ISBN/foto deve restare disponibile ma secondario rispetto alla ricerca automatica.').toBeVisible()
    await expect(fallback).not.toHaveAttribute('open', '')
    await fallback.locator(':scope > summary').click()

    const bulkHeading = page.getByRole('heading', { name: 'Aggiungi con ISBN' })
    const bulk = page.locator('div').filter({ has: bulkHeading }).first()
    await expect(bulk, 'Il fallback ISBN deve essere disponibile quando esiste almeno una Cattedra confermata.').toBeVisible()

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
    await expect(bulk.getByRole('status')).toContainText(`ISBN ${TEST_ISBN} riconosciuto`)

    const assignments = bulk.locator('input[type="checkbox"][name="teachingAssignmentIds"]')
    const assignmentCount = await assignments.count()
    expect(assignmentCount, 'Servono Cattedre confermate selezionabili nel test HVA.').toBeGreaterThan(0)

    const selectionCount = Math.min(2, assignmentCount)
    for (let index = 0; index < selectionCount; index += 1) await assignments.nth(index).check()

    await expect(bulk.getByText(new RegExp(`${selectionCount} class`))).toBeVisible()

    const submit = bulk.getByRole('button', { name: new RegExp(`Prepara la proposta per ${selectionCount}`) })
    await expect(submit, 'La stessa ricerca ISBN deve poter essere applicata in un solo gesto alle classi selezionate.').toBeEnabled()

    await screenshot(page, testInfo, 'textbooks-simplified-flow')
  } finally {
    await fixture.restore()
  }
})

async function ensureConfirmedTeachingAssignment(page) {
  const disciplineFixture = await ensureFixtureDisciplineActive(page)
  let assignmentId = null

  try {
    await page.goto('/impostazioni#cattedra')
    await expect(page.locator('#cattedra')).toBeVisible()

    let row = page.locator('#cattedra .humanAssignmentRow').filter({ hasText: FIXTURE_NOTE }).first()

    if (!(await row.count())) {
      const form = page.locator('#cattedra form.settingsAssignmentForm')
      await expect(
        form,
        'La disciplina HVA attiva deve rendere disponibile almeno una coppia classe-disciplina per la Cattedra fixture.',
      ).toBeVisible()

      const pairSelect = form.locator('select[name="assignmentPair"]')
      const fixtureOption = pairSelect.locator('option').filter({ hasText: FIXTURE_DISCIPLINE }).first()
      await expect(fixtureOption, 'La Cattedra fixture deve usare la disciplina tecnica HVA, non una disciplina reale.').toBeAttached()
      const pairValue = await fixtureOption.getAttribute('value')
      if (!pairValue) throw new Error('Valore della coppia HVA non disponibile')

      await pairSelect.selectOption(pairValue)
      await form.locator('input[name="sourceNote"]').fill(FIXTURE_NOTE)
      await form.getByRole('button', { name: 'Aggiungi alla cattedra' }).click()
      row = page.locator('#cattedra .humanAssignmentRow').filter({ hasText: FIXTURE_NOTE }).first()
      await expect(row, 'La Cattedra fixture deve essere creata tramite il normale flusso Impostazioni.').toBeVisible()
    }

    assignmentId = await row.locator('input[name="assignmentId"]').first().inputValue()
    const current = assignmentRow(page, assignmentId)
    if (await current.evaluate((element) => element.classList.contains('needsConfirmation'))) {
      await current.getByRole('button', { name: 'Conferma', exact: true }).click()
    }

    await expect(assignmentRow(page, assignmentId), 'La Cattedra fixture deve diventare confermata prima del test libri.').toHaveClass(/isConfirmed/)

    return {
      restore: async () => {
        await restoreAssignmentToProvisional(page, assignmentId)
        await disciplineFixture.restore()
      },
    }
  } catch (error) {
    if (assignmentId) await restoreAssignmentToProvisional(page, assignmentId).catch(() => {})
    await disciplineFixture.restore().catch(() => {})
    throw error
  }
}

async function ensureFixtureDisciplineActive(page) {
  await page.goto('/impostazioni#discipline')
  const section = page.locator('#discipline')
  await expect(section).toBeVisible()

  let row = section.locator('.settingsListRow').filter({ hasText: FIXTURE_DISCIPLINE }).first()
  if (!(await row.count())) {
    const form = section.locator('form.inlineSettingsForm')
    await expect(form, 'Deve essere possibile creare la disciplina tecnica HVA dal normale flusso Impostazioni.').toBeVisible()
    await form.locator('input[name="disciplineName"]').fill(FIXTURE_DISCIPLINE)
    await form.getByRole('button', { name: 'Aggiungi disciplina' }).click()
    row = section.locator('.settingsListRow').filter({ hasText: FIXTURE_DISCIPLINE }).first()
    await expect(row, 'La disciplina HVA deve essere visibile dopo la creazione.').toBeVisible()
  }

  const reactivate = row.getByRole('button', { name: 'Riattiva' })
  if (await reactivate.count()) {
    await reactivate.click()
    row = section.locator('.settingsListRow').filter({ hasText: FIXTURE_DISCIPLINE }).first()
  }
  await expect(row.getByRole('button', { name: 'Disattiva' }), 'La disciplina HVA deve essere attiva durante il test libri.').toBeVisible()

  return {
    restore: async () => {
      await page.goto('/impostazioni#discipline')
      const current = page.locator('#discipline .settingsListRow').filter({ hasText: FIXTURE_DISCIPLINE }).first()
      if (!(await current.count())) return
      const deactivate = current.getByRole('button', { name: 'Disattiva' })
      if (await deactivate.count()) await deactivate.click()
      await expect(
        page.locator('#discipline .settingsListRow').filter({ hasText: FIXTURE_DISCIPLINE }).first().getByRole('button', { name: 'Riattiva' }),
        'La disciplina HVA deve tornare inattiva a fine test.',
      ).toBeVisible()
    },
  }
}

async function restoreAssignmentToProvisional(page, assignmentId) {
  await page.goto('/impostazioni#cattedra')
  const current = assignmentRow(page, assignmentId)
  if (!(await current.count())) return
  if (!(await current.evaluate((element) => element.classList.contains('isConfirmed')))) return

  const details = current.locator('details.humanAssignmentDetails')
  if (await details.getAttribute('open') === null) await details.locator(':scope > summary').click()
  await current.getByRole('button', { name: 'Rimetti da controllare' }).click()
  await expect(assignmentRow(page, assignmentId), 'La Cattedra fixture deve essere riportata allo stato provvisorio dopo il test.').toHaveClass(/needsConfirmation/)
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
