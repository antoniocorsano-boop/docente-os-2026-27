import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'

const email = process.env.E2E_EMAIL ?? 'docente-os-e2e-2dbf49e1@example.invalid'
const password = process.env.E2E_PASSWORD
const fixturePath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'x3-responsible-ai.txt')

if (!password) {
  throw new Error('E2E_PASSWORD is required for the authenticated X3 acceptance test')
}

test('X3 mobile gate: context, useful answers, write preview and no automatic write', async ({ page }) => {
  await test.step('Accede con l’account tecnico isolato', async () => {
    await page.goto('/login')
    await page.locator('#email').fill(email)
    await page.locator('#password').fill(password)
    await Promise.all([
      page.waitForURL(/\/workspace(?:$|\?)/, { timeout: 30_000 }),
      page.getByRole('button', { name: 'Entra nel tuo spazio docente' }).click(),
    ])
  })

  await test.step('Carica e organizza una fixture autonoma', async () => {
    await page.goto('/knowledge')
    const upload = page.locator('input[type="file"][name="file"]')
    await upload.setInputFiles(fixturePath)
    await expect(page.getByText('x3-responsible-ai.txt')).toBeVisible()
    await page.getByRole('button', { name: 'Carica e organizza' }).click()
    await page.waitForURL(/\/knowledge\/[^/?#]+$/, { timeout: 60_000 })
    await expect(page.getByText('Pronto').first()).toBeVisible()
  })

  await test.step('Salva il contesto professionale e verifica il feedback', async () => {
    await page.locator('select[name="contentCategory"]').selectOption('TEACHING_RESOURCE')
    await page.locator('input[name="disciplines"]').fill('Tecnologia, educazione civica')
    await page.locator('input[name="classLabels"]').fill('3A, 3C')
    await page.locator('select[name="contextStatus"]').selectOption('REVIEWED')
    await page.locator('select[name="reliability"]').selectOption('AUTO')
    await page.getByRole('button', { name: 'Salva contesto' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Contesto professionale aggiornato' })).toBeVisible()
  })

  await test.step('Apre l’assistente e verifica contesto completo e ingombro mobile', async () => {
    await page.getByRole('button', { name: /Chiedi a DOCENTE OS/ }).click()
    const panel = page.locator('.dosAssistantPanel.floating.expanded')
    await expect(panel).toBeVisible()

    const contextStrip = panel.locator('.dosAssistantContextStrip')
    await expect(contextStrip).toContainText('Risorsa didattica')
    await expect(contextStrip).toContainText('3A')
    await expect(contextStrip).toContainText('3C')
    await expect(contextStrip).toContainText('Tecnologia')
    await expect(contextStrip).toContainText('educazione civica')

    const box = await panel.boundingBox()
    expect(box).not.toBeNull()
    expect(box.height).toBeLessThanOrEqual(915 * 0.60)
    expect(box.y).toBeGreaterThan(100)
  })

  await askAndCheck(page, 'Cosa contiene questo documento?', 1, async (response) => {
    await expect(response).toContainText('In sintesi')
    await expect(response).toContainText('Punti principali rilevati nel contenuto')
    await expect(response).toContainText(/verific|rispost|informaz/i)
    await expect(response).toContainText(/dati personali|riserv/i)
    await expect(response).toContainText(/integrità|lavoro personale/i)
    await expect(response).toContainText('Tecnologia')
    await expect(response).toContainText('3A')
    await expect(response).toContainText('3C')
    await page.screenshot({ path: 'test-results/x3-01-summary.png' })
  })

  await askAndCheck(page, 'Qual è il prossimo passo utile?', 2, async (response) => {
    await expect(response).toContainText('Ti propongo')
    await expect(response).toContainText(/Tecnologia/i)
    await expect(response).toContainText(/3A.*3C|3C.*3A/i)
    await expect(response).toContainText(/anteprima.*attività/i)
    await expect(response).toContainText(/non esegue l’azione|non esegue/i)
    await page.screenshot({ path: 'test-results/x3-02-next-step.png' })
  })

  const previewTitle = 'Esamina e adatta per la classe: x3-responsible-ai'
  await askAndCheck(page, 'Crea un’attività nel Planner da questo documento.', 3, async (response) => {
    await expect(response).toContainText('Anteprima proposta — nessuna scrittura eseguita')
    await expect(response).toContainText(previewTitle)
    await expect(response).toContainText('Destinazione: Planner → Oggi')
    await expect(response).toContainText('Data: da scegliere')
    await expect(response).toContainText('Priorità: Normale, da confermare')
    await expect(response).toContainText(/non modifica il Piano annuale/i)
    await expect(response).toContainText(/non crea un evento nel Calendario/i)
    await page.screenshot({ path: 'test-results/x3-03-write-preview.png' })
  })

  await test.step('Verifica che la richiesta X3 non abbia scritto nel Planner', async () => {
    await page.goto('/planner')
    await expect(page.getByText(previewTitle, { exact: false })).toHaveCount(0)
  })
})

async function askAndCheck(page, prompt, expectedAssistantMessages, assertion) {
  const input = page.locator('.dosAssistantInput')
  await input.fill(prompt)
  await page.locator('.dosAssistantSend').click()

  const responses = page.locator('.dosAssistantBubble.assistant')
  await expect(responses).toHaveCount(expectedAssistantMessages)
  await assertion(responses.last())
}
