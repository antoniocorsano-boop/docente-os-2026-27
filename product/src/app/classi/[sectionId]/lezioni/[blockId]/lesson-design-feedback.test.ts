// @trama-feedback-test
// TRAMA-PW-01: perceptible write contract regression coverage.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const toolsSource = readFileSync(new URL('./lesson-design-tools.tsx', import.meta.url), 'utf8')
const actionsSource = readFileSync(new URL('./design-actions.ts', import.meta.url), 'utf8')
const pageSource = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8')

test('lesson design writes expose pending, success and failure feedback', () => {
  assert.match(toolsSource, /useActionState/)
  assert.match(toolsSource, /useFormStatus/)
  assert.match(toolsSource, /role=\{writeState\.notice === 'failed' \? 'alert' : 'status'\}/)
  assert.match(toolsSource, /aria-live=\{writeState\.notice === 'failed' \? 'assertive' : 'polite'\}/)
  assert.match(toolsSource, /Aggiunta alla lezione\. Ora è nella sequenza\./)
  assert.match(toolsSource, /Modifica salvata\. L’elemento è tornato “Da controllare”/)
  assert.match(toolsSource, /Operazione non completata\. Nessuna modifica è stata confermata/)
  assert.match(toolsSource, /idle="Scarta" pendingLabel="Rimozione…"/)
})

test('lesson design feedback is bound to the actual server action result', () => {
  assert.match(actionsSource, /runLessonDesignWrite/)
  assert.match(actionsSource, /const lesson = await requireLessonContext\(formData\)/)
  assert.match(actionsSource, /catch \{\s*return nextDesignWriteState\(previousState, 'failed'\)/)
  assert.match(actionsSource, /revalidateLesson\(lesson\.sectionId, lesson\.blockId\)/)
  assert.doesNotMatch(actionsSource, /designNotice=/)
  assert.doesNotMatch(pageSource, /designNotice/)
})

test('all lesson-design writes declare an explicit intent', () => {
  for (const intent of ['propose-question', 'accept', 'remove', 'revise', 'attach-knowledge', 'attach-atlas']) {
    assert.match(toolsSource, new RegExp('name="designIntent" value="' + intent + '"'))
  }
})


test('Atlas proposal keeps provenance visible and requires an explicit teacher write', () => {
  assert.match(toolsSource, /<strong>Da Atlas<\/strong>/)
  assert.match(toolsSource, /Controlla su Atlas/)
  assert.match(toolsSource, /name="designIntent" value="attach-atlas"/)
  assert.match(toolsSource, /Provenienza:/)
  assert.match(actionsSource, /sourceKind: 'ATLAS'/)
  assert.match(actionsSource, /sourceRef: `atlas:\$\{atlasMaterial\.materialId\}`/)
  assert.match(actionsSource, /resolveAtlasMaterialSuggestion/)
})
