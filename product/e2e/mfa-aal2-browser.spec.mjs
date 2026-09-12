import { expect, test } from '@playwright/test'
import {
  generateDefinitelyInvalidTotp,
  generateTotp,
  millisecondsUntilNextTotpStep,
} from './support/totp.mjs'

const email = process.env.MFA_E2E_EMAIL
const password = process.env.MFA_E2E_PASSWORD
const totpSecret = process.env.MFA_E2E_TOTP_SECRET

for (const [name, value] of [
  ['MFA_E2E_EMAIL', email],
  ['MFA_E2E_PASSWORD', password],
  ['MFA_E2E_TOTP_SECRET', totpSecret],
]) {
  if (!value) throw new Error(`${name} is required for the governed MFA browser gate`)
}

test('MFA browser boundary: AAL1 denied, valid TOTP promotes to AAL2', async ({ page }) => {
  await test.step('Password sign-in establishes only AAL1 and redirects to MFA', async () => {
    await page.goto('/login')
    await page.locator('#email').fill(email)
    await page.locator('#password').fill(password)
    await Promise.all([
      page.waitForURL(/\/mfa(?:\?|$)/, { timeout: 30_000 }),
      page.getByRole('button', { name: 'Entra nel tuo spazio docente' }).click(),
    ])

    await expect(page.getByRole('heading', { name: 'Conferma il secondo fattore.' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Inserisci il codice temporaneo' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Configura il secondo fattore' })).toHaveCount(0)
  })

  await test.step('AAL1 cannot enter an operational page or application API', async () => {
    await page.goto('/planner')
    await expect(page).toHaveURL(/\/mfa\?next=%2Fplanner(?:&|$)/)

    const response = await page.evaluate(async () => {
      const result = await fetch('/api/build-info', { headers: { accept: 'application/json' } })
      let body = null
      try {
        body = await result.json()
      } catch {
        body = null
      }
      return { status: result.status, body }
    })

    expect(response.status).toBe(403)
    expect(response.body).toMatchObject({ ok: false, code: 'mfa_required' })
  })

  await test.step('Auth/recovery surface remains reachable at AAL1 but does not bypass MFA', async () => {
    await page.goto('/imposta-password?source=recovery')
    await expect(page.getByRole('heading', { name: 'Scegli una nuova password' })).toBeVisible()

    await page.goto('/planner')
    await expect(page).toHaveURL(/\/mfa\?next=%2Fplanner(?:&|$)/)
  })

  await test.step('Incorrect TOTP is rejected and session remains AAL1', async () => {
    const wrongCode = generateDefinitelyInvalidTotp(totpSecret)
    await page.locator('#mfa-code').fill(wrongCode)
    await page.getByRole('button', { name: 'Verifica e continua' }).click()

    await expect(page.getByText('Il codice non è valido o non è più attivo. Attendi il codice successivo e riprova.')).toBeVisible()
    await expect(page).toHaveURL(/\/mfa(?:\?|$)/)
  })

  await test.step('Valid TOTP promotes the same session to AAL2', async () => {
    const remaining = millisecondsUntilNextTotpStep()
    if (remaining < 5_000) await page.waitForTimeout(remaining + 500)

    const code = generateTotp(totpSecret)
    await page.locator('#mfa-code').fill(code)
    await Promise.all([
      page.waitForURL(/\/planner(?:\?|$)/, { timeout: 30_000 }),
      page.getByRole('button', { name: 'Verifica e continua' }).click(),
    ])

    await expect(page).toHaveURL(/\/planner(?:\?|$)/)
  })

  await test.step('AAL2 can use the operational page and application API', async () => {
    const response = await page.evaluate(async () => {
      const result = await fetch('/api/build-info', { headers: { accept: 'application/json' } })
      return { status: result.status, body: await result.json() }
    })

    expect(response.status).toBe(200)
    expect(response.body).toHaveProperty('commit')

    await page.goto('/mfa?next=%2Fplanner')
    await expect(page).toHaveURL(/\/planner(?:\?|$)/)
  })
})
