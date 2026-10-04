import { expect, test } from '@playwright/test'
import { loginE2E, requireE2ECredentials } from '../support/e2e-auth.mjs'

requireE2ECredentials()

const TEMP_NOTE = 'HVA mobile direct edit · temporaneo'
const UPDATED_NOTE = 'HVA mobile direct edit · aggiornato'

test('Orario mobile: heading percepibile e modifica diretta end-to-end', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith('mobile'), 'Il contratto riguarda la gerarchia e l’editor mobile.')

  await loginE2E(page)
  await page.goto('/orario/gestisci')

  const heading = page.getByRole('heading', { level: 1, name: 'Gestisci orario' })
  await expect(
    heading,
    'La vista mobile deve conservare un titolo primario percepibile senza ripristinare il grande hero.',
  ).toBeVisible()

  const heroHeight = await page.locator('.timetableHero').evaluate((element) => element.getBoundingClientRect().height)
  expect(heroHeight, 'L’intestazione mobile deve restare compatta.').toBeLessThanOrEqual(72)

  const grid = page.getByRole('table', { name: 'Orario settimanale' })
  await expect(grid).toBeVisible()

  const emptyCell = page.getByRole('button', { name: /Aggiungi attività:/ }).first()
  await expect(emptyCell, 'Serve almeno una cella libera nella bozza E2E.').toBeVisible()

  let temporarySlotCreated = false
  try {
    await emptyCell.click()

    const createDialog = page.getByRole('dialog')
    await expect(createDialog).toBeVisible()

    const stacking = await page.evaluate(() => {
      const backdrop = document.querySelector('.timetableEditorBackdrop')
      const editor = document.querySelector('.timetableEditor')
      if (!backdrop || !editor) return null
      return {
        backdropZ: Number.parseInt(getComputedStyle(backdrop).zIndex || '0', 10),
        editorZ: Number.parseInt(getComputedStyle(editor).zIndex || '0', 10),
      }
    })
    expect(stacking, 'Editor e backdrop devono essere entrambi montati.').not.toBeNull()
    expect(stacking.editorZ, 'L’editor deve stare sopra il backdrop.').toBeGreaterThan(stacking.backdropZ)

    await createDialog.getByLabel('Che cosa fai in quest’ora?').selectOption('OTHER')
    await createDialog.getByText('Dettagli opzionali', { exact: true }).click()
    await createDialog.getByLabel('Nota').fill(TEMP_NOTE)
    await createDialog.getByRole('button', { name: 'Aggiungi all’orario' }).click()
    temporarySlotCreated = true

    const createFeedback = page.locator('[data-visual-priority="status-transient"]').filter({ hasText: 'Voce aggiunta all’orario.' })
    await expect(createFeedback, 'Il feedback di write deve entrare nel viewport corrente.').toBeVisible()
    const feedbackBox = await createFeedback.boundingBox()
    expect(feedbackBox, 'Il feedback transitorio deve avere una geometria misurabile.').not.toBeNull()
    expect(feedbackBox.y, 'Il feedback transitorio non deve comparire fuori dal viewport.').toBeGreaterThanOrEqual(0)
    expect(feedbackBox.y + feedbackBox.height, 'Il feedback transitorio deve restare nel viewport mobile.').toBeLessThanOrEqual(915)

    const createdCell = page.locator('.occupiedTimetableCell').filter({ hasText: TEMP_NOTE }).first()
    await expect(createdCell, 'La voce creata deve comparire nella griglia.').toBeVisible()
    await createdCell.click()

    const editDialog = page.getByRole('dialog')
    await expect(
      editDialog.getByRole('button', { name: 'Salva modifiche' }),
      'Una voce occupata in Gestisci deve aprire direttamente l’editor, non un pannello intermedio.',
    ).toBeVisible()

    await editDialog.getByText('Dettagli opzionali', { exact: true }).click()
    await editDialog.getByLabel('Nota').fill(UPDATED_NOTE)
    await editDialog.getByRole('button', { name: 'Salva modifiche' }).click()

    const updatedCell = page.locator('.occupiedTimetableCell').filter({ hasText: UPDATED_NOTE }).first()
    await expect(updatedCell, 'La modifica salvata deve tornare visibile nella griglia.').toBeVisible()
  } finally {
    if (temporarySlotCreated) {
      await page.goto('/orario/gestisci')
      const temporaryCell = page.locator('.occupiedTimetableCell').filter({ hasText: /HVA mobile direct edit/ }).first()
      if (await temporaryCell.count()) {
        await temporaryCell.click()
        const dialog = page.getByRole('dialog')
        if (await dialog.getByRole('button', { name: 'Modifica orario' }).count()) {
          await dialog.getByRole('button', { name: 'Modifica orario' }).click()
        }
        await page.getByRole('button', { name: 'Rimuovi dall’orario' }).click()
        await expect(page.locator('.occupiedTimetableCell').filter({ hasText: /HVA mobile direct edit/ })).toHaveCount(0)
      }
    }
  }
})
