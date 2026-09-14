import { expect, test } from '@playwright/test'
import { loginE2E, requireE2ECredentials } from '../support/e2e-auth.mjs'
import { screenshotPath } from '../support/experience-observer.mjs'

requireE2ECredentials()

const PRIMARY_LABELS = ['Oggi', 'Classi', 'Orario', 'Altro']
const SECONDARY_LABELS = ['Home', 'Progetta', 'Piano annuale', 'Calendario', 'Conoscenza', 'Impostazioni', 'Account e sicurezza']

test('UX-0E: la shell mantiene primari solo i percorsi di lavoro e rende Conoscenza contestuale', async ({ page }, testInfo) => {
  await loginE2E(page)
  await page.goto('/planner')
  await expect(page.locator('#dos-main-content')).toBeVisible({ timeout: 30_000 })

  if (testInfo.project.name.startsWith('mobile')) {
    const primary = page.locator('.dosBottomNav')
    await expect(primary).toBeVisible()
    expect(await primary.locator('small').allTextContents()).toEqual(PRIMARY_LABELS)
    await primary.getByRole('button', { name: 'Altro' }).click()
  } else {
    const primary = page.locator('.dosSidebar .dosNavList')
    await expect(primary).toBeVisible()
    expect(await primary.locator('.dosNavItem span').allTextContents()).toEqual(PRIMARY_LABELS)
    await primary.getByRole('button', { name: 'Apri altre funzioni' }).click()
  }

  const secondary = page.locator('.dosCommandDialog')
  await expect(secondary).toBeVisible()
  const secondaryLabels = await secondary.locator('.dosCommandItem strong').allTextContents()
  expect(secondaryLabels).toEqual(SECONDARY_LABELS)

  for (const label of ['Oggi', 'Classi', 'Orario']) {
    expect(secondaryLabels, `Altro non deve duplicare ${label}.`).not.toContain(label)
  }
  expect(secondaryLabels).toContain('Conoscenza')

  await page.screenshot({
    path: await screenshotPath(testInfo.project.name, 'ux0e-contextual-capabilities-navigation'),
    fullPage: true,
  })
})
