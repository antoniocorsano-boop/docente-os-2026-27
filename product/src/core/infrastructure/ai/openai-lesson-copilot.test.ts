import assert from 'node:assert/strict'
import test from 'node:test'
import { OpenAiLessonCopilot } from './openai-lesson-copilot'
import type { LessonCopilotContext } from '@/core/presentation/teacher-copilot-context'

const context: LessonCopilotContext = {
  surface: 'LESSON',
  workspaceId: 'workspace-secret-id',
  academicYearId: 'year-secret-id',
  discipline: 'Tecnologia',
  classLabel: '2ª C',
  object: {
    type: 'LESSON_PROJECTION',
    id: 'section-secret-id:B01:projection-secret-id',
    title: 'L’agricoltura come sistema tecnologico',
    state: 'PIANIFICATO',
  },
  provenance: [
    { kind: 'PLAN', ref: 'CAN-PLAN-2', label: 'Piano annuale classe seconda' },
    { kind: 'UDA', ref: 'CAN-UDA-2-01', label: 'UDA agricoltura' },
  ],
  availableCapabilities: ['LESSON_EXPLAIN_CONTEXT', 'LESSON_SUGGEST_PREPARATION'],
  forbiddenCapabilities: ['PLAN_COMPLETE_BLOCK', 'DRIVE_WRITE'],
  missingInformation: [],
  lesson: {
    sectionId: 'section-secret-id',
    sectionLabel: '2ª C',
    blockId: 'B01',
    projectionId: 'projection-secret-id',
    title: 'L’agricoltura come sistema tecnologico',
    objective: 'Riconoscere input, processo e output in un sistema agricolo.',
    durationMinutes: 60,
    udaTitle: 'Agricoltura, suolo e produzioni sostenibili',
    progressStatus: 'PIANIFICATO',
    preparationPreview: ['Immagine di un paesaggio agricolo.', 'Lavagna o LIM.'],
    remainingPreparationCount: 1,
    readyTitles: ['EXTENSION-FREE-TEXT-SECRET'],
    readyCount: 1,
    statusLabel: 'READY_BASE',
  },
}

function providerResponse() {
  return new Response(JSON.stringify({
    output_text: JSON.stringify({
      actionKind: 'PROPOSE',
      answerStatus: 'SUPPORTED',
      text: '**Ho trovato**\nLa lezione riguarda un sistema agricolo.\n\n**Ti propongo**\nPrepara l’immagine e usa il brief disponibile.',
      evidenceRefs: ['CAN-PLAN-2'],
    }),
  }), { status: 200, headers: { 'Content-Type': 'application/json' } })
}

test('provider request sends only minimized lesson context and no internal or free-form identifiers', async () => {
  let requestBody = ''
  const fetcher: typeof fetch = async (_input, init) => {
    requestBody = String(init?.body ?? '')
    return providerResponse()
  }

  const copilot = new OpenAiLessonCopilot('test-key', 'test-model', fetcher)
  const response = await copilot.respond({ context, prompt: 'Cosa devo preparare?' })

  assert.equal(response.actionKind, 'PROPOSE')
  assert.match(requestBody, /2ª C/)
  assert.match(requestBody, /CAN-PLAN-2/)
  assert.doesNotMatch(requestBody, /workspace-secret-id/)
  assert.doesNotMatch(requestBody, /year-secret-id/)
  assert.doesNotMatch(requestBody, /section-secret-id/)
  assert.doesNotMatch(requestBody, /projection-secret-id/)
  assert.doesNotMatch(requestBody, /EXTENSION-FREE-TEXT-SECRET/)
})

test('contact identifiers in a prompt are redacted before provider transport', async () => {
  let requestBody = ''
  const fetcher: typeof fetch = async (_input, init) => {
    requestBody = String(init?.body ?? '')
    return providerResponse()
  }
  const copilot = new OpenAiLessonCopilot('test-key', 'test-model', fetcher)

  await copilot.respond({ context, prompt: 'Fammi un riepilogo e mandalo a docente@example.com' })

  assert.doesNotMatch(requestBody, /docente@example\.com/)
  assert.match(requestBody, /dato di contatto rimosso/)
})

test('named student data is blocked before any provider network call', async () => {
  let called = false
  const fetcher: typeof fetch = async () => {
    called = true
    return providerResponse()
  }
  const copilot = new OpenAiLessonCopilot('test-key', 'test-model', fetcher)

  await assert.rejects(
    () => copilot.respond({ context, prompt: 'L’alunno Mario Rossi non ha capito la lezione: cosa faccio?' }),
    (error: Error) => {
      assert.equal(error.name, 'CopilotPrivacyBoundaryError')
      assert.match(error.message, /privacy boundary/)
      return true
    },
  )
  assert.equal(called, false)
})

test('provider response cannot cite evidence outside the authoritative context', async () => {
  const fetcher: typeof fetch = async () => new Response(JSON.stringify({
    output_text: JSON.stringify({
      actionKind: 'READ_ONLY',
      answerStatus: 'SUPPORTED',
      text: 'Questa risposta è abbastanza lunga ma cita una fonte che non appartiene al contesto autorevole della lezione.',
      evidenceRefs: ['INVENTED-SOURCE'],
    }),
  }), { status: 200, headers: { 'Content-Type': 'application/json' } })

  const copilot = new OpenAiLessonCopilot('test-key', 'test-model', fetcher)
  await assert.rejects(
    () => copilot.respond({ context, prompt: 'Spiegami la lezione' }),
    /violated contract.*INVENTED-SOURCE/,
  )
})

test('provider transport failure exposes only status and never echoes provider body', async () => {
  const fetcher: typeof fetch = async () => new Response('provider secret diagnostic payload', { status: 503 })
  const copilot = new OpenAiLessonCopilot('test-key', 'test-model', fetcher)

  await assert.rejects(
    () => copilot.respond({ context, prompt: 'Cosa devo preparare?' }),
    (error: Error) => {
      assert.match(error.message, /status 503/)
      assert.doesNotMatch(error.message, /secret diagnostic/)
      return true
    },
  )
})

test('missing provider configuration fails closed before network access', async () => {
  let called = false
  const fetcher: typeof fetch = async () => {
    called = true
    return new Response('{}', { status: 200 })
  }
  const copilot = new OpenAiLessonCopilot(undefined, 'test-model', fetcher)

  await assert.rejects(
    () => copilot.respond({ context, prompt: 'Cosa devo preparare?' }),
    /not configured/,
  )
  assert.equal(called, false)
})
