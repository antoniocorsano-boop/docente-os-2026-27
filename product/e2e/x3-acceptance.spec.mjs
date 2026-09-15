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
      await openFileCapture(page)
      const upload = page.locator('input[type="file"][name="file"]')
      await upload.setInputFiles(fixturePath)
      await expect(page.getByText('Pronto a caricare')).toBeVisible()
      const privacyConfirmation = page.getByRole('checkbox', { name: /Confermo che il contenuto.*pilot anonimo/i })
      await expect(privacyConfirmation).toBeVisible()
      await privacyConfirmation.check()
      await expect(privacyConfirmation).toBeChecked()
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
    await expect(response).toContainText(/intelligenza artificiale|IA generativa/i)
    await expect(response).toContainText(/uso responsabile|integrità scolastica|distorsioni/i)
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
    await openPlannerReady(page)
    await expect(page.getByText(previewTitle, { exact: false })).toHaveCount(0)
  })
})

test('X3 Today/Planner gate: day context, useful answer and no automatic mutation', async ({ page }) => {
  await login(page)
  const stats = await openPlannerReady(page)
  const beforeText = await stats.innerText()
  const openCount = plannerOpenCount(beforeText)

  const trigger = page.getByRole('button', { name: /Chiedi a DOCENTE OS/ })
  await expect(trigger).toBeVisible({ timeout: 30_000 })
  await trigger.click()

  const panel = page.locator('.dosAssistantPanel.floating.expanded')
  await expect(panel).toBeVisible()
  const contextStrip = panel.locator('.dosAssistantContextStrip')
  await expect(contextStrip).toContainText(/attività oggi/i)
  await expect(contextStrip).toContainText(/da registrare/i)

  await askAndCheck(page, 'Cosa devo fare?', 1, async (response) => {
    await expect(response).toContainText('Attività Planner')
    await expect(response).toContainText('Lettura corretta')
    await page.screenshot({ path: 'test-results/x3-05-planner-summary.png' })
  })

  await askAndCheck(page, 'Completa tutte le attività urgenti.', 2, async (response) => {
    await expect(response).toContainText(/implica una modifica del Planner/i)
    await expect(response).toContainText(/azione separata e confermata/i)
    await expect(response).toContainText(/Nessuna attività è stata creata, completata, riaperta, spostata o eliminata/i)
    await expect(response).not.toContainText(/ho completato|attività completate/i)
    await page.screenshot({ path: 'test-results/x3-06-planner-write-boundary.png' })
  })

  const afterStats = await openPlannerReady(page)
  const afterText = await afterStats.innerText()
  expect(plannerOpenCount(afterText)).toBe(openCount)
})

async function login(page) {
  await test.step('Accede con l’account tecnico isolato in AAL2', async () => {
    await loginE2E(page)
  })
}

async function openPlannerReady(page) {
  let lastError = null
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      await page.goto('/planner', { waitUntil: 'domcontentloaded', timeout: 30_000 })
      await expect(page).toHaveURL(/\/planner(?:$|\?)/, { timeout: 15_000 })
      await expect(page.locator('#dos-main-content')).toBeVisible({ timeout: 30_000 })
      const stats = page.locator('.humanTaskCompactStats')
      await expect(stats).toBeVisible({ timeout: 30_000 })
      return stats
    } catch (error) {
      lastError = error
      if (attempt === 2) break
      await page.waitForTimeout(500)
    }
  }
  throw lastError ?? new Error('Planner did not become ready')
}

async function openFileCapture(page) {
  await page.goto('/knowledge')
  const capture = page.locator('details.knowledgeCaptureDisclosure')
  await expect(capture).toBeVisible()
  if (await capture.getAttribute('open') === null) await capture.locator(':scope > summary').click()
  await expect(capture).toHaveAttribute('open', '')

  const fileMode = page.getByRole('button', { name: /Carica un file/ })
  await expect(fileMode).toBeVisible()
  await fileMode.click()
  await expect(page.locator('[data-capture-mode-panel="file"]')).toBeVisible()
}

async function askAndCheck(page, prompt, expectedAssistantMessages, assertion) {
  const input = page.locator('.dosAssistantInput')
  await input.fill(prompt)
  await page.getByRole('button', { name: 'Invia domanda', exact: true }).click()

  const responses = page.locator('.dosAssistantBubble.assistant')
  await expect(responses).toHaveCount(expectedAssistantMessages)
  await assertion(responses.last())
}

function plannerOpenCount(text) {
  const match = text.match(/(\d+)\s+aperte/i)
  if (!match) throw new Error(`Planner open count not found in: ${text}`)
  return Number(match[1])
}
