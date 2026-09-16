import assert from 'node:assert/strict'
import test from 'node:test'
import { OpenAiSpeechToText } from './openai-speech-to-text'

test('AI-1C speech adapter: provider non configurato fallisce chiuso', async () => {
  const adapter = new OpenAiSpeechToText(undefined)
  assert.equal(adapter.available, false)

  await assert.rejects(
    () => adapter.transcribe({
      bytes: new Uint8Array([1, 2, 3]),
      mimeType: 'audio/webm',
      filename: 'lesson-note.webm',
      language: 'it',
    }),
    /not configured/,
  )
})

test('AI-1C speech adapter: usa il modello canonico e invia solo audio effimero con metadati minimi', async () => {
  const fetcher = (async (input: RequestInfo | URL, init?: RequestInit) => {
    assert.equal(String(input), 'https://api.openai.com/v1/audio/transcriptions')
    assert.equal(init?.method, 'POST')
    assert.equal((init?.headers as Record<string, string>)?.Authorization, 'Bearer test-key')
    assert.ok(init?.body instanceof FormData)

    const form = init.body as FormData
    assert.deepEqual([...form.keys()].sort(), ['file', 'language', 'model', 'response_format'])
    assert.equal(form.get('model'), 'gpt-4o-mini-transcribe')
    assert.equal(form.get('language'), 'it')
    assert.equal(form.get('response_format'), 'json')

    const file = form.get('file')
    assert.ok(file instanceof File)
    assert.equal(file.name, 'lesson-note.webm')
    assert.equal(file.type, 'audio/webm')
    assert.equal(file.size, 3)

    return new Response(JSON.stringify({ text: '  Abbiamo svolto il sistema tecnologico.  ' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }) as typeof fetch

  const adapter = new OpenAiSpeechToText('test-key', undefined, fetcher, 10_000)
  const result = await adapter.transcribe({
    bytes: new Uint8Array([1, 2, 3]),
    mimeType: 'audio/webm',
    filename: 'lesson-note.webm',
    language: 'it',
  })

  assert.equal(result.transcript, 'Abbiamo svolto il sistema tecnologico.')
  assert.equal(result.model, 'gpt-4o-mini-transcribe')
})

test('AI-1C speech adapter: provider error non produce transcript parziale', async () => {
  const fetcher = (async () => new Response('provider down', { status: 503 })) as typeof fetch
  const adapter = new OpenAiSpeechToText('test-key', 'gpt-4o-mini-transcribe', fetcher, 10_000)

  await assert.rejects(
    () => adapter.transcribe({
      bytes: new Uint8Array([1]),
      mimeType: 'audio/webm',
      filename: 'lesson-note.webm',
      language: 'it',
    }),
    /status 503/,
  )
})
