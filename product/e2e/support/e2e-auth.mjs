import { expect } from '@playwright/test'
import { generateTotp, millisecondsUntilNextTotpStep } from './totp.mjs'

export const E2E_EMAIL = process.env.E2E_EMAIL
export const E2E_PASSWORD = process.env.E2E_PASSWORD
export const E2E_TOTP_SECRET = process.env.E2E_TOTP_SECRET

export function requireE2ECredentials() {
  const missing = [
    ['E2E_EMAIL', E2E_EMAIL],
    ['E2E_PASSWORD', E2E_PASSWORD],
    ['E2E_TOTP_SECRET', E2E_TOTP_SECRET],
  ].filter(([, value]) => !value).map(([name]) => name)

  if (missing.length) {
    throw new Error(`${missing.join(', ')} ${missing.length === 1 ? 'is' : 'are'} required for authenticated AAL2 acceptance tests`)
  }
}

export async function loginE2E(page) {
  requireE2ECredentials()

  await page.goto('/login')
  await page.locator('#email').fill(E2E_EMAIL)
  await page.locator('#password').fill(E2E_PASSWORD)

  await Promise.all([
    page.waitForURL(/\/(?:mfa|planner)(?:$|\?)/, { timeout: 30_000 }),
    page.getByRole('button', { name: 'Entra nel tuo spazio docente' }).click(),
  ])

  if (/\/mfa(?:$|\?)/.test(new URL(page.url()).pathname + new URL(page.url()).search)) {
    await expect(page.getByRole('heading', { name: 'Conferma il secondo fattore.' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Inserisci il codice temporaneo' })).toBeVisible()

    const factorSelect = page.locator('#mfa-factor')
    if (await factorSelect.count()) {
      await expect(factorSelect).toBeVisible()
      const ciOption = factorSelect.locator('option', { hasText: 'Docente OS CI' })
      if (await ciOption.count()) {
        await factorSelect.selectOption({ label: 'Docente OS CI' })
      } else if (await factorSelect.locator('option').count() > 1) {
        throw new Error('Governed MFA fixture has multiple factors but the Docente OS CI factor is unavailable')
      }
    }

    const remaining = millisecondsUntilNextTotpStep()
    if (remaining < 5_000) await page.waitForTimeout(remaining + 500)

    const code = generateTotp(E2E_TOTP_SECRET)
    await page.locator('#mfa-code').fill(code)
    await Promise.all([
      page.waitForURL(/\/planner(?:$|\?)/, { timeout: 30_000 }),
      page.getByRole('button', { name: 'Verifica e continua' }).click(),
    ])
  }

  await page.waitForLoadState('domcontentloaded')
  await expect(page).toHaveURL(/\/planner(?:$|\?)/)
  await expect(page.locator('main')).toBeVisible()
}
