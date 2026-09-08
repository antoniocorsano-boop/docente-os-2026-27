import { expect, test } from '@playwright/test'
import { loginE2E, requireE2ECredentials } from '../support/e2e-auth.mjs'

requireE2ECredentials()

test('Materiale del libro: un URL copiato senza handoff valido non promette il collegamento', async ({ page }) => {
  await loginE2E(page)

  const copiedTextbookId = '00000000-0000-4000-8000-000000000267'
  await page.goto(`/knowledge?capture=file&source=textbook&textbookId=${copiedTextbookId}`)

  await expect(page.getByRole('heading', { name: 'Conoscenza', exact: true })).toBeVisible()
  await expect(page.locator('.knowledgeFeedback[role="alert"]')).toContainText('Il collegamento al libro è scaduto o non è più valido')
  await expect(
    page.getByText('DOCENTE OS conserverà il collegamento al libro confermato', { exact: false }),
    'Senza cookie e adozione confermata la UI non deve promettere un MATERIAL_FOR che il server non può garantire.',
  ).toHaveCount(0)
  await expect(
    page.locator('[data-capture-mode-panel="file"]'),
    'Un URL copiato non deve attivare implicitamente la modalità file contestuale.',
  ).not.toHaveClass(/isActive/)
})
