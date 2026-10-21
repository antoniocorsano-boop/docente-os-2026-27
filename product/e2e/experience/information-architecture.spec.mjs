import { expect, test } from '@playwright/test'
import { loginE2E, requireE2ECredentials } from '../support/e2e-auth.mjs'
import { screenshotPath } from '../support/experience-observer.mjs'

requireE2ECredentials()

const PRIMARY_LABELS = ['Oggi', 'Orario', 'Classi', 'Altro']
const ALTRO_GROUPS = ['Lavoro', 'Risorse e organizzazione', 'Sistema']
const ALTRO_TOOLS = [
  'Attività',
  'Progetta',
  'Piano annuale',
  'Materiali e fonti',
  'Calendario',
  'Documentazione',
  'Impostazioni',
  'Account e sicurezza',
]

test('DOS-IA-RESET: la shell espone esattamente Oggi · Orario · Classi · Altro', async ({ page }, testInfo) => {
  await loginE2E(page)
  await page.goto('/planner')
  await expect(page.locator('#dos-main-content')).toBeVisible({ timeout: 30_000 })

  const primary = testInfo.project.name.startsWith('mobile')
    ? page.locator('.dosBottomNav')
    : page.locator('.dosSidebar .dosNavList')
  await expect(primary).toBeVisible()

  const labels = testInfo.project.name.startsWith('mobile')
    ? await primary.locator('small').allTextContents()
    : await primary.locator('.dosNavItem span').allTextContents()
  expect(labels).toEqual(PRIMARY_LABELS)
  expect(labels).not.toContain('Home')
  expect(labels).not.toContain('Naviga')

  await primary.getByRole('link', { name: 'Altro', exact: true }).click()
  await expect(page).toHaveURL(/\/altro(?:\?|$)/)
  await expect(page.getByRole('heading', { level: 1, name: 'Strumenti professionali' })).toBeVisible()

  const groups = await page.locator('.moreGroup > h2').allTextContents()
  expect(groups).toEqual(ALTRO_GROUPS)
  const tools = await page.locator('.moreLinks strong').allTextContents()
  expect(tools).toEqual(ALTRO_TOOLS)
  expect(tools).not.toContain('Home')

  await page.screenshot({
    path: await screenshotPath(testInfo.project.name, 'dos-ia-reset-primary-navigation'),
    fullPage: true,
  })
})
