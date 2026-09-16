import fs from 'node:fs/promises'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import { loginE2E, requireE2ECredentials } from '../support/e2e-auth.mjs'

requireE2ECredentials()

const outputRoot = process.env.EXPERIENCE_OUTPUT_DIR ?? 'test-results/experience'

test('Journey: Lezione → Registra → dettatura effimera → transcript modificabile', async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    const fakeTrack = { stop() {} }
    const fakeStream = { getTracks: () => [fakeTrack] }

    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: async () => fakeStream,
      },
    })

    class MockMediaRecorder extends EventTarget {
      static isTypeSupported() { return true }

      constructor(stream, options = {}) {
        super()
        this.stream = stream
        this.mimeType = options.mimeType || 'audio/webm'
        this.state = 'inactive'
      }

      start() {
        this.state = 'recording'
      }

      stop() {
        if (this.state === 'inactive') return
        this.state = 'inactive'
        const dataEvent = new Event('dataavailable')
        Object.defineProperty(dataEvent, 'data', {
          value: new Blob(['voice-fixture'], { type: this.mimeType }),
        })
        this.dispatchEvent(dataEvent)
        this.dispatchEvent(new Event('stop'))
      }
    }

    Object.defineProperty(window, 'MediaRecorder', {
      configurable: true,
      value: MockMediaRecorder,
    })
  })

  const voiceRequests = []
  const copilotRequests = []
  const unexpectedMutationRequests = []

  await page.route('**/api/voice/transcribe', async (route) => {
    const request = route.request()
    if (request.method() !== 'POST') return route.continue()
    voiceRequests.push(request)
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'Cache-Control': 'private, no-store' },
      body: JSON.stringify({
        transcript: 'Abbiamo svolto la misura. La prossima lezione riprendere gli errori. Preparare una scheda guidata.',
        sourceKind: 'EPHEMERAL_TRANSCRIPT',
      }),
    })
  })

  page.on('request', (request) => {
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method())) return
    const url = new URL(request.url())
    if (request.method() === 'POST' && url.pathname === '/api/voice/transcribe') return
    if (request.method() === 'POST' && url.pathname === '/api/copilot') {
      copilotRequests.push(request)
      return
    }
    unexpectedMutationRequests.push(`${request.method()} ${url.pathname}`)
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

  const evidenceNote = closeCard.locator('textarea[name="evidenceNote"]')
  const primaryAction = closeCard.getByRole('button', { name: 'Registra e torna alla classe' })
  const dictate = closeCard.getByRole('button', { name: 'Detta con il microfono' })

  await expect(dictate).toBeVisible()
  await expect(evidenceNote).toHaveValue('')
  await dictate.click()
  await expect(closeCard.getByRole('button', { name: 'Interrompi dettatura' })).toBeVisible()
  await expect(closeCard).toContainText('Sto ascoltando. Interrompi quando hai finito.')
  await expect(primaryAction).toBeDisabled()

  await evidenceNote.fill('Nota scritta dal docente mentre il microfono è attivo.')
  await closeCard.getByRole('button', { name: 'Interrompi dettatura' }).click()
  await expect(evidenceNote).toHaveValue(
    'Nota scritta dal docente mentre il microfono è attivo.\nAbbiamo svolto la misura. La prossima lezione riprendere gli errori. Preparare una scheda guidata.',
  )
  await expect(primaryAction).toBeEnabled()

  expect(voiceRequests, 'La dettatura deve usare una sola chiamata al boundary voce effimero.').toHaveLength(1)
  const voiceRequest = voiceRequests[0]
  expect(voiceRequest.headers()['content-type'] ?? '').toContain('multipart/form-data')
  const voiceBody = voiceRequest.postDataBuffer()?.toString('utf8') ?? ''
  expect(voiceBody).not.toContain(sectionId)
  expect(voiceBody).not.toContain('B01')
  expect(voiceBody).not.toContain('projection')
  expect(unexpectedMutationRequests, 'La dettatura non deve produrre write canoniche.').toEqual([])

  const organize = closeCard.getByRole('button', { name: 'Organizza con il Copilota' })
  await organize.click()

  const preview = closeCard.getByRole('region', { name: 'Proposta del Copilota' })
  await expect(preview).toBeVisible()
  expect(copilotRequests).toHaveLength(1)
  const copilotBody = copilotRequests[0].postDataJSON()
  expect(Object.keys(copilotBody)).toEqual(['prompt'])
  expect(copilotBody.prompt).toContain('Organizza questa trascrizione di fine lezione:')
  expect(copilotBody.prompt).toContain('Nota scritta dal docente mentre il microfono è attivo.')
  expect(copilotBody.prompt).not.toContain(sectionId)
  expect(copilotBody.prompt).not.toContain('B01')
  expect(unexpectedMutationRequests, 'Voce + preview devono restare senza write fino alla CTA primaria.').toEqual([])

  await evidenceNote.fill(`${await evidenceNote.inputValue()} Modificata dal docente.`)
  await expect(evidenceNote).toHaveValue(/Modificata dal docente\.$/)
  await expect(primaryAction).toBeEnabled()

  const geometry = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
  }))
  expect(geometry.document, 'La dettatura non deve produrre overflow orizzontale.').toBeLessThanOrEqual(geometry.viewport)

  await screenshot(page, testInfo, 'lesson-close-contextual-voice')
  await recordJourney(testInfo.project.name, {
    status: 'PASS',
    note: 'Il microfono è un input secondario: audio effimero, transcript aggiunto alla nota più recente e modificabile, preview senza write e CTA primaria invariata.',
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
    id: 'lesson-close-contextual-voice',
    label: 'Lezione → Registra → dettatura effimera → transcript modificabile',
    project,
    status: result.status,
    note: result.note,
    capturedAt: new Date().toISOString(),
  }
  await fs.writeFile(path.join(dir, `${safe(project)}--lesson-close-contextual-voice.json`), `${JSON.stringify(payload, null, 2)}\n`)
}

function sectionIdFromHref(value) {
  const match = typeof value === 'string' ? value.match(/^\/classi\/([^/?#]+)$/) : null
  if (!match) throw new Error(`Section id not found in class href: ${value}`)
  return decodeURIComponent(match[1])
}

function safe(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9_-]+/g, '-')
}
