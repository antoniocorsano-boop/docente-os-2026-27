import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { isValidIsoCalendarDate, resolveTimetableSourceIdentity } from '../orario/timetable-import-boundary'
import { clearShareIntakeStaging } from './share-target-staging'
import { clampRectToBounds, dateFromFilename, derivativeContextLabel, inferTeacherTimetableCells, isValidOrdinal, looksLikeTimetablePdf, parseOrdinal, teacherLabelMatches } from './timetable-share-helpers'

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
  assert.match(intake, /Nessuna modifica all’orario viene applicata[\s\S]*senza conferma/)
})

test('shared file reuses governed Knowledge upload feedback', () => {
  assert.match(uploader, /role=\{phase === 'ERROR' \? 'alert' : 'status'\}/)
  assert.match(uploader, /La selezione è ancora qui: puoi riprovare/)
  assert.match(uploader, /Conferma e analizza/)
  assert.match(uploader, /required=\{!selectedFile\}/)
  assert.match(uploader, /Ricevuto dal dispositivo/)
})


test('timetable-like shared PDFs use governed real-document understanding after explicit teacher action', () => {
  assert.match(intake, /looksLikeTimetable/)
  assert.match(intake, /TimetableSharedIntake/)
  assert.match(timetableIntake, /Trova il mio orario/)
  assert.match(timetableIntake, /data\.set\('file', file\)/)
  assert.match(timetableIntake, /await analyzeSharedTimetableImport\(data\)/)
  assert.match(timetableIntake, /Sto leggendo il tuo orario/)
  assert.match(timetableIntake, /Cerco .* nel documento e ricostruisco giorno, ora e classe/)
  assert.doesNotMatch(timetableIntake, /Selezione manuale/)
  assert.doesNotMatch(timetableIntake, /cropSelections/)
  assert.match(timetableActions, /export async function analyzeSharedTimetableImport/)
  assert.match(timetableActions, /OpenAiTimetableDocumentExtractor/)
  assert.match(timetableActions, /replaceCandidateAtomic/)
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

test('teacher-first search normalizes ordinary timetable labels locally', () => {
  assert.equal(teacherLabelMatches('Prof. Rossi', 'rossi'), true)
  assert.equal(teacherLabelMatches('RÓSSI', 'róssi'), true)
  assert.equal(teacherLabelMatches('BIANCHI', 'rossi'), false)
  assert.equal(teacherLabelMatches('R', 'r'), false)
})

test('teacher timetable is reconstructed locally from table geometry', () => {
  const anchors = [
    { text: '1A', page: 1, rect: { x: 200, y: 20, width: 40, height: 20 } },
    { text: '2A', page: 1, rect: { x: 260, y: 20, width: 40, height: 20 } },
    { text: 'lunedì', page: 1, rect: { x: 20, y: 80, width: 60, height: 20 } },
    { text: '1ora', page: 1, rect: { x: 95, y: 80, width: 45, height: 20 } },
    { text: 'Corsano', page: 1, rect: { x: 205, y: 80, width: 45, height: 20 } },
    { text: '2ora', page: 1, rect: { x: 95, y: 110, width: 45, height: 20 } },
    { text: 'Corsano', page: 1, rect: { x: 265, y: 110, width: 45, height: 20 } },
  ]
  const cells = inferTeacherTimetableCells(anchors, 'Corsano')
  assert.equal(cells.length, 2)
  assert.deepEqual(cells.map(({ weekday, ordinal, classLabel }) => ({ weekday, ordinal, classLabel })), [
    { weekday: 1, ordinal: 1, classLabel: '1A' },
    { weekday: 1, ordinal: 2, classLabel: '2A' },
  ])
})


test('mobile timetable primary flow is document understanding, not manual cell reconstruction', () => {
  assert.match(timetableIntake, /Come compari nell’orario\?/)
  assert.match(timetableIntake, /Trova il mio orario/)
  assert.match(timetableIntake, /ricostruisco giorno, ora e classe/)
  assert.doesNotMatch(timetableIntake, /teacherLabelMatches/)
  assert.doesNotMatch(timetableIntake, /needsManualContext/)
  assert.doesNotMatch(timetableIntake, /Correzione avanzata/)
})


test('real-device mobile flow keeps primary action compact and secondary controls collapsed', () => {
  assert.match(timetableIntake, /timetablePrimaryActions/)
  assert.match(timetableIntake, /Trova il mio orario/)
  assert.match(timetableIntake, /<summary>Altre opzioni<\/summary>/)
  assert.match(timetableIntake, /<summary>Privacy e file locale<\/summary>/)
  assert.match(timetableIntake, /timetableKeyboardHelp/)
  assert.doesNotMatch(timetableIntake, /Prepara proposta di orario/)
})

test('teacher-only derivative context is allowed before advanced fallback', () => {
  assert.equal(derivativeContextLabel(' ROSSI ', null, null), 'DOCENTE: ROSSI')
  assert.equal(
    derivativeContextLabel('ROSSI', 2, 4, '2C'),
    'DOCENTE: ROSSI · GIORNO: Martedì · ORA: 4 · CLASSE: 2C',
  )
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


test('accepted timetable candidate is cleaned up locally before opening review', () => {
  const acceptedAt = timetableIntake.indexOf('setAcceptedCandidateId(result.candidateId)')
  const cleanupAt = timetableIntake.indexOf('await onBeforeSubmit()', acceptedAt)
  const reviewAt = timetableIntake.indexOf('window.location.assign(reviewUrl(result.candidateId))', cleanupAt)
  assert.ok(acceptedAt >= 0)
  assert.ok(cleanupAt > acceptedAt)
  assert.ok(reviewAt > cleanupAt)
  assert.match(timetableIntake, /il PDF locale non è ancora stato rimosso/)
})

test('timetable preview is confirmation-only and exposes no manual cell-selection controls', () => {
  assert.match(timetableIntake, /Anteprima del documento condiviso/)
  assert.match(timetableIntake, /maxHeight: 260/)
  assert.doesNotMatch(timetableIntake, /touchSelectMode/)
  assert.doesNotMatch(timetableIntake, /cropSelections/)
  assert.doesNotMatch(timetableIntake, /ensureKeyboardCursorVisible/)
})


test('timetable analysis uses the atomic replacement RPC instead of delete-then-create', () => {
  assert.match(timetableActions, /replaceCandidateAtomic/)
  assert.doesNotMatch(timetableActions, /deleteCandidate\(existing\.id\)/)
  assert.doesNotMatch(timetableActions, /createCandidate\(\{/)
})


test('explicit cancellation is fail-closed and returns to the classified destination', () => {
  assert.match(intake, /await clearStaging\(\)/)
  assert.match(intake, /looksLikeTimetable\(meta, file\) \? '\/orario' : '\/knowledge'/)
  assert.match(intake, /window\.location\.assign\(destination\)/)
  assert.match(intake, /Annulla acquisizione e rimuovi il file locale/)
  assert.match(intake, /L’acquisizione resta bloccata/)
})

test('service worker expires abandoned share-target staging', () => {
  assert.match(serviceWorker, /SHARE_MAX_AGE_MS = 60 \* 60 \* 1000/)
  assert.match(serviceWorker, /sweepExpiredShareIntakes/)
  assert.match(serviceWorker, /x-docente-os-staged-at/)
  assert.match(serviceWorker, /await clearCachedIntake\(cache, intakeId\)/)
})


test('recoverable real-document validation keeps the shared PDF available for retry', () => {
  const analyzeAt = timetableIntake.indexOf('const result = await analyzeSharedTimetableImport(data)')
  const failureAt = timetableIntake.indexOf('if (!result.ok)', analyzeAt)
  const cleanupAt = timetableIntake.indexOf('await onBeforeSubmit()', failureAt)
  assert.ok(analyzeAt >= 0)
  assert.ok(failureAt > analyzeAt)
  assert.ok(cleanupAt > failureAt)
  assert.match(timetableIntake, /Il PDF resta disponibile sul dispositivo/)
  assert.match(timetableIntake, /puoi riprovare senza ricaricarlo/)
})


test('timetable PDF size is checked before reading the full source into memory', () => {
  const sizeCheckAt = timetableIntake.indexOf('file.size > MAX_KNOWLEDGE_UPLOAD_BYTES')
  const arrayBufferAt = timetableIntake.indexOf('await file.arrayBuffer()')
  assert.ok(sizeCheckAt >= 0)
  assert.ok(arrayBufferAt > sizeCheckAt)
})


test('Android timetable preview renders only a bounded first-page confirmation image', () => {
  assert.match(timetableIntake, /const MAX_PAGES = 5/)
  assert.match(timetableIntake, /const MAX_PREVIEW_DIMENSION = 1400/)
  assert.match(timetableIntake, /const page = await pdf\.getPage\(1\)/)
  assert.match(timetableIntake, /await page\.render\(\{ canvas, canvasContext: context, viewport \}\)\.promise/)
  assert.doesNotMatch(timetableIntake, /for \(let page/)
})


test('accepted candidate survives cleanup failure and cleanup retry opens its review', () => {
  assert.match(timetableIntake, /setAcceptedCandidateId\(result\.candidateId\)/)
  assert.match(timetableIntake, /retryAcceptedCleanup/)
  assert.match(timetableIntake, /reviewUrl\(acceptedCandidateId\)/)
  assert.match(timetableIntake, /Riprova prima di uscire/)
})


test('parent cleanup action preserves accepted candidate review routing', () => {
  assert.match(timetableIntake, /onCandidateAccepted\?\.\(result\.candidateId\)/)
  assert.match(intake, /onCandidateAccepted=\{setAcceptedCandidateId\}/)
  assert.match(intake, /acceptedCandidateId[\s\S]*importCandidate=\$\{encodeURIComponent\(acceptedCandidateId\)\}&import=review/)
  assert.match(intake, /Rimuovi il file locale e apri la revisione/)
})


test('timetable confirmation is bound to the reviewed candidate revision', () => {
  assert.match(timetablePage, /name="candidateRevision" value=\{importCandidate\.revision\}/)
  assert.match(timetableActions, /const reviewedRevision = integer\(formData, 'candidateRevision'\)/)
  assert.match(timetableActions, /candidate\.revision !== reviewedRevision/)
  assert.match(timetableActions, /import=review_stale/)
  assert.match(timetableActions, /candidateRevision: reviewedRevision/)
})


test('all timetable review edits are bound to the rendered candidate revision', () => {
  const revisionInputs = timetablePage.match(/name="candidateRevision" value=\{importCandidate\.revision\}/g) ?? []
  assert.ok(revisionInputs.length >= 3)
  assert.match(timetableActions, /export async function addTimetableImportRow[\s\S]*candidate\.revision !== reviewedRevision/)
  assert.match(timetableActions, /export async function updateTimetableImportRow[\s\S]*candidate\.revision !== reviewedRevision/)
  assert.match(timetableActions, /candidateRevision: reviewedRevision/)
})

test('already-applied timetable sources are guarded by the replacement RPC', () => {
  const migration = fs.readFileSync(new URL('../../../supabase/migrations/0080_timetable_import_same_id_live_source_revision.sql', import.meta.url), 'utf8')
  assert.match(migration, /state = 'APPLIED_TO_DRAFT'/)
  assert.match(migration, /raise exception 'SOURCE_ALREADY_APPLIED'/)
})


test('reviewed timetable replacement requires explicit teacher consent', () => {
  const migration = fs.readFileSync(new URL('../../../supabase/migrations/0080_timetable_import_same_id_live_source_revision.sql', import.meta.url), 'utf8')
  assert.match(migration, /REPLACEMENT_CONFIRMATION_REQUIRED/)
  assert.match(migration, /p_replace_reviewed boolean default false/)
  assert.match(migration, /review_state = 'CONFIRMED'/)
  assert.match(timetableActions, /replaceReviewedCandidate/)
  assert.match(timetableIntake, /replaceReviewedCandidate/)
})

test('re-import locks matching candidates before checking applied terminal state', () => {
  const migration = fs.readFileSync(new URL('../../../supabase/migrations/0080_timetable_import_same_id_live_source_revision.sql', import.meta.url), 'utf8')
  const lockAt = migration.indexOf("state in ('DRAFT','READY_TO_CONFIRM','APPLIED_TO_DRAFT')")
  const appliedAt = migration.indexOf("raise exception 'SOURCE_ALREADY_APPLIED'")
  assert.ok(lockAt >= 0)
  assert.ok(appliedAt > lockAt)
  assert.match(migration, /for update;/)
})

test('ordinary timetable import persists a system-generated non-nominative label', () => {
  const ordinary = resolveTimetableSourceIdentity({
    sourceMode: '',
    derivativeFingerprint: 'c'.repeat(64),
    originalSourceFingerprint: '',
    derivativeName: 'ROSSI-orario-privato.pdf',
  })
  assert.equal(ordinary.sourceLabel, 'Orario importato')
  assert.doesNotMatch(ordinary.sourceLabel, /ROSSI/)
})

test('service-worker expiry cleanup checks payload deletion before removing metadata', () => {
  assert.match(serviceWorker, /const deleted = await cache\.delete\(request\)/)
  assert.match(serviceWorker, /if \(!deleted\) throw new Error\('Share Target staging cleanup incomplete'\)/)
})

test('ordinary timetable import surfaces persistence failures', () => {
  assert.match(timetablePage, /persist_failed:/)
  assert.match(timetablePage, /Proposta non salvata/)
})


test('direct candidate-row mutations are closed behind revision-aware RPCs', () => {
  const migration = fs.readFileSync(new URL('../../../supabase/migrations/0080_timetable_import_same_id_live_source_revision.sql', import.meta.url), 'utf8')
  assert.match(migration, /revoke insert, update, delete on table public\.timetable_import_candidate_rows from authenticated, anon/)
})


test('draft timetable review edits use atomic revision-advancing RPCs', () => {
  const repository = fs.readFileSync(new URL('../../core/infrastructure/supabase/supabase-timetable-import-repository.ts', import.meta.url), 'utf8')
  const migration = fs.readFileSync(new URL('../../../supabase/migrations/0080_timetable_import_same_id_live_source_revision.sql', import.meta.url), 'utf8')
  assert.match(repository, /update_timetable_import_row_v1/)
  assert.match(repository, /add_timetable_import_row_v1/)
  assert.match(migration, /revision=c\.revision\+1/)
  assert.match(migration, /STALE_CANDIDATE_REVISION/)
  assert.match(migration, /from public\.timetable_import_candidate_rows r[\s\S]*for update;/)
})

test('already-applied minimized import is surfaced as terminal', () => {
  assert.match(timetableIntake, /code === 'already_applied'/)
  assert.match(timetableIntake, /Questo documento risulta già applicato alla bozza dell’orario/)
})
