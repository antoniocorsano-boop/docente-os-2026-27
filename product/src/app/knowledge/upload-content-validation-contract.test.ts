import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

function source(relativeUrl: string) {
  return fs.readFileSync(new URL(relativeUrl, import.meta.url), 'utf8')
}

function expectOrdered(text: string, markers: string[], label: string) {
  let previous = -1
  for (const marker of markers) {
    const index = text.indexOf(marker)
    assert.notEqual(index, -1, `${label}: missing ${marker}`)
    assert.ok(index > previous, `${label}: ${marker} must occur after the previous security step`)
    previous = index
  }
}

test('legacy server action validates content before direct Storage upload', () => {
  const text = source('./actions.ts')
  expectOrdered(text, [
    'const contentValidation = await validateKnowledgeUploadContent',
    'supabase.storage.from(KNOWLEDGE_BUCKET).upload',
  ], 'server action')
})

test('same-origin API validates content before privacy processing and Storage upload', () => {
  const text = source('../api/knowledge/upload/route.ts')
  expectOrdered(text, [
    'const contentValidation = await validateKnowledgeUploadContent',
    'const preflight = await inspectBinaryForAnonymousPilot',
    'supabase.storage.from(KNOWLEDGE_BUCKET).upload',
  ], 'same-origin API')
})

test('finalizer re-reads and validates stored bytes before canonical KB ingestion', () => {
  const text = source('./upload-actions.ts')
  expectOrdered(text, [
    '.download(input.objectPath)',
    'await validateKnowledgeUploadContent',
    'const repository = new SupabaseKnowledgeRepository()',
    'const asset = await ingestion.ingest',
  ], 'stored-upload finalizer')
  assert.match(text, /\.remove\(\[input\.objectPath\]\)/, 'rejected stored uploads must be removed fail-closed')
  assert.match(text, /contentTypeValidation: 'SERVER_VERIFIED_BEFORE_KB_INGESTION'/, 'accepted assets must retain verification provenance')
})
