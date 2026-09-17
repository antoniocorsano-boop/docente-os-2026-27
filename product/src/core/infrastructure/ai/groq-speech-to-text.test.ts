import assert from 'node:assert/strict'
import test from 'node:test'
import { GroqSpeechToText } from './groq-speech-to-text'

test('GroqSpeechToText sends only ephemeral audio + model + language to the transcription endpoint', async () => {
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

  const adapter = new GroqSpeechToText('test-key', 'whisper-large-v3-turbo', fetcher, 5000)
  const result = await adapter.transcribe({
    audio: new Blob(['voice-bytes'], { type: 'audio/webm' }),
    filename: 'lesson-note.webm',
    mimeType: 'audio/webm',
    language: 'it',
  })

  assert.equal(calledUrl, 'https://api.groq.com/openai/v1/audio/transcriptions')
  assert.equal(calledInit?.method, 'POST')
  assert.equal((calledInit?.headers as Record<string, string>).Authorization, 'Bearer test-key')
  assert.ok(calledInit?.body instanceof FormData)
  const form = calledInit.body as FormData
  assert.equal(form.get('model'), 'whisper-large-v3-turbo')
  assert.equal(form.get('language'), 'it')
  assert.ok(form.get('file') instanceof Blob)
  assert.deepEqual(result, {
    text: 'Abbiamo svolto la misura e riprenderemo gli errori.',
    provider: 'GROQ',
    model: 'whisper-large-v3-turbo',
  })
})

test('GroqSpeechToText ignores OpenAI credentials without a Groq STT-specific key', () => {
  const previousOpenAi = process.env.OPENAI_API_KEY
  const previousOpenAiStt = process.env.OPENAI_STT_API_KEY
  const previousGroq = process.env.GROQ_STT_API_KEY

  try {
    process.env.OPENAI_API_KEY = 'shared-openai-key'
    process.env.OPENAI_STT_API_KEY = 'legacy-openai-stt-key'
    delete process.env.GROQ_STT_API_KEY

    const isolated = new GroqSpeechToText()
    assert.equal(isolated.available, false)
  } finally {
    if (previousOpenAi === undefined) delete process.env.OPENAI_API_KEY
    else process.env.OPENAI_API_KEY = previousOpenAi

    if (previousOpenAiStt === undefined) delete process.env.OPENAI_STT_API_KEY
    else process.env.OPENAI_STT_API_KEY = previousOpenAiStt

    if (previousGroq === undefined) delete process.env.GROQ_STT_API_KEY
    else process.env.GROQ_STT_API_KEY = previousGroq
  }
})

test('GroqSpeechToText fails closed when provider is unavailable or returns no transcript', async () => {
  const unavailable = new GroqSpeechToText(undefined, 'whisper-large-v3-turbo', fetch)
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
  const empty = new GroqSpeechToText('test-key', 'whisper-large-v3-turbo', emptyFetcher, 5000)
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
