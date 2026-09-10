import assert from 'node:assert/strict'
import test from 'node:test'
import { AiProviderUnavailableError, type ClassroomAiContext } from '@/core/application/ports/ai-orchestrator'
import { OpenAiAiOrchestrator, classroomImagePrompt, classroomTextPrompt } from './openai-ai-orchestrator'

const context: ClassroomAiContext = {
  lessonTitle: 'Leggo la tecnologia come sistema',
  stepTitle: 'Ingresso, processo, uscita',
  instruction: 'Individua ciò che entra, ciò che accade e il risultato utile.',
  cue: 'Distingui risultato utile e perdite.',
  localHint: 'Un sistema riceve qualcosa e lo trasforma.',
  visualBrief: 'Schema ingresso → processo → uscita con frecce e tre blocchi.',
}

test('text adapter uses Responses API and returns a non-persistent proposal', async () => {
  const calls: Array<{ url: string; body: Record<string, unknown> }> = []
  const fetcher = async (input: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(input), body: JSON.parse(String(init?.body)) as Record<string, unknown> })
    return new Response(JSON.stringify({ output_text: 'Usa una lampada: energia entra, la lampada la trasforma e ottieni luce.' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  const adapter = new OpenAiAiOrchestrator('test-key', 'test-text', 'test-image', fetcher as typeof fetch)
  const proposal = await adapter.proposeClassroomText({ kind: 'EXAMPLE', context })

  assert.equal(calls[0]?.url, 'https://api.openai.com/v1/responses')
  assert.equal(calls[0]?.body.model, 'test-text')
  assert.equal(proposal.status, 'PROPOSED')
  assert.equal(proposal.capability, 'CLASSROOM_TEXT_PROPOSE')
  assert.equal(proposal.provider, 'OpenAI')
  assert.match(proposal.text, /lampada/i)
})

test('image adapter uses the Image API with a fast classroom profile', async () => {
  const calls: Array<{ url: string; body: Record<string, unknown> }> = []
  const fetcher = async (input: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(input), body: JSON.parse(String(init?.body)) as Record<string, unknown> })
    return new Response(JSON.stringify({ data: [{ b64_json: 'ZmFrZS1pbWFnZQ==' }] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  const adapter = new OpenAiAiOrchestrator('test-key', 'test-text', 'gpt-image-2.5-flare', fetcher as typeof fetch)
  const proposal = await adapter.proposeClassroomImage({ context })

  assert.equal(calls[0]?.url, 'https://api.openai.com/v1/images/generations')
  assert.equal(calls[0]?.body.model, 'gpt-image-2.5-flare')
  assert.equal(calls[0]?.body.size, '1536x1024')
  assert.equal(calls[0]?.body.quality, 'low')
  assert.equal(calls[0]?.body.output_format, 'jpeg')
  assert.equal(proposal.status, 'PROPOSED')
  assert.equal(proposal.mimeType, 'image/jpeg')
  assert.equal(proposal.base64, 'ZmFrZS1pbWFnZQ==')
})

test('adapter fails closed when no provider credential is configured', async () => {
  const adapter = new OpenAiAiOrchestrator(undefined, 'test-text', 'test-image', (async () => {
    throw new Error('network must not be called')
  }) as typeof fetch)
  await assert.rejects(adapter.proposeClassroomText({ kind: 'SIMPLER', context }), AiProviderUnavailableError)
  await assert.rejects(adapter.proposeClassroomImage({ context }), AiProviderUnavailableError)
})

test('prompts stay didactic, scoped and proposal-oriented', () => {
  const text = classroomTextPrompt('CHECK', context)
  const image = classroomImagePrompt(context)
  assert.match(text, /PROPOSTA/)
  assert.match(text, /non aggiungere dati sugli alunni/i)
  assert.match(image, /Brief visuale verificato dal docente/i)
  assert.match(image, /Evita persone identificabili/i)
})
