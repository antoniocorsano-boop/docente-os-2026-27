import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'
import { loginE2E, requireE2ECredentials } from './support/e2e-auth.mjs'
import { retainNewestKnowledgeFixture } from './support/knowledge-fixture-hygiene.mjs'

const fixturePath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'x3-responsible-ai.txt')

requireE2ECredentials()

test('X3 mobile gate: grounded answers, useful proposals, write preview and no automatic write', async ({ page }) => {
  await login(page)

  await test.step('Apre o crea una fixture autonoma deterministica', async () => {
    const existingAssetId = await retainNewestKnowledgeFixture(page, 'x3-responsible-ai')

    if (existingAssetId) {
      await page.goto(`/knowledge/${encodeURIComponent(existingAssetId)}`)
    } else {
      await page.goto('/knowledge')
      const upload = page.locator('input[type="file"][name="file"]')
      await upload.setInputFiles(fixturePath)
      await expect(page.getByText('x3-responsible-ai.txt')).toBeVisible()
      await page.getByRole('button', { name: 'Carica e organizza' }).click()
      await page.waitForURL(/\/knowledge\/[^/?#]+$/, { timeout: 60_000 })
    }

    const contentContext = page.getByRole('region', { name: 'Contesto del contenuto' })
    await expect(contentContext).toBeVisible()
    await expect(contentContext.getByText('Pronto', { exact: true })).toBeVisible()
  })

  await test.step('Salva una correzione di contesto preservando l’attendibilità della fonte', async () => {
    const contextForm = page.locator('form.contextForm')
    await contextForm.locator('select[name="contentCategory"]').selectOption('TEACHING_RESOURCE')
    await contextForm.locator('input[name="disciplines"]').fill('Tecnologia, educazione civica')
    await contextForm.locator('input[name="classLabels"]').fill('3A, 3C')
    await expect(contextForm.locator('input[name="contextStatus"]')).toHaveValue('REVIEWED')
    await expect(contextForm.locator('input[name="reliability"]')).toHaveValue('AUTO')
    await Promise.all([
      page.waitForURL(/\/knowledge\/[^/?#]+\?context=updated$/, { timeout: 30_000 }),
      contextForm.getByRole('button', { name: 'Salva correzione' }).click(),
    ])
    await expect(page.getByRole('status').filter({ hasText: 'Correzione salvata' })).toBeVisible()
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
    await expect(response).toContainText(/attività conclusiva|piano di uso responsabile/i)
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

  await askAndCheck(page, 'Come devono essere verificate le risposte generate?', 3, async (response) => {
    await expect(response).toContainText(/Risposta|Ho trovato/)
    await expect(response).toContainText(/verific.*rispost|rispost.*verific/i)
    await expect(response).toContainText(/fonte indipendente/i)
    await expect(response).toContainText(/informaz|controll/i)
    await expect(response).not.toContainText('Puoi chiedermi cosa contiene')
    await page.screenshot({ path: 'test-results/x3-03-open-answer.png' })
  })

  const previewTitle = 'Esamina e adatta per la classe: x3-responsible-ai'
  await askAndCheck(page, 'Crea un’attività nel Planner da questo documento.', 4, async (response) => {
    await expect(response).toContainText('Anteprima proposta — nessuna scrittura eseguita')
    await expect(response).toContainText(previewTitle)
    await expect(response).toContainText('Destinazione: Planner → Oggi')
    await expect(response).toContainText('Data: da scegliere')
    await expect(response).toContainText('Priorità: Normale, da confermare')
    await expect(response).toContainText(/non modifica il Piano annuale/i)
    await expect(response).toContainText(/non crea un evento nel Calendario/i)
    await page.screenshot({ path: 'test-results/x3-04-write-preview.png' })
  })

  await test.step('Verifica che la richiesta X3 non abbia scritto nel Planner', async () => {
    await page.goto('/planner')
    await expect(page.getByText(previewTitle, { exact: false })).toHaveCount(0)
  })
})

test('X3 Planner gate: real counts, useful answer and no automatic mutation', async ({ page }) => {
  await login(page)
  await page.goto('/planner')

  const stats = page.locator('.humanTaskCompactStats')
  await expect(stats).toBeVisible()
  const beforeText = await stats.innerText()
  const openCount = plannerOpenCount(beforeText)

  const trigger = page.getByRole('button', { name: /Chiedi a DOCENTE OS/ })
  await expect(trigger).toBeVisible({ timeout: 30_000 })
  await trigger.click()

  const panel = page.locator('.dosAssistantPanel.floating.expanded')
  await expect(panel).toBeVisible()
  await expect(panel.locator('.dosAssistantContextStrip')).toContainText(`${openCount} aperte`)

  await askAndCheck(page, 'Cosa devo fare?', 1, async (response) => {
    await expect(response).toContainText('Situazione Planner')
    if (openCount === 0) {
      await expect(response).toContainText(/Non risultano attività attive/i)
    } else {
      await expect(response).toContainText(new RegExp(`${openCount} aperte`, 'i'))
      await expect(response).toContainText(/Da tenere davanti/)
    }
    await expect(response).toContainText(/Non completo, sposto o creo attività automaticamente/i)
    await page.screenshot({ path: 'test-results/x3-05-planner-summary.png' })
  })

  await askAndCheck(page, 'Completa tutte le attività urgenti.', 2, async (response) => {
    await expect(response).toContainText(/implica una modifica del Planner/i)
    await expect(response).toContainText(/Nessuna attività è stata creata, completata, riaperta, spostata o eliminata/i)
    await expect(response).not.toContainText(/ho completato|attività completate/i)
    await page.screenshot({ path: 'test-results/x3-06-planner-write-boundary.png' })
  })

  await page.goto('/planner')
  const afterText = await page.locator('.humanTaskCompactStats').innerText()
  expect(plannerOpenCount(afterText)).toBe(openCount)
})

async function login(page) {
  await test.step('Accede con l’account tecnico isolato in AAL2', async () => {
    await loginE2E(page)
  })
}

async function askAndCheck(page, prompt, expectedAssistantMessages, assertion) {
  const input = page.locator('.dosAssistantInput')
  await input.fill(prompt)
  await page.locator('.dosAssistantSend').click()

  const responses = page.locator('.dosAssistantBubble.assistant')
  await expect(responses).toHaveCount(expectedAssistantMessages)
  await assertion(responses.last())
}

function plannerOpenCount(text) {
  const match = text.match(/(\d+)\s+aperte/i)
  if (!match) throw new Error(`Planner open count not found in: ${text}`)
  return Number(match[1])
}
