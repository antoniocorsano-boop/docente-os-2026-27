import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

// @trama-feedback-test
test('Knowledge write surfaces expose persistent accessible feedback', () => {
  const indexSource = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8')
  const detailSource = readFileSync(new URL('./[assetId]/page.tsx', import.meta.url), 'utf8')

  assert.match(indexSource, /role="status"/)
  assert.match(indexSource, /knowledgeFeedback/)
  assert.match(detailSource, /role="status"/)
  assert.match(detailSource, /Analisi aggiornata/)
  assert.match(detailSource, /Correzione salvata/)
  assert.match(detailSource, /Non sono riuscito ad aggiornare l’analisi/)
})
