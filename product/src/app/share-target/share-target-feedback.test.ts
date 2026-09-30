import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { isValidIsoCalendarDate, resolveTimetableSourceIdentity } from '../orario/timetable-import-boundary'
import { clearShareIntakeStaging } from './share-target-staging'
import { clampRectToBounds, dateFromFilename, derivativeContextLabel, isValidOrdinal, looksLikeTimetablePdf, parseOrdinal } from './timetable-share-helpers'

const intake = fs.readFileSync(new URL('./ShareTargetIntake.tsx', import.meta.url), 'utf8')
const uploader = fs.readFileSync(new URL('../knowledge/KnowledgeFileUploader.tsx', import.meta.url), 'utf8')
const serviceWorker = fs.readFileSync(new URL('../../../public/sw.js', import.meta.url), 'utf8')
const timetableIntake = fs.readFileSync(new URL('./TimetableSharedIntake.tsx', import.meta.url), 'utf8')
const timetableActions = fs.readFileSync(new URL('../orario/actions.ts', import.meta.url), 'utf8')
const timetablePage = fs.readFileSync(new URL('../orario/page.tsx', import.meta.url), 'utf8')

test('shared intake makes local-only and failure state perceptible before write', () => {
  assert.match(intake, /ancora locale/)
  assert.match(intake, /già stato ricevuto da Docente OS/)
  assert.match(intake, /resta sul dispositivo/)
  assert.match(intake, /role="alert"/)
  assert.match(intake, /role="status"/)
  assert.match(intake, /instradati automaticamente al flusso dedicato/)
  assert.match(intake, /Nessuna modifica all’orario viene applicata senza conferma/)
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

  assert.match(timetableIntake, /cropSelections/)
  assert.match(timetableIntake, /orario-selezione-locale\.png/)
  assert.match(timetableIntake, /data\.set\('file', safeFile\)/)
  assert.doesNotMatch(timetableIntake, /data\.set\('file', file\)/)
  assert.match(timetableIntake, /Il PDF completo non viene caricato in Conoscenza/)
  assert.match(timetableIntake, /await onBeforeSubmit\(\)/)
  assert.match(timetableIntake, /await analyzeMinimizedTimetableImport\(data\)/)
  assert.match(timetableIntake, /sha256Hex\(bytes\)/)
  assert.match(timetableIntake, /originalSourceFingerprint/)
  assert.doesNotMatch(timetableIntake, /originalSourceName/)
  assert.match(timetableIntake, /derivativeContextLabel/)
  assert.match(timetableIntake, /x: clamp\(x, 0, canvas\.width\)/)
  assert.match(timetableIntake, /y: clamp\(y, 0, canvas\.height\)/)
  assert.match(timetableIntake, /parseOrdinal\(event\.currentTarget\.value\)/)
  assert.match(timetableIntake, /selections\.some\(\(item\) => !item\.weekday \|\| !isValidOrdinal\(item\.ordinal\)\)/)

  assert.match(timetableActions, /resolveTimetableSourceIdentity/)
  assert.match(timetableActions, /sourceIdentity\.sourceLabel/)
  assert.match(timetableActions, /sourceIdentity\.sourceRef/)
})


test('service worker accepts Android multipart file parts even when field name differs', () => {
  assert.match(serviceWorker, /collectSharedFiles\(formData\)/)
  assert.match(serviceWorker, /for \(const \[, value\] of formData\.entries\(\)\)/)
  assert.match(serviceWorker, /typeof value\.arrayBuffer === 'function'/)
  assert.doesNotMatch(serviceWorker, /instanceof File/)
})


test('timetable routing ignores free-form notes and only classifies timetable PDFs', () => {
  assert.equal(looksLikeTimetablePdf({
    title: 'Materiale didattico',
    fileName: 'lezione.pdf',
    fileType: 'application/pdf',
  }), false)
  assert.equal(looksLikeTimetablePdf({
    title: 'Orario provvisorio',
    fileName: 'documento.pdf',
    fileType: 'application/pdf',
  }), true)
  assert.equal(looksLikeTimetablePdf({
    title: 'Orario provvisorio',
    fileName: 'orario.jpg',
    fileType: 'image/jpeg',
  }), false)
  assert.equal(looksLikeTimetablePdf({
    title: '',
    fileName: 'orario_scolastico.pdf',
    fileType: 'application/pdf',
  }), true)
  assert.equal(looksLikeTimetablePdf({
    title: '',
    fileName: 'quadro_orario.pdf',
    fileType: 'application/pdf',
  }), true)
})

test('date parsing rejects impossible calendar dates', () => {
  assert.equal(dateFromFilename('orario dal 28-09-2026.pdf'), '2026-09-28')
  assert.equal(dateFromFilename('orario dal 31-02-2026.pdf'), null)
  assert.equal(isValidIsoCalendarDate('2026-02-28'), true)
  assert.equal(isValidIsoCalendarDate('2026-02-31'), false)
})

test('ordinal validation rejects non-integer and out-of-range values', () => {
  assert.equal(parseOrdinal('1'), 1)
  assert.equal(parseOrdinal('20'), 20)
  assert.equal(parseOrdinal('-1'), null)
  assert.equal(parseOrdinal('21'), null)
  assert.equal(parseOrdinal('1.5'), null)
  assert.equal(isValidOrdinal(null), false)
})

test('crop bounds clamp both endpoints instead of shifting overshoot', () => {
  assert.deepEqual(
    clampRectToBounds({ x: -50, y: -20, width: 150, height: 80 }, 500, 500),
    { x: 0, y: 0, width: 100, height: 60 },
  )
})

test('local minimized source identity persists only the whole-document fingerprint', () => {
  const original = 'a'.repeat(64)
  const derivative = 'b'.repeat(64)
  const identity = resolveTimetableSourceIdentity({
    sourceMode: 'LOCAL_MINIMIZED_SHARE',
    derivativeFingerprint: derivative,
    originalSourceFingerprint: original,
    derivativeName: 'orario-selezione-locale.png',
  })
  assert.equal(identity.sourceFingerprint, original)
  assert.equal(identity.sourceLabel, 'Orario condiviso - derivato locale')
  assert.equal(identity.sourceRef, `client-whole-document-sha256:${original}`)
  assert.doesNotMatch(identity.sourceRef, new RegExp(derivative))
})

test('staging cleanup is fail-closed when any cache deletion fails', async () => {
  // @trama-feedback-test cleanup failure is surfaced through the persistent Share Target status region.
  const requests = [
    new Request('https://example.test/__share-intake/abc/meta'),
    new Request('https://example.test/__share-intake/abc/file/0'),
    new Request('https://example.test/__share-intake/other/meta'),
  ]
  const deleted: string[] = []
  const cache = {
    async keys() { return requests },
    async delete(request: Request) {
      deleted.push(request.url)
      return !request.url.endsWith('/file/0')
    },
  }

  await assert.rejects(
    () => clearShareIntakeStaging(cache, 'abc'),
    /cleanup incomplete/,
  )
  assert.equal(deleted.length, 1)
  assert.equal(deleted[0]?.endsWith('/file/0'), true)
  assert.equal(deleted.some((url) => url.endsWith('/meta')), false)
  assert.equal(deleted.some((url) => url.includes('/other/')), false)
})


test('minimized derivative context always carries teacher, day and period', () => {
  assert.equal(
    derivativeContextLabel(' ROSSI ', 2, 4),
    'DOCENTE: ROSSI · GIORNO: Martedì · ORA: 4',
  )
  assert.throws(() => derivativeContextLabel('', 2, 4), /Teacher label/)
  assert.throws(() => derivativeContextLabel('ROSSI', 2, 21), /ordinal/)
})


test('terminal timetable preparation failures purge local staging before surfacing the result', () => {
  assert.match(timetableIntake, /await onBeforeSubmit\(\)/)
  assert.match(timetableIntake, /Il file sorgente è stato rimosso dallo staging locale/)
  assert.match(timetableIntake, /Non sono riuscito a rimuovere il file dallo staging locale/)
})


test('timetable preview preserves touch scrolling and sizes derivative labels', () => {
  assert.match(timetableIntake, /touchAction: touchSelectMode \? 'none' : 'pan-y'/)
  assert.match(timetableIntake, /aria-pressed=\{touchSelectMode\}/)
  assert.match(timetableIntake, /ensureKeyboardCursorVisible/)
  assert.match(timetableIntake, /measureText\(derivativeContextLabel/)
})


test('timetable analysis uses the atomic replacement RPC instead of delete-then-create', () => {
  assert.match(timetableActions, /replaceCandidateAtomic/)
  assert.doesNotMatch(timetableActions, /deleteCandidate\(existing\.id\)/)
  assert.doesNotMatch(timetableActions, /createCandidate\(\{/)
})


test('explicit cancellation is fail-closed and removes the staged intake before navigation', () => {
  assert.match(intake, /await clearStaging\(\)/)
  assert.match(intake, /window\.location\.assign\('\/orario'\)/)
  assert.match(intake, /Annulla acquisizione e rimuovi il file locale/)
  assert.match(intake, /L’acquisizione resta bloccata/)
})

test('service worker expires abandoned share-target staging', () => {
  assert.match(serviceWorker, /SHARE_MAX_AGE_MS = 60 \* 60 \* 1000/)
  assert.match(serviceWorker, /sweepExpiredShareIntakes/)
  assert.match(serviceWorker, /x-docente-os-staged-at/)
  assert.match(serviceWorker, /await clearCachedIntake\(cache, intakeId\)/)
})


test('recoverable minimized-share validation returns feedback before cleanup and preserves in-memory retry', () => {
  const analyzeAt = timetableIntake.indexOf('const result = await analyzeMinimizedTimetableImport(data)')
  const cleanupAt = timetableIntake.indexOf('await onBeforeSubmit()', analyzeAt)
  assert.ok(analyzeAt >= 0)
  assert.ok(cleanupAt > analyzeAt)
  assert.match(timetableIntake, /il PDF è stato rimosso dallo staging, ma l’anteprima resta disponibile in questa schermata/)
  assert.match(timetableActions, /export async function analyzeMinimizedTimetableImport/)
  assert.match(timetableActions, /return analyzeTimetableImportResult\(formData\)/)
  assert.match(timetableActions, /return \{ ok: false as const, code: 'invalid_date' \}/)
  assert.match(timetableActions, /return \{ ok: true as const, candidateId: candidate\.id \}/)
})


test('timetable PDF size is checked before reading the full source into memory', () => {
  const sizeCheckAt = timetableIntake.indexOf('file.size > MAX_KNOWLEDGE_UPLOAD_BYTES')
  const arrayBufferAt = timetableIntake.indexOf('await file.arrayBuffer()')
  assert.ok(sizeCheckAt >= 0)
  assert.ok(arrayBufferAt > sizeCheckAt)
})


test('timetable confirmation is bound to the reviewed candidate revision', () => {
  assert.match(timetablePage, /name="candidateRevision" value=\{importCandidate\.revision\}/)
  assert.match(timetableActions, /const reviewedRevision = integer\(formData, 'candidateRevision'\)/)
  assert.match(timetableActions, /candidate\.revision !== reviewedRevision/)
  assert.match(timetableActions, /import=review_stale/)
  assert.match(timetableActions, /candidateRevision: reviewedRevision/)
})
