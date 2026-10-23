import { expect, test } from '@playwright/test'
import { loginE2E, requireE2ECredentials } from '../support/e2e-auth.mjs'
import { screenshotPath } from '../support/experience-observer.mjs'

requireE2ECredentials()

const PRIMARY_LABELS = ['Oggi', 'Orario', 'Classi', 'Altro']
const ALTRO_GROUPS = ['Lavoro', 'Risorse e organizzazione', 'Sistema']
const TOOL_LABELS = [
  'Attività',
  'Progetta',
  'Piano annuale',
  'Materiali e fonti',
  'Calendario',
  'Documentazione',
  'Impostazioni',
  'Account e sicurezza',
]

test('DOS-IA-RESET: la shell espone solo Oggi · Orario · Classi · Altro e Altro conserva gli otto strumenti', async ({ page }, testInfo) => {
  await loginE2E(page)
  await page.goto('/planner')
  await expect(page.locator('#dos-main-content')).toBeVisible({ timeout: 30_000 })

  const primary = testInfo.project.name.startsWith('mobile')
    ? page.locator('.dosBottomNav')
    : page.locator('.dosSidebar .dosNavList')
  const primaryLabels = testInfo.project.name.startsWith('mobile')
    ? await primary.locator('small').allTextContents()
    : await primary.locator('.dosNavItem span').allTextContents()

  expect(primaryLabels).toEqual(PRIMARY_LABELS)
  expect(primaryLabels).not.toContain('Home')

  await page.goto('/altro')
  await expect(page.getByRole('heading', { level: 1, name: 'Strumenti professionali' })).toBeVisible()
  expect(await page.locator('.moreGroup > h2').allTextContents()).toEqual(ALTRO_GROUPS)
  expect(await page.locator('.moreLinks strong').allTextContents()).toEqual(TOOL_LABELS)
  await expect(page.getByRole('link', { name: /Home/i })).toHaveCount(0)

  await page.screenshot({
    path: await screenshotPath(testInfo.project.name, 'dos-ia-reset-primary-and-altro'),
    fullPage: true,
  })
})
