import { expect, test } from '@playwright/test'

test('CSP globale usa nonce request-scoped senza unsafe script execution', async ({ page, context }) => {
  const response = await page.goto('/login', { waitUntil: 'domcontentloaded' })
  expect(response).not.toBeNull()

  const policy = response.headers()['content-security-policy']
  expect(policy).toBeTruthy()
  expect(policy).toContain("object-src 'none'")
  expect(policy).toContain("base-uri 'none'")
  expect(policy).toContain("script-src-attr 'none'")
  expect(policy).toContain("frame-ancestors 'none'")

  const nonceMatch = policy.match(/'nonce-([^']+)'/)
  expect(nonceMatch).not.toBeNull()
  const policyNonce = nonceMatch[1]

  const scriptNonces = await page.locator('script[nonce]').evaluateAll((scripts) =>
    scripts.map((script) => script.nonce).filter(Boolean),
  )
  expect(scriptNonces.length).toBeGreaterThan(0)
  expect(new Set(scriptNonces)).toEqual(new Set([policyNonce]))

  const scriptDirective = policy.split(';').find((directive) => directive.trim().startsWith('script-src '))
  expect(scriptDirective).toBeTruthy()
  expect(scriptDirective).not.toContain("'unsafe-inline'")
  expect(scriptDirective).not.toContain("'unsafe-eval'")

  await expect(page.getByRole('main')).toBeVisible()

  const secondPage = await context.newPage()
  const secondResponse = await secondPage.goto('/login', { waitUntil: 'domcontentloaded' })
  const secondPolicy = secondResponse?.headers()['content-security-policy'] ?? ''
  const secondNonce = secondPolicy.match(/'nonce-([^']+)'/)?.[1]

  expect(secondNonce).toBeTruthy()
  expect(secondNonce).not.toBe(policyNonce)
})
