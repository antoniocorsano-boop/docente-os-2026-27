import { test, expect } from '@playwright/test'

test('P2 recovery: il click produce una ricevuta senza creare account', async ({ page }) => {
  const probeEmail = `docente-os-recovery-probe-${Date.now()}@example.invalid`

  await page.goto('/login')
  await page.getByText('Problemi di accesso?').click()
  await page.locator('#recovery-email').fill(probeEmail)

  const recoveryButton = page.getByRole('button', { name: 'Invia collegamento di recupero' })
  await expect(recoveryButton).toBeEnabled()
  await recoveryButton.click()

  await page.waitForURL((url) => url.pathname === '/login' && url.searchParams.get('sent') === 'recovery')
  await expect(page.getByText(/Se l’indirizzo appartiene a un account esistente/i)).toBeVisible()
})
