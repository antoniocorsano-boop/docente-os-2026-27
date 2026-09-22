// TRAMA-PW-01: perceptible write contract regression coverage.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const toolsSource = readFileSync(new URL('./lesson-design-tools.tsx', import.meta.url), 'utf8')
const actionsSource = readFileSync(new URL('./design-actions.ts', import.meta.url), 'utf8')

test('lesson design writes expose pending, success and failure feedback', () => {
  assert.match(toolsSource, /useFormStatus/)
  assert.match(toolsSource, /role=\{designNotice === 'failed' \? 'alert' : 'status'\}/)
  assert.match(toolsSource, /aria-live=\{designNotice === 'failed' \? 'assertive' : 'polite'\}/)
  assert.match(toolsSource, /Aggiunta alla lezione\. Ora è nella sequenza\./)
  assert.match(toolsSource, /Modifica salvata\. L’elemento è tornato “Da controllare”/)
  assert.match(toolsSource, /Operazione non completata\. Nessuna modifica è stata confermata/)
})

test('lesson design server writes redirect failures to a perceptible result state', () => {
  assert.match(actionsSource, /DesignNotice = .*'failed'/)
  assert.ok((actionsSource.match(/completeDesignWrite\(lesson\.sectionId, lesson\.blockId, 'failed'\)/g) ?? []).length >= 5)
  assert.match(actionsSource, /designNotice=\$\{encodeURIComponent\(notice\)\}/)
})
