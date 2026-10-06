import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

// @trama-feedback-test
// Design impact: COMPATIBLE — evidence-only binding to existing UI feedback.
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

// Regression for the Android Share Target PDF failure observed in the real pilot.
test('PDF local preflight is fail-closed and preserves a separate render buffer', () => {
  const uploaderSource = readFileSync(new URL('./KnowledgeFileUploader.tsx', import.meta.url), 'utf8')
  const workbenchSource = readFileSync(new URL('./LocalSinglePagePdfPrivacyWorkbench.tsx', import.meta.url), 'utf8')

  assert.match(workbenchSource, /NativeTextPdfPreflightState = .*'FAILED'/)
  assert.match(workbenchSource, /classifyLocalPdfForVisualPreflight\(bytes\.slice\(\)\)/)
  assert.match(workbenchSource, /onNativeTextPreflightRef\.current\('FAILED'\)/)
  assert.match(workbenchSource, /await renderPdf\(bytes, classification\.totalPages\)/)

  assert.match(uploaderSource, /nativeTextPdfPreflight === 'FAILED'/)
  assert.match(uploaderSource, /nativeTextPdfPreflight === 'NOT_APPLICABLE' && !preparedPdfFile/)
  assert.match(uploaderSource, /Boolean\(preparedPdfFile\) \|\| nativeTextPdfPreflight === 'PASSED'/)
  assert.match(uploaderSource, /PDF non verificabile/)
})

test('Knowledge preserves entry context and gives one visual priority to find, capture, or browse', () => {
  const indexSource = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8')
  const styleSource = readFileSync(new URL('./knowledge.css', import.meta.url), 'utf8')

  assert.match(indexSource, /const captureRequested = Boolean\(params\.capture\) \|\| calendarIntent \|\| textbookMaterialRequested/)
  assert.match(indexSource, /const entryIntent = captureRequested\s*\? 'capture'\s*:\s*taskMode \|\| query\s*\? 'find'\s*:\s*'browse'/)
  assert.match(indexSource, /data-entry-intent=\{entryIntent\}/)
  assert.match(indexSource, /entryIntent === 'capture' \? capturePanel : searchPanel/)
  assert.match(indexSource, /entryIntent === 'capture' \? searchPanel : capturePanel/)
  assert.match(indexSource, /entryIntent === 'browse' \? renderRecentKnowledge\(\) : null/)
  assert.match(indexSource, /entryIntent !== 'browse' \? renderRecentKnowledge\(\) : null/)

  assert.match(indexSource, /data-testid="knowledge-task-context"/)
  assert.match(indexSource, /calendarIntent && calendarReturnTo/)
  assert.match(styleSource, /\.knowledgeIntentPrimary/)
  assert.match(styleSource, /\.knowledgeIntentSecondary/)
  assert.match(styleSource, /\.knowledgeGrid\[data-entry-intent="find"\]/)
  assert.match(styleSource, /\.knowledgeGrid\[data-entry-intent="capture"\]/)
})
