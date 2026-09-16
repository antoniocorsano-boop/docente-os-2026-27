import { expect } from '@playwright/test'
import { generateTotp, governedMfaRetryJitterMs, millisecondsUntilNextTotpStep } from './totp.mjs'

export const E2E_EMAIL = process.env.E2E_EMAIL
export const E2E_PASSWORD = process.env.E2E_PASSWORD
export const E2E_TOTP_SECRET = process.env.E2E_TOTP_SECRET

let cachedAal2Cookies = null

const MFA_TRANSIENT_MESSAGES = [
  'Non è stato possibile avviare la verifica del secondo fattore. Riprova.',
  'Il codice non è valido o non è più attivo. Attendi il codice successivo e riprova.',
  'La verifica è riuscita, ma la sessione non è ancora AAL2. Riprova.',
]

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

  if (await tryReuseCachedAal2Session(page)) return

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    await page.goto('/login')
    await page.locator('#email').fill(E2E_EMAIL)
    await page.locator('#password').fill(E2E_PASSWORD)

    await Promise.all([
      page.waitForURL(/(?:\/(?:mfa|planner|workspace)(?:$|\?)|\/login\?error=)/, { timeout: 30_000 }),
      page.getByRole('button', { name: 'Entra nel tuo spazio docente' }).click(),
    ])

    const url = new URL(page.url())
    if (url.pathname === '/login') {
      if (url.searchParams.get('error') !== 'auth_request_failed' || attempt === 2) {
        throw new Error(`Governed login failed at ${url.pathname}${url.search}`)
      }
      await page.waitForTimeout(750 + governedMfaRetryJitterMs())
      continue
    }

    break
  }

  if (/\/mfa(?:$|\?)/.test(new URL(page.url()).pathname + new URL(page.url()).search)) {
    await completeMfaChallenge(page)
  }

  await reachPlannerBoundary(page)
  await expect(page).toHaveURL(/\/planner(?:$|\?)/)
  await expect(page.locator('#dos-main-content')).toBeVisible()
  cachedAal2Cookies = await page.context().cookies()
  process.stdout.write('Governed AAL2 full login completed; in-memory worker session cached.\n')
}

async function tryReuseCachedAal2Session(page) {
  if (!Array.isArray(cachedAal2Cookies) || cachedAal2Cookies.length === 0) return false

  try {
    await page.context().addCookies(cachedAal2Cookies)
    await reachPlannerBoundary(page)
    await expect(page).toHaveURL(/\/planner(?:$|\?)/, { timeout: 10_000 })
    await expect(page.locator('#dos-main-content')).toBeVisible({ timeout: 10_000 })
    process.stdout.write('Governed AAL2 in-memory worker session reused.\n')
    return true
  } catch {
    cachedAal2Cookies = null
    await page.context().clearCookies()
    process.stdout.write('Governed AAL2 cached session rejected; full login required.\n')
    return false
  }
}

async function completeMfaChallenge(page) {
  const runJitter = governedMfaRetryJitterMs()

  for (let attempt = 1; attempt <= 4; attempt += 1) {
    await waitForMfaChallengeReady(page)
    await selectGovernedCiFactor(page)

    const remaining = millisecondsUntilNextTotpStep()
    if (remaining < 6_000 + runJitter) await page.waitForTimeout(remaining + 750 + runJitter)
    else if (runJitter) await page.waitForTimeout(runJitter)

    const code = generateTotp(E2E_TOTP_SECRET)
    await page.locator('#mfa-code').fill(code)
    await page.getByRole('button', { name: 'Verifica e continua' }).click()

    const outcome = await waitForMfaVerificationOutcome(page)
    if (outcome === 'success') {
      await page.waitForLoadState('domcontentloaded').catch(() => {})
      await page.waitForTimeout(250)
      return
    }

    if (attempt === 4) {
      throw new Error(`Governed MFA verification did not reach AAL2 after ${attempt} attempts (${outcome})`)
    }

    const untilNextStep = millisecondsUntilNextTotpStep()
    await page.waitForTimeout(untilNextStep + 750 + runJitter)
  }
}

async function reachPlannerBoundary(page) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    if (new URL(page.url()).pathname === '/planner') {
      await page.waitForLoadState('domcontentloaded').catch(() => {})
      return
    }

    try {
      await page.goto('/planner', { waitUntil: 'domcontentloaded' })
      return
    } catch (error) {
      if (!String(error).includes('interrupted by another navigation') || attempt === 3) throw error
      await page.waitForTimeout(300)
      await page.waitForLoadState('domcontentloaded').catch(() => {})
    }
  }
}

async function waitForMfaChallengeReady(page) {
  await expect(page.getByRole('heading', { name: 'Conferma il secondo fattore.' })).toBeVisible()

  for (let attempt = 1; attempt <= 8; attempt += 1) {
    const codeHeading = page.getByRole('heading', { name: 'Inserisci il codice temporaneo' })
    if (await codeHeading.isVisible().catch(() => false)) return

    const enrollmentButton = page.getByRole('button', { name: 'Configura il secondo fattore' })
    if (await enrollmentButton.isVisible().catch(() => false)) {
      throw new Error('Governed MFA fixture has no verified TOTP factor')
    }

    const reloadButton = page.getByRole('button', { name: 'Ricarica' })
    if (await reloadButton.isVisible().catch(() => false)) {
      await page.waitForTimeout(Math.min(1_000 * attempt, 4_000) + governedMfaRetryJitterMs())
      await Promise.all([
        page.waitForLoadState('domcontentloaded').catch(() => {}),
        reloadButton.click(),
      ])
      await page.waitForTimeout(Math.min(750 * attempt, 3_000))
    } else {
      await page.waitForTimeout(Math.min(1_000 * attempt, 4_000))
    }

    if (attempt === 8) {
      throw new Error('Governed MFA fixture did not expose a usable verified TOTP factor after bounded backoff retries')
    }
  }
}

async function selectGovernedCiFactor(page) {
  const factorSelect = page.locator('#mfa-factor')
  if (!(await factorSelect.count())) return

  await expect(factorSelect).toBeVisible()
  const ciOption = factorSelect.locator('option', { hasText: 'Docente OS CI' })
  if (await ciOption.count()) {
    await factorSelect.selectOption({ label: 'Docente OS CI' })
    return
  }

  if (await factorSelect.locator('option').count() > 1) {
    throw new Error('Governed MFA fixture has multiple factors but the Docente OS CI factor is unavailable')
  }
}

async function waitForMfaVerificationOutcome(page) {
  for (let poll = 0; poll < 80; poll += 1) {
    const url = new URL(page.url())
    if (url.pathname !== '/mfa') return 'success'

    const reloadButton = page.getByRole('button', { name: 'Ricarica' })
    if (await reloadButton.isVisible().catch(() => false)) {
      await page.waitForTimeout(1_500 + governedMfaRetryJitterMs())
      await reloadButton.click()
      await page.waitForLoadState('domcontentloaded').catch(() => {})
      return 'factor-read-transient'
    }

    const body = await page.locator('body').innerText().catch(() => '')
    const transient = MFA_TRANSIENT_MESSAGES.find((message) => body.includes(message))
    if (transient) return transient

    await page.waitForTimeout(250)
  }

  return 'verification-timeout'
}
