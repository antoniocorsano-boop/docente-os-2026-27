import assert from 'node:assert/strict'
import test from 'node:test'
import { ClassroomGenerativeSupportService, minimizeClassroomAiContext } from './classroom-generative-support'
import type { AiOrchestratorPort, ClassroomAiContext } from './ports/ai-orchestrator'

test('minimizes classroom context before it reaches the AI boundary', () => {
  const context = minimizeClassroomAiContext({
    lessonTitle: '  Leggo la tecnologia come sistema  ',
    stepTitle: 'Ingresso, processo, uscita',
    instruction: '  Individua cosa entra, cosa accade e cosa otteniamo. ',
    cue: 'Non confondere uscita utile e perdite.',
    localHint: 'Un sistema riceve qualcosa e la trasforma.',
    visualBrief: 'Schema ingresso → processo → uscita.',
    studentName: 'NON DEVE PASSARE',
    studentEmail: 'non-deve-passare@example.invalid',
    rawClassroomNotes: ['NON DEVONO PASSARE'],
  })

  assert.deepEqual(Object.keys(context).sort(), [
    'cue', 'instruction', 'lessonTitle', 'localHint', 'stepTitle', 'visualBrief',
  ].sort())
  assert.equal(JSON.stringify(context).includes('NON DEVE PASSARE'), false)
  assert.equal(JSON.stringify(context).includes('example.invalid'), false)
})

test('text generation stays a proposal and receives only minimized context', async () => {
  let received: ClassroomAiContext | null = null
  const service = new ClassroomGenerativeSupportService(fakeOrchestrator({
    onText: (context) => { received = context },
  }))

  const proposal = await service.proposeText({
    lessonTitle: 'Sistemi tecnologici',
    stepTitle: 'Controllo',
    instruction: 'Riconosci il controllo del sistema.',
    localHint: 'Il controllo regola il funzionamento.',
    privateObservation: 'NON INVIARE',
  }, 'EXAMPLE')

  assert.equal(proposal.status, 'PROPOSED')
  assert.equal(proposal.capability, 'CLASSROOM_TEXT_PROPOSE')
  assert.equal(proposal.text, 'Esempio alternativo proposto')
  assert.ok(received)
  assert.equal(JSON.stringify(received).includes('NON INVIARE'), false)
})

test('image generation requires a grounded visual brief and remains proposed', async () => {
  const service = new ClassroomGenerativeSupportService(fakeOrchestrator())

  await assert.rejects(
    service.proposeImage({
      lessonTitle: 'Sistemi tecnologici',
      stepTitle: 'Schema',
      instruction: 'Rappresenta il sistema.',
    }),
    /visual brief/i,
  )

  const proposal = await service.proposeImage({
    lessonTitle: 'Sistemi tecnologici',
    stepTitle: 'Schema',
    instruction: 'Rappresenta il sistema.',
    visualBrief: 'Schema semplice ingresso → processo → uscita.',
  })
  assert.equal(proposal.status, 'PROPOSED')
  assert.equal(proposal.capability, 'CLASSROOM_IMAGE_GENERATE')
  assert.equal(proposal.mimeType, 'image/jpeg')
})

function fakeOrchestrator(options: { onText?: (context: ClassroomAiContext) => void } = {}): AiOrchestratorPort {
  return {
    async proposeClassroomText({ context }) {
      options.onText?.(context)
      return {
        capability: 'CLASSROOM_TEXT_PROPOSE',
        status: 'PROPOSED',
        text: 'Esempio alternativo proposto',
        provider: 'test',
        model: 'test-text',
      }
    },
    async proposeClassroomImage() {
      return {
        capability: 'CLASSROOM_IMAGE_GENERATE',
        status: 'PROPOSED',
        mimeType: 'image/jpeg',
        base64: 'ZmFrZQ==',
        altText: 'Schema didattico proposto',
        provider: 'test',
        model: 'test-image',
      }
    },
  }
}
