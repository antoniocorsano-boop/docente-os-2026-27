import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

test('Progetta collega il libro adottato come supporto secondario nel contesto UDA e sezione', () => {
  const pageSource = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8')

  assert.match(pageSource, /SupabaseTeachingAssignmentReader/)
  assert.match(pageSource, /SupabaseTextbookRepository/)
  assert.match(pageSource, /buildProgettaTextbookSupport/)
  assert.match(pageSource, /Supporto dal libro adottato/)
  assert.match(pageSource, /validatedAlignments:\s*\[\]/)
  assert.match(pageSource, /Nessun riferimento puntuale è ancora verificato per questa UDA/)

  // Exact page ranges must come from validated T4 alignments, never from page-level hard-coding.
  assert.doesNotMatch(pageSource, /pp\.\s*16[–-]18/)
  assert.doesNotMatch(pageSource, /pp\.\s*19[–-]23/)
  assert.doesNotMatch(pageSource, /pp\.\s*24[–-]27/)
  assert.doesNotMatch(pageSource, /pp\.\s*28[–-]31/)
})
