import fs from 'node:fs/promises'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import { loginE2E, requireE2ECredentials } from '../support/e2e-auth.mjs'

requireE2ECredentials()

const outputRoot = process.env.EXPERIENCE_OUTPUT_DIR ?? 'test-results/experience'

test('Journey: Lezione → detta → preview Copilota → Fatto senza modello interno', async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    const stream = {
      getTracks() {
        return [{ stop() {} }]
      },
    }
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        async getUserMedia() {
          return stream
        },
      },
    })

    class FakeMediaRecorder {
      static isTypeSupported(value) {
        return String(value).startsWith('audio/webm')
      }

      constructor(inputStream, options = {}) {
        this.stream = inputStream
        this.mimeType = options.mimeType || 'audio/webm'
        this.state = 'inactive'
        this.ondataavailable = null
        this.onstop = null
      }

      start() {
        this.state = 'recording'
      }

      stop() {
        this.state = 'inactive'
        const data = new Blob(['voice-bytes'], { type: this.mimeType })
        queueMicrotask(() => {
          this.ondataavailable?.({ data })
          this.onstop?.()
        })
      }
    }

    Object.defineProperty(window, 'MediaRecorder', {
      configurable: true,
      value: FakeMediaRecorder,
    })
  })

  await loginE2E(page)
  await page.goto('/classi')

  const classCard = page.locator('a.canonicalClassCard').filter({ hasText: /2ª\s*A/i }).first()
  await expect(classCard, 'La fixture HVA deve avere una 2ª A utilizzabile.').toBeVisible()
  const classHref = await classCard.getAttribute('href')
  const sectionId = sectionIdFromHref(classHref)

  await page.goto(`/classi/${encodeURIComponent(sectionId)}/lezioni/B01?mode=record`)

  const closeCard = page.locator('form').filter({ hasText: 'Conferma ciò che hai svolto' }).first()
  await expect(closeCard).toBeVisible()
  await expect(closeCard).toContainText('Data della lezione')
  await expect(closeCard).toContainText('Minuti effettivi')
  await expect(closeCard).toContainText('Cosa succede quando registri')
  await expect(closeCard).toContainText('Il percorso annuale non viene segnato automaticamente come completato')

  await expect(closeCard, 'Il presenter docente non deve esporre il Product Model.').not.toContainText(/TeachingSession|AnnualPlanBlockProgress|EvidenceReference|Piano annuale:\s|attribuisce i minuti a B01/)

  const primaryAction = closeCard.getByRole('button', { name: 'Registra e torna alla classe' })
  await expect(primaryAction, 'UX-0D richiede una sola CTA primaria visibile.').toHaveCount(1)
  await expect(primaryAction).toBeVisible()

  const voiceRequests = []
  const copilotRequests = []
  const unexpectedMutationRequests = []
  page.on('request', (request) => {
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method())) return
    const url = new URL(request.url())
    if (request.method() === 'POST' && url.pathname === '/api/voice/transcribe') {
      voiceRequests.push(request)
      return
    }
    if (request.method() === 'POST' && url.pathname === '/api/copilot') {
      copilotRequests.push(request)
      return
    }
    unexpectedMutationRequests.push(`${request.method()} ${url.pathname}`)
  })

  await page.route('**/api/voice/transcribe', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        text: 'Abbiamo svolto la misura. La prossima lezione riprendere gli errori. Preparare una scheda guidata.',
        ephemeral: true,
      }),
    })
  })

  const evidenceNote = closeCard.locator('textarea[name="evidenceNote"]')
  const nextActivity = closeCard.locator('textarea[name="nextActivity"]')
  await expect(evidenceNote).toHaveValue('')
  await expect(nextActivity).toHaveValue('')

  const dictate = closeCard.getByRole('button', { name: 'Detta la lezione' })
  await expect(dictate).toBeVisible()
  await dictate.click()
  const stopDictation = closeCard.getByRole('button', { name: 'Termina dettatura' })
  await expect(stopDictation).toBeVisible()
  await expect(primaryAction, 'Durante la cattura non deve essere possibile registrare un testo incompleto.').toBeDisabled()
  await stopDictation.click()

  await expect(evidenceNote).toHaveValue('Abbiamo svolto la misura. La prossima lezione riprendere gli errori. Preparare una scheda guidata.')
  await expect(closeCard.getByRole('status')).toContainText('Trascrizione pronta')
  await expect(primaryAction).toBeEnabled()
  expect(voiceRequests, 'La dettatura deve produrre una sola richiesta effimera STT.').toHaveLength(1)
  const voiceRequest = voiceRequests[0]
  expect(voiceRequest.headers()['content-type']).toMatch(/^multipart\/form-data; boundary=/)
  expect(voiceRequest.headers()['x-docente-surface-path']).toContain('?mode=record')
  const voiceBody = voiceRequest.postData() ?? ''
  expect(voiceBody).toContain('name="audio"')
  expect(voiceBody).toContain('name="durationMs"')
  expect(voiceBody).not.toContain(sectionId)
  expect(voiceBody).not.toContain('B01')
  expect(unexpectedMutationRequests, 'La dettatura non deve produrre write persistenti.').toEqual([])

  const organize = closeCard.getByRole('button', { name: 'Organizza con il Copilota' })
  await expect(organize).toBeVisible()
  const copilotResponsePromise = page.waitForResponse((response) => {
    const url = new URL(response.url())
    return response.request().method() === 'POST' && url.pathname === '/api/copilot'
  })
  await organize.click()
  const copilotResponse = await copilotResponsePromise
  const copilotResponseText = await copilotResponse.text()
  expect(
    copilotResponse.status(),
    `La frontdoor Copilot deve accettare la nota dalla superficie Registra. Risposta: ${copilotResponseText}`,
  ).toBe(200)
  const copilotPayload = parseJson(copilotResponseText)
  expect(copilotPayload, `La frontdoor Copilot deve restituire JSON valido. Risposta: ${copilotResponseText}`).toMatchObject({
    skillId: 'LESSON_REFLECTION',
    status: 'SUPPORTED',
    actionKind: 'PROPOSE',
    persistentEffect: 'NONE',
    confirmationRequiredForPersistence: true,
  })

  const preview = closeCard.getByRole('region', { name: 'Proposta del Copilota' })
  await expect(preview).toBeVisible()
  await expect(preview).toContainText('PROPOSTA DEL COPILOTA · NON SALVATA')
  await expect(preview).toContainText('Ciò che è stato svolto')
  await expect(preview).toContainText('Da riprendere')
  await expect(preview).toContainText('Da preparare')
  await expect(preview).toContainText('La registrazione avviene esclusivamente con “Registra e torna alla classe”')
  await expect(preview).not.toContainText(/EXPLICIT_TARGET|LESSON_PROJECTION|section-|projection-/)
  await expect(nextActivity, 'La preview non deve applicarsi automaticamente ai campi.').toHaveValue('')

  expect(copilotRequests, 'L’organizzazione deve usare esattamente una chiamata alla frontdoor canonica.').toHaveLength(1)
  const copilotBody = copilotRequests[0].postDataJSON()
  expect(Object.keys(copilotBody)).toEqual(['prompt'])
  expect(copilotBody.prompt).toContain('Organizza questa nota di fine lezione:')
  expect(copilotBody.prompt).not.toContain(sectionId)
  expect(copilotBody.prompt).not.toContain('B01')
  expect(copilotBody.prompt).not.toContain('projection')
  expect(unexpectedMutationRequests, 'Voce e Copilota non devono produrre write prima della conferma docente.').toEqual([])

  await preview.getByRole('button', { name: 'Usa come prossima attività' }).click()
  await expect(nextActivity).toHaveValue(/La prossima lezione riprendere gli errori\./)
  await expect(nextActivity).toHaveValue(/Preparare una scheda guidata\./)
  await expect(page).toHaveURL(new RegExp(`/classi/${escapeRegExp(encodeURIComponent(sectionId))}/lezioni/B01\\?mode=record`))
  expect(copilotRequests).toHaveLength(1)
  expect(unexpectedMutationRequests, 'Applicare la proposta deve restare uno stato locale fino alla CTA primaria.').toEqual([])
  await expect(primaryAction).toBeVisible()

  const beforeRegister = closeCard.locator('details').filter({ hasText: 'Prima di registrare' }).first()
  await expect(beforeRegister).toBeVisible()
  await expect(beforeRegister).not.toHaveAttribute('open', '')
  await expect(beforeRegister.getByRole('link', { name: 'Rivedi le osservazioni' })).toBeHidden()
  await expect(beforeRegister.getByRole('link', { name: 'Torna alla guida della lezione' })).toBeHidden()

  await beforeRegister.locator('summary').click()
  await expect(beforeRegister.getByRole('link', { name: 'Rivedi le osservazioni' })).toBeVisible()
  await expect(beforeRegister.getByRole('link', { name: 'Torna alla guida della lezione' })).toBeVisible()

  const geometry = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
  }))
  expect(geometry.document, 'Registra non deve produrre overflow orizzontale.').toBeLessThanOrEqual(geometry.viewport)

  await screenshot(page, testInfo, 'lesson-close-contextual-voice-preview')
  await recordJourney(testInfo.project.name, {
    status: 'PASS',
    note: 'La dettatura resta un input effimero della stessa nota; il transcript è modificabile, il Copilota propone senza write e la sola CTA persistente resta Registra e torna alla classe.',
  })
})

async function screenshot(page, testInfo, name) {
  const dir = path.join(outputRoot, 'screenshots')
  await fs.mkdir(dir, { recursive: true })
  await page.screenshot({ path: path.join(dir, `${safe(testInfo.project.name)}--journey-${safe(name)}.png`), fullPage: true })
}

async function recordJourney(project, result) {
  const dir = path.join(outputRoot, 'journeys')
  await fs.mkdir(dir, { recursive: true })
  const payload = {
    schemaVersion: 1,
    id: 'lesson-close-contextual-voice-preview',
    label: 'Lezione → detta → preview Copilota → Fatto senza modello interno',
    project,
    status: result.status,
    note: result.note,
    capturedAt: new Date().toISOString(),
  }
  await fs.writeFile(path.join(dir, `${safe(project)}--lesson-close-contextual-voice-preview.json`), `${JSON.stringify(payload, null, 2)}\n`)
}

function parseJson(value) {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function sectionIdFromHref(value) {
  const match = typeof value === 'string' ? value.match(/^\/classi\/([^/?#]+)$/) : null
  if (!match) throw new Error(`Section id not found in class href: ${value}`)
  return decodeURIComponent(match[1])
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function safe(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9_-]+/g, '-')
}
