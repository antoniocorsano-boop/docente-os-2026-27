import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const intake = fs.readFileSync(new URL('./ShareTargetIntake.tsx', import.meta.url), 'utf8')
const uploader = fs.readFileSync(new URL('../knowledge/KnowledgeFileUploader.tsx', import.meta.url), 'utf8')
const serviceWorker = fs.readFileSync(new URL('../../../public/sw.js', import.meta.url), 'utf8')
const timetableIntake = fs.readFileSync(new URL('./TimetableSharedIntake.tsx', import.meta.url), 'utf8')
const timetableActions = fs.readFileSync(new URL('../orario/actions.ts', import.meta.url), 'utf8')

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


test('timetable-like shared PDFs use local minimization before timetable analysis', () => {
  assert.match(intake, /looksLikeTimetable/)
  assert.match(intake, /TimetableSharedIntake/)
  assert.match(intake, /orario|timetable|quadro\\s\+orario/)
  assert.match(intake, /file\.type === 'application\/pdf'/)
  assert.match(intake, /\\.pdf\$\/i\.test\(file\.name\)/)

  assert.match(timetableIntake, /cropSelections/)
  assert.match(timetableIntake, /orario-selezione-locale\.png/)
  assert.match(timetableIntake, /data\.set\('file', safeFile\)/)
  assert.doesNotMatch(timetableIntake, /data\.set\('file', file\)/)
  assert.match(timetableIntake, /Il PDF completo non viene caricato in Conoscenza/)
  assert.match(timetableIntake, /await onBeforeSubmit\(\)/)
  assert.match(timetableIntake, /await analyzeTimetableImport\(data\)/)
  assert.match(timetableIntake, /sha256Hex\(bytes\)/)
  assert.match(timetableIntake, /originalSourceFingerprint/)
  assert.match(timetableIntake, /GIORNO:/)
  assert.match(timetableIntake, /ORA:/)
  assert.match(timetableIntake, /x: clamp\(x, 0, canvas\.width\)/)
  assert.match(timetableIntake, /y: clamp\(y, 0, canvas\.height\)/)
  assert.match(timetableIntake, /x2 = clamp\(Math\.ceil\(rect\.x \+ rect\.width\), 0, source\.width\)/)
  assert.match(timetableIntake, /y2 = clamp\(Math\.ceil\(rect\.y \+ rect\.height\), 0, source\.height\)/)
  assert.match(timetableIntake, /parseOrdinal\(event\.currentTarget\.value\)/)
  assert.match(timetableIntake, /value !== null && Number\.isInteger\(value\) && value >= 1 && value <= 20/)
  assert.match(timetableIntake, /selections\.some\(\(item\) => !item\.weekday \|\| !isValidOrdinal\(item\.ordinal\)\)/)

  assert.match(timetableActions, /LOCAL_MINIMIZED_SHARE/)
  assert.match(timetableActions, /validateOriginalSourceFingerprint/)
  assert.match(timetableActions, /sourceLabel = sourceMode === 'LOCAL_MINIMIZED_SHARE'/)
  assert.match(timetableActions, /derivative-sha256:/)
  assert.match(timetableActions, /if \(sourceMode === 'LOCAL_MINIMIZED_SHARE'\)/)
  assert.match(timetableActions, /importCandidate=\$\{encodeURIComponent\(existing\.id\)\}&import=review/)
})


test('service worker accepts Android multipart file parts even when field name differs', () => {
  assert.match(serviceWorker, /collectSharedFiles\(formData\)/)
  assert.match(serviceWorker, /for \(const \[, value\] of formData\.entries\(\)\)/)
  assert.match(serviceWorker, /typeof value\.arrayBuffer === 'function'/)
  assert.doesNotMatch(serviceWorker, /instanceof File/)
})
