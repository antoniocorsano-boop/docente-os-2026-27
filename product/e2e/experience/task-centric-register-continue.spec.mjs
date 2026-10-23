import { expect, test } from '@playwright/test'
import { loginE2E, requireE2ECredentials } from '../support/e2e-auth.mjs'
import {
  HVA_RECORDED_LESSON_BLOCK,
  readHvaRecordedLessonFixture,
} from '../support/hva-recorded-lesson-fixture.mjs'

requireE2ECredentials()

test('Journey: legacy Registra resolves an already recorded lesson automatically', async ({ page }) => {
  await loginE2E(page)
  const fixture = await readHvaRecordedLessonFixture()

  const recordHref = `/classi/${encodeURIComponent(fixture.sectionId)}/lezioni/${HVA_RECORDED_LESSON_BLOCK}?date=${encodeURIComponent(fixture.localDate)}&occurrence=${encodeURIComponent(fixture.occurrenceLogicalId)}&mode=record`
  await page.goto(recordHref)

  await expect(page.locator('[data-lesson-shell]')).toBeVisible()
  await expect(page.locator('[data-lesson-phase]')).toHaveCount(0)
  await expect(page.getByText('Registrata', { exact: true }).first()).toBeVisible()
  await expect(page.getByRole('combobox', { name: 'Esito effettivo', exact: true })).toHaveCount(0)
  await expect(page.locator('a[href*="mode="]')).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Osserva', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Materiali', exact: true })).toBeVisible()
})
