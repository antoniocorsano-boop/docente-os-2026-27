import assert from 'node:assert/strict'
import test from 'node:test'
import { OpenAiSpeechToText } from './openai-speech-to-text'

test('OpenAiSpeechToText sends only ephemeral audio + model + language to the transcription endpoint', async () => {
  let calledUrl = ''
  let calledInit: RequestInit | undefined
  const fetcher: typeof fetch = async (input, init) => {
    calledUrl = String(input)
    calledInit = init
    return new Response(JSON.stringify({ text: 'Abbiamo svolto la misura e riprenderemo gli errori.' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const adapter = new OpenAiSpeechToText('test-key', 'gpt-4o-mini-transcribe', fetcher, 5000)
  const result = await adapter.transcribe({
    audio: new Blob(['voice-bytes'], { type: 'audio/webm' }),
    filename: 'lesson-note.webm',
    mimeType: 'audio/webm',
    language: 'it',
  })

  assert.equal(calledUrl, 'https://api.openai.com/v1/audio/transcriptions')
  assert.equal(calledInit?.method, 'POST')
  assert.equal((calledInit?.headers as Record<string, string>).Authorization, 'Bearer test-key')
  assert.ok(calledInit?.body instanceof FormData)
  const form = calledInit.body as FormData
  assert.equal(form.get('model'), 'gpt-4o-mini-transcribe')
  assert.equal(form.get('language'), 'it')
  assert.ok(form.get('file') instanceof Blob)
  assert.deepEqual(result, {
    text: 'Abbiamo svolto la misura e riprenderemo gli errori.',
    provider: 'OPENAI',
    model: 'gpt-4o-mini-transcribe',
  })
})

test('OpenAiSpeechToText fails closed when provider is unavailable or returns no transcript', async () => {
  const unavailable = new OpenAiSpeechToText(undefined, 'gpt-4o-mini-transcribe', fetch)
  assert.equal(unavailable.available, false)
  await assert.rejects(
    () => unavailable.transcribe({
      audio: new Blob(['voice'], { type: 'audio/webm' }),
      filename: 'lesson-note.webm',
      mimeType: 'audio/webm',
      language: 'it',
    }),
    /not configured/,
  )

  const emptyFetcher: typeof fetch = async () => new Response(JSON.stringify({ text: '   ' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
  const empty = new OpenAiSpeechToText('test-key', 'gpt-4o-mini-transcribe', emptyFetcher, 5000)
  await assert.rejects(
    () => empty.transcribe({
      audio: new Blob(['voice'], { type: 'audio/webm' }),
      filename: 'lesson-note.webm',
      mimeType: 'audio/webm',
      language: 'it',
    }),
    /no transcript/,
  )
})
