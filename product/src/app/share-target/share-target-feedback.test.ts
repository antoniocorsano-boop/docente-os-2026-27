import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const intake = fs.readFileSync(new URL('./ShareTargetIntake.tsx', import.meta.url), 'utf8')
const uploader = fs.readFileSync(new URL('../knowledge/KnowledgeFileUploader.tsx', import.meta.url), 'utf8')

test('shared intake makes local-only and failure state perceptible before write', () => {
  assert.match(intake, /ancora locale/)
  assert.match(intake, /già stato ricevuto da Docente OS/)
  assert.match(intake, /resta sul dispositivo/)
  assert.match(intake, /role="alert"/)
  assert.match(intake, /role="status"/)
  assert.match(intake, /Nessuna destinazione viene scelta automaticamente/)
})

test('shared file reuses governed Knowledge upload feedback', () => {
  assert.match(uploader, /role=\{phase === 'ERROR' \? 'alert' : 'status'\}/)
  assert.match(uploader, /La selezione è ancora qui: puoi riprovare/)
  assert.match(uploader, /Conferma e analizza/)
  assert.match(uploader, /required=\{!selectedFile\}/)
  assert.match(uploader, /Ricevuto dal dispositivo/)
})
