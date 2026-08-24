import { expect } from '@playwright/test'

export const E2E_EMAIL = process.env.E2E_EMAIL ?? 'docente-os-e2e-2dbf49e1@example.invalid'
export const E2E_PASSWORD = process.env.E2E_PASSWORD

export function requireE2ECredentials() {
  if (!E2E_PASSWORD) throw new Error('E2E_PASSWORD is required for authenticated acceptance tests')
}

export async function loginE2E(page) {
  requireE2ECredentials()
  await page.goto('/login')
  await page.locator('#email').fill(E2E_EMAIL)
  await page.locator('#password').fill(E2E_PASSWORD)
  await Promise.all([
    page.waitForURL(/\/(?:workspace|planner)(?:$|\?)/, { timeout: 30_000 }),
    page.getByRole('button', { name: 'Entra nel tuo spazio docente' }).click(),
  ])
  await expect(page).not.toHaveURL(/\/login(?:$|\?)/)
}
