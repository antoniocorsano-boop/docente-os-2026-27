import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { isValidIsoCalendarDate, resolveTimetableSourceIdentity } from '../orario/timetable-import-boundary'
import { clearShareIntakeStaging } from './share-target-staging'
import { chooseTimetableExtractionStrategy, classifyTimetablePageTextLayer, clampRectToBounds, dateFromFilename, derivativeContextLabel, findTeacherTextAnchors, inferTeacherTimetableCells, isValidOrdinal, localOcrProgressLabel, looksLikeTimetablePdf, ordinalFromTimetableText, parseOrdinal, teacherLabelMatches, weekdayFromTimetableText } from './timetable-share-helpers'

const intake = fs.readFileSync(new URL('./ShareTargetIntake.tsx', import.meta.url), 'utf8')
const uploader = fs.readFileSync(new URL('../knowledge/KnowledgeFileUploader.tsx', import.meta.url), 'utf8')
const serviceWorker = fs.readFileSync(new URL('../../../public/sw.js', import.meta.url), 'utf8')
const timetableIntake = fs.readFileSync(new URL('./TimetableSharedIntake.tsx', import.meta.url), 'utf8')
const timetableActions = fs.readFileSync(new URL('../orario/actions.ts', import.meta.url), 'utf8')
const timetablePage = fs.readFileSync(new URL('../orario/page.tsx', import.meta.url), 'utf8')
const timetableExperience = fs.readFileSync(new URL('../orario/TimetableExperience.tsx', import.meta.url), 'utf8')
const timetableGrid = fs.readFileSync(new URL('../orario/TimetableGrid.tsx', import.meta.url), 'utf8')
const timetableLocalLauncher = fs.readFileSync(new URL('../orario/TimetableLocalImportLauncher.tsx', import.meta.url), 'utf8')
const timetableCss = fs.readFileSync(new URL('../orario/timetable.css', import.meta.url), 'utf8')
const pwaInstallPrompt = fs.readFileSync(new URL('../../components/pwa/PwaInstallPrompt.tsx', import.meta.url), 'utf8')

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


test('orario hierarchy separates consultation, update and advanced management', () => {
  assert.match(timetablePage, /mode="view"/)
  assert.match(timetableExperience, /href="\/orario\/aggiorna"/)
  assert.match(timetableExperience, /href="\/orario\/gestisci"/)
  assert.match(timetableExperience, /slots=\{mode === 'view' \? operationalSlots : timetable\.slots\}/)
  assert.match(timetableExperience, /readOnly=\{mode === 'view'\}/)
  const directEditAt = timetableExperience.indexOf('id="modifica-settimana"')
  const optionalImportAt = timetableExperience.indexOf('className="timetableVersionDetails timetableOptionalImport"')
  assert.ok(directEditAt >= 0)
  assert.ok(optionalImportAt > directEditAt)
  assert.match(timetableExperience, /<span>In vigore dal<\/span>/)
  assert.match(timetableExperience, /Non serve indicare una data di fine/)
  assert.match(timetableExperience, /Importa da PDF o foto/)
  assert.match(timetableExperience, /Opzionale/)
  assert.match(timetableExperience, /mode === 'manage' \? <>/)
  assert.match(timetableGrid, /readOnly\?: boolean/)
  assert.match(timetableGrid, /!readOnly && editor/)
  assert.match(timetableGrid, /!readOnly && assignments\.length/)
})

test('mobile timetable editor renders above its backdrop', () => {
  assert.match(timetableCss, /\.timetableEditorBackdrop,\.timetableContextBackdrop\{position:fixed;inset:0;z-index:100/)
  assert.match(timetableCss, /\.timetableEditor,\.timetableContextSheet\{position:fixed;z-index:101/)
  assert.match(timetableCss, /bottom:0;transform:none;width:100%;max-height:min\(82dvh,760px\)/)
})


test('mobile timetable prioritizes the grid and direct editing', () => {
  assert.match(timetableExperience, /contentClassName=\{\`timetableSurface timetable-\$\{mode\}\`\}/)
  assert.match(timetableGrid, /readOnly \? setFocusedSlotId\(slot\.id\) : openOccupiedCell\(slot\)/)
  assert.match(timetableGrid, /<summary>Cambia giorno o orario<\/summary>/)
  assert.match(timetableGrid, /<summary>Dettagli opzionali<\/summary>/)
  assert.doesNotMatch(timetableCss, /\.timetableSurface \.timetableHero\{display:none\}/)
  assert.match(timetableCss, /\.timetableSurface \.timetableHero\{padding:0;border:0;background:transparent\}/)
  assert.match(timetableCss, /\.timetableSurface \.timetableHero p,\s*\.timetableSurface \.timetableHero span\{display:none\}/)
  assert.match(timetableCss, /\.timetableSurface \.timetableHero h1\{margin:0;font-size:20px/)
  assert.match(timetableCss, /\.timetable-view \.timetableModeNav\{display:none\}/)
  assert.match(timetableCss, /\.timetableSurface \.printTimetableButton\{display:none\}/)
  assert.match(timetableCss, /\.timetableSurface \.timeCell,[\s\S]*min-height:64px/)
  assert.match(timetableCss, /\.timetableEditorActions\{[\s\S]*position:sticky/)
})

test('PWA install prompt never covers the timetable workflow', () => {
  assert.match(pwaInstallPrompt, /usePathname/)
  assert.match(pwaInstallPrompt, /pathname\.startsWith\('\/orario'\)/)
})

test('mobile update route keeps heading before import and hides continuation until there is something to review', () => {
  assert.doesNotMatch(timetableCss, /\.timetableImportCard\s*\{\s*order\s*:\s*-1/)
  assert.match(timetableCss, /\.timetablePrimaryActions button:disabled/)
  assert.match(timetableIntake, /\{\(selections\.length > 0 \|\| acceptedCandidateId\) \? \(/)
  assert.match(timetableIntake, /disabled=\{!ready \|\| !sourceFingerprint \|\| \(needsManualContext/)
})

test('import review stays on the dedicated update route after the hierarchy split', () => {
  assert.match(timetableIntake, /\/orario\/aggiorna\?importCandidate=/)
  assert.doesNotMatch(timetableIntake, /return `\/orario\?importCandidate=/)
  assert.match(timetableActions, /\/orario\/aggiorna\?importCandidate=/)
})

test('ordinary timetable upload reuses the same local teacher-first intake', () => {
  assert.match(timetableExperience, /TimetableLocalImportLauncher/)
  assert.doesNotMatch(timetableExperience, /action=\{analyzeTimetableImport\}/)
  assert.doesNotMatch(timetableExperience, /Analizza il documento/)
  assert.match(timetableLocalLauncher, /TimetableSharedIntake/)
  assert.match(timetableLocalLauncher, /sourceMode="LOCAL_MINIMIZED_UPLOAD"/)
  assert.match(timetableLocalLauncher, /Docente OS ricostruirà automaticamente il tuo orario settimanale/)
})

test('timetable-like shared PDFs use local minimization before timetable analysis', () => {
  assert.match(intake, /looksLikeTimetable/)
  assert.match(intake, /TimetableSharedIntake/)

  assert.match(timetableIntake, /cropSelections/)
  assert.match(timetableIntake, /orario-selezione-locale\.png/)
  assert.match(timetableIntake, /data\.set\('file', safeFile\)/)
  assert.doesNotMatch(timetableIntake, /data\.set\('file', file\)/)
  assert.match(timetableIntake, /analyzeRasterTimetableImport/)
  assert.match(timetableIntake, /cropPageRegions/)
  assert.match(timetableIntake, /orario-pagine-immagine\.jpg/)
  assert.match(timetableIntake, /region\.kind !== 'TEXT_BEARING'/)
  assert.match(timetableIntake, /Il PDF completo non viene caricato in Conoscenza/)
  assert.match(timetableIntake, /await onBeforeSubmit\(\)/)
  assert.match(timetableIntake, /await analyzeMinimizedTimetableImport\(data\)/)
  assert.match(timetableIntake, /sha256Hex\(buffer\)/)
  assert.match(timetableIntake, /originalSourceFingerprint/)
  assert.doesNotMatch(timetableIntake, /originalSourceName/)
  assert.match(timetableIntake, /derivativeContextLabel/)
  assert.match(timetableIntake, /x: clamp\(x, 0, canvas\.width\)/)
  assert.match(timetableIntake, /y: clamp\(y, 0, canvas\.height\)/)
  assert.match(timetableIntake, /parseOrdinal\(event\.currentTarget\.value\)/)
  assert.match(timetableIntake, /needsManualContext && selections\.some\(\(item\) => !item\.weekday \|\| !isValidOrdinal\(item\.ordinal\) \|\| !item\.classLabel\)/)

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

test('timetable page classification distinguishes native text, raster and sparse mixed pages', () => {
  assert.equal(classifyTimetablePageTextLayer([]), 'RASTER')
  assert.equal(classifyTimetablePageTextLayer([{ str: '   ' }]), 'RASTER')
  assert.equal(classifyTimetablePageTextLayer([{ str: 'Corsano' }]), 'MIXED')
  assert.equal(classifyTimetablePageTextLayer([
    { str: 'lunedì' },
    { str: '1ora' },
    { str: 'Corsano' },
    { str: 'Classe 2C' },
  ]), 'TEXT_BEARING')
})

test('timetable extraction routing prefers native, then visual, then manual', () => {
  assert.equal(chooseTimetableExtractionStrategy({
    pageKinds: ['RASTER'],
    nativeTeacherMatches: 0,
  }), 'VISUAL_PAGE')
  assert.equal(chooseTimetableExtractionStrategy({
    pageKinds: ['TEXT_BEARING', 'MIXED'],
    nativeTeacherMatches: 0,
  }), 'VISUAL_PAGE')
  assert.equal(chooseTimetableExtractionStrategy({
    pageKinds: ['TEXT_BEARING'],
    nativeTeacherMatches: 2,
  }), 'NATIVE_TEXT')
  assert.equal(chooseTimetableExtractionStrategy({
    pageKinds: ['TEXT_BEARING'],
    nativeTeacherMatches: 0,
  }), 'MANUAL')
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

test('weekday parsing accepts accented and ASCII labels from real PDFs', () => {
  assert.equal(weekdayFromTimetableText('lunedì'), 1)
  assert.equal(weekdayFromTimetableText('lunedi'), 1)
  assert.equal(weekdayFromTimetableText('martedì'), 2)
  assert.equal(weekdayFromTimetableText('giovedi'), 4)
})

test('real timetable ordinal cells accept plain numbers under the Ora column', () => {
  assert.equal(ordinalFromTimetableText('1'), 1)
  assert.equal(ordinalFromTimetableText('5'), 5)
  assert.equal(ordinalFromTimetableText('1ora'), 1)
  assert.equal(ordinalFromTimetableText('21'), null)
})

test('teacher search does not duplicate a complete surname when neighboring PDF fragments share the row', () => {
  const anchors = [
    { text: 'Docente', page: 1, rect: { x: 40, y: 80, width: 42, height: 12 } },
    { text: 'Corsano', page: 1, rect: { x: 90, y: 80, width: 48, height: 12 } },
    { text: 'Docente', page: 1, rect: { x: 145, y: 80, width: 42, height: 12 } },
  ]
  const matches = findTeacherTextAnchors(anchors, 'Corsano')
  assert.equal(matches.length, 1)
  assert.equal(matches[0].text, 'Corsano')
})

test('teacher search combines direct and split occurrences from the same PDF', () => {
  const anchors = [
    { text: 'Corsano', page: 1, rect: { x: 10, y: 40, width: 45, height: 12 } },
    { text: 'Cor', page: 1, rect: { x: 100, y: 100, width: 18, height: 12 } },
    { text: 'sa', page: 1, rect: { x: 119, y: 100, width: 12, height: 12 } },
    { text: 'no', page: 1, rect: { x: 132, y: 100, width: 12, height: 12 } },
  ]
  const matches = findTeacherTextAnchors(anchors, 'Corsano')
  assert.equal(matches.length, 2)
})

test('teacher-first search recovers a surname split across adjacent PDF text fragments', () => {
  const anchors = [
    { text: 'Cor', page: 1, rect: { x: 100, y: 100, width: 18, height: 12 } },
    { text: 'sa', page: 1, rect: { x: 119, y: 100, width: 12, height: 12 } },
    { text: 'no', page: 1, rect: { x: 132, y: 100, width: 12, height: 12 } },
    { text: 'Altro', page: 1, rect: { x: 210, y: 100, width: 30, height: 12 } },
  ]
  const matches = findTeacherTextAnchors(anchors, 'Corsano')
  assert.equal(matches.length, 1)
  assert.equal(matches[0].page, 1)
  assert.ok(matches[0].rect.width >= 44)
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


test('mobile timetable flow keeps day and period in progressive fallback', () => {
  assert.match(timetableIntake, /Estrai il mio orario/)
  assert.match(timetableIntake, /findTeacherTextAnchors/)
  assert.match(timetableIntake, /teacherMatches/)
  assert.match(timetableIntake, /needsManualContext/)
  assert.match(timetableIntake, /Correzione avanzata · completa i dettagli ambigui/)
  assert.match(timetableIntake, /code === 'parse_failed' \|\| code === 'no_rows'/)
  assert.match(timetableIntake, /derivativeContextLabel\(teacherLabel, rect\.weekday, rect\.ordinal, rect\.classLabel\)/)
})

test('lesson-count feedback uses correct singular and plural copy', () => {
  assert.match(timetableIntake, /1 lezione trovata/)
  assert.match(timetableIntake, /lezioni trovate/)
  assert.doesNotMatch(timetableIntake, /trovatae/)
})

test('real-device mobile flow keeps primary action compact and secondary controls collapsed', () => {
  assert.match(timetableIntake, /timetablePrimaryActions/)
  assert.match(timetableIntake, /'Continua'/)
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

test('local page upload persists whole-document identity without pretending it was shared', () => {
  const original = 'd'.repeat(64)
  const derivative = 'e'.repeat(64)
  const identity = resolveTimetableSourceIdentity({
    sourceMode: 'LOCAL_MINIMIZED_UPLOAD',
    derivativeFingerprint: derivative,
    originalSourceFingerprint: original,
    derivativeName: 'orario-selezione-locale.png',
  })
  assert.equal(identity.sourceFingerprint, original)
  assert.equal(identity.sourceLabel, 'Orario caricato - derivato locale')
  assert.equal(identity.sourceRef, `client-whole-document-sha256:${original}`)
  assert.doesNotMatch(identity.sourceRef, new RegExp(derivative))
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

test('raster-page derivatives keep whole-document provenance for share and upload', () => {
  const original = 'c'.repeat(64)
  const derivative = 'f'.repeat(64)
  const shared = resolveTimetableSourceIdentity({
    sourceMode: 'LOCAL_RASTER_PAGE_SHARE',
    derivativeFingerprint: derivative,
    originalSourceFingerprint: original,
    derivativeName: 'orario-pagine-immagine.png',
  })
  const uploaded = resolveTimetableSourceIdentity({
    sourceMode: 'LOCAL_RASTER_PAGE_UPLOAD',
    derivativeFingerprint: derivative,
    originalSourceFingerprint: original,
    derivativeName: 'orario-pagine-immagine.png',
  })
  assert.equal(shared.sourceFingerprint, original)
  assert.equal(uploaded.sourceFingerprint, original)
  assert.match(shared.sourceLabel, /pagina immagine derivata localmente/)
  assert.match(uploaded.sourceLabel, /pagina immagine derivata localmente/)
  assert.equal(shared.sourceRef, `client-whole-document-sha256:${original}`)
  assert.equal(uploaded.sourceRef, `client-whole-document-sha256:${original}`)
})

test('manual selection is exposed only after automatic extraction needs correction', () => {
  assert.match(timetableIntake, /\{needsManualContext \? <button/)
  assert.doesNotMatch(timetableIntake, /\{\(!selections\.length \|\| needsManualContext\) \? <button/)
  assert.match(timetableIntake, /setMessage\('Sto leggendo l’orario…'\)/)
})

test('raster timetable prefers on-device OCR and structured persistence before remote assist', () => {
  const localOcrAt = timetableIntake.indexOf('recognizeLocalDocumentImage')
  const localPersistAt = timetableIntake.indexOf('persistLocallyExtractedTimetableImport', localOcrAt)
  const remoteAt = timetableIntake.indexOf('analyzeRasterTimetableImport', localPersistAt)

  assert.ok(localOcrAt >= 0)
  assert.ok(localPersistAt > localOcrAt)
  assert.ok(remoteAt > localPersistAt)
  assert.match(timetableIntake, /localDiagnostic =/)
  assert.match(timetableIntake, /Provo il servizio di estrazione configurato/)
  assert.match(timetableIntake, /local-ocr:p\$\{cell\.page\}/)
  assert.match(timetableActions, /export async function persistLocallyExtractedTimetableImport/)
  assert.match(timetableActions, /parserVersion: 'tesseract\.js@7\.0\.0\+ita@1\.0\.0\+structural-v1'/)
  assert.match(timetableActions, /sourceLabel: `local-ocr:/)
  assert.match(timetableActions, /normalizeLocalStructuredRows/)
  assert.match(timetableActions, /persistStructuredTimetableCandidate/)
  assert.match(timetableIntake, /Le pagine immagine vengono lette prima localmente sul dispositivo/)
})

test('raster timetable derivative stays below the Server Action payload ceiling', () => {
  assert.match(timetableIntake, /MAX_RASTER_DERIVATIVE_BYTES = 3 \* 1024 \* 1024/)
  assert.match(timetableIntake, /MAX_RASTER_DERIVATIVE_EDGE = 1400/)
  assert.match(timetableIntake, /MAX_RASTER_DERIVATIVE_PIXELS = 5_000_000/)
  assert.match(timetableIntake, /output\.toBlob\(resolve, 'image\/jpeg', quality\)/)
  assert.match(timetableIntake, /orario-pagine-immagine\.jpg/)
  assert.match(timetableIntake, /type: rasterDerivative\.type \|\| 'image\/jpeg'/)
  assert.doesNotMatch(timetableIntake, /orario-pagine-immagine\.png/)
})

test('visual timetable provider unavailability is observable and teacher-facing', () => {
  assert.match(timetableActions, /TimetableDocumentExtractionUnavailableError/)
  assert.match(timetableActions, /code: 'extractor_unavailable'/)
  assert.match(timetableActions, /Timetable visual extraction unavailable:/)
  assert.match(timetableIntake, /code === 'extractor_unavailable'/)
  assert.match(timetableIntake, /Il servizio remoto non è disponibile/)
  assert.match(timetableIntake, /Lettura locale senza diagnosi/)
})

test('selection counter uses correct Italian plural', () => {
  assert.match(timetableIntake, /aree selezionate/)
  assert.doesNotMatch(timetableIntake, /selezionatae/)
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
  assert.match(timetableIntake, /touchAction: needsManualContext && touchSelectMode \? 'none' : 'pan-y'/)
  assert.match(timetableIntake, /aria-pressed=\{touchSelectMode\}/)
  assert.match(timetableIntake, /ensureKeyboardCursorVisible/)
  assert.match(timetableIntake, /measureText\(derivativeContextLabel/)
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


test('recoverable minimized-share validation returns feedback without deleting staged PDF', () => {
  const analyzeAt = timetableIntake.indexOf('const result = await analyzeMinimizedTimetableImport(data)')
  const recoverableAt = timetableIntake.indexOf('isRecoverableImportFailure(code)', analyzeAt)
  const cleanupAt = timetableIntake.indexOf('await onBeforeSubmit()', recoverableAt)
  assert.ok(analyzeAt >= 0)
  assert.ok(recoverableAt > analyzeAt)
  assert.ok(cleanupAt > recoverableAt)
  assert.match(timetableIntake, /il PDF resta nello staging locale/)
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


test('Android timetable preview uses one reusable scratch canvas and preserves prior PDF pages', () => {
  assert.doesNotMatch(timetableIntake, /const rendered: HTMLCanvasElement\[\]/)
  assert.match(timetableIntake, /const scratch = document\.createElement\('canvas'\)/)
  assert.match(timetableIntake, /await layout\.page\.render\(\{[\s\S]*canvas: scratch/)
  assert.match(timetableIntake, /ctx\.drawImage\(scratch, layout\.x, layout\.y\)/)
  assert.match(timetableIntake, /scratch\.width = 1/)
  assert.match(timetableIntake, /scratch\.height = 1/)
  assert.match(timetableIntake, /position: 'absolute'/)
  assert.match(timetableIntake, /getDocumentProxy\(new Uint8Array\(buffer\)\)/)
})


test('accepted candidate survives cleanup failure and cleanup retry opens its review', () => {
  assert.match(timetableIntake, /setAcceptedCandidateId\(result\.candidateId\)/)
  assert.match(timetableIntake, /retryAcceptedCleanup/)
  assert.match(timetableIntake, /reviewUrl\(acceptedCandidateId\)/)
  assert.match(timetableIntake, /senza rieseguire l’analisi/)
})


test('parent cleanup action preserves accepted candidate review routing', () => {
  assert.match(timetableIntake, /onCandidateAccepted\?\.\(result\.candidateId\)/)
  assert.match(intake, /onCandidateAccepted=\{setAcceptedCandidateId\}/)
  assert.match(intake, /acceptedCandidateId[\s\S]*importCandidate=\$\{encodeURIComponent\(acceptedCandidateId\)\}&import=review/)
  assert.match(intake, /Rimuovi il file locale e apri la revisione/)
})


test('timetable confirmation is bound to the reviewed candidate revision', () => {
  assert.match(timetableExperience, /name="candidateRevision" value=\{importCandidate\.revision\}/)
  assert.match(timetableActions, /const reviewedRevision = integer\(formData, 'candidateRevision'\)/)
  assert.match(timetableActions, /candidate\.revision !== reviewedRevision/)
  assert.match(timetableActions, /import=review_stale/)
  assert.match(timetableActions, /candidateRevision: reviewedRevision/)
})


test('all timetable review edits are bound to the rendered candidate revision', () => {
  const revisionInputs = timetableExperience.match(/name="candidateRevision" value=\{importCandidate\.revision\}/g) ?? []
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
  assert.match(timetableExperience, /persist_failed:/)
  assert.match(timetableExperience, /Proposta non salvata/)
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
  assert.match(timetableIntake, /Questo documento è già stato applicato alla bozza dell’orario/)
})


test('Android OCR exposes bounded progress before the preview and keeps manual UI secondary', () => {
  const statusAt = timetableIntake.indexOf('<p role="status"')
  const previewAt = timetableIntake.indexOf('<div ref={viewportRef}')
  assert.ok(statusAt >= 0)
  assert.ok(previewAt > statusAt)
  assert.match(timetableIntake, /aria-busy=\{busy\}/)
  assert.match(timetableIntake, /onProgress:/)
  assert.match(timetableIntake, /Analisi automatica in corso/)
  assert.match(timetableIntake, /needsManualContext \? <span className="timetableKeyboardHelp"/)
  assert.match(timetableIntake, /\{\(selections\.length > 0 \|\| acceptedCandidateId\) \? \(/)
  assert.match(timetableIntake, /maxHeight: 360/)
})


test('mixed PDF progress uses raster position without exposing implementation jargon', () => {
  const label = localOcrProgressLabel({ progress: 0.42, rasterIndex: 1, rasterTotal: 2 })
  assert.equal(label, 'Sto leggendo l’orario… 42% · pagina 2/2')
  assert.doesNotMatch(label, /\b(?:OCR|raster|parser|fallback|text layer)\b/i)
})

test('mobile raster OCR uses one shared 30-second deadline across all visual pages', () => {
  assert.match(timetableIntake, /const localOcrDeadlineAt = Date\.now\(\) \+ LOCAL_OCR_TIMEOUT_MS/)
  assert.match(timetableIntake, /remainingLocalOcrBudgetMs\(localOcrDeadlineAt\)/)
  assert.doesNotMatch(timetableIntake, /timeoutMs:\s*LOCAL_OCR_TIMEOUT_MS,\s*\n\s*onProgress/)
})


test('automatic timetable extraction keeps the preview read-only until manual recovery is required', () => {
  assert.match(timetableIntake, /role=\{needsManualContext \? 'application' : 'img'\}/)
  assert.match(timetableIntake, /tabIndex=\{needsManualContext \? 0 : -1\}/)
  assert.match(timetableIntake, /onPointerDown=\{needsManualContext \? pointerDown : undefined\}/)
  assert.match(timetableIntake, /onPointerUp=\{needsManualContext \? pointerUp : undefined\}/)
  assert.match(timetableIntake, /onKeyDown=\{needsManualContext \? keyboardSelection : undefined\}/)
  assert.match(timetableIntake, /aria-label=\{needsManualContext/)
  const visualStart = timetableIntake.indexOf("if (extractionStrategy !== 'VISUAL_PAGE'")
  const clearAt = timetableIntake.indexOf('setSelections([])', visualStart)
  const automaticAt = timetableIntake.indexOf('setNeedsManualContext(false)', visualStart)
  assert.ok(visualStart >= 0)
  assert.ok(clearAt > visualStart)
  assert.ok(automaticAt > clearAt)
})


test('raster preparation time is charged to the shared OCR deadline', () => {
  const loopAt = timetableIntake.indexOf('for (const [regionIndex, region] of visualRegions.entries())')
  const copyAt = timetableIntake.indexOf('const localPage = copyPageRegionForLocalOcr(source, region)', loopAt)
  const budgetAt = timetableIntake.indexOf('const timeoutMs = remainingLocalOcrBudgetMs(localOcrDeadlineAt)', loopAt)
  assert.ok(loopAt >= 0)
  assert.ok(copyAt > loopAt)
  assert.ok(budgetAt > copyAt)
})

test('OCR progress stays indeterminate until text recognition begins', () => {
  const bootstrap = localOcrProgressLabel({
    status: 'loading tesseract core',
    progress: 0.88,
    rasterIndex: 0,
    rasterTotal: 2,
  })
  assert.equal(bootstrap, 'Sto preparando la lettura dell’orario… pagina 1/2')
  assert.doesNotMatch(bootstrap, /%/)

  const recognition = localOcrProgressLabel({
    status: 'recognizing text',
    progress: 0.42,
    rasterIndex: 1,
    rasterTotal: 2,
  })
  assert.equal(recognition, 'Sto leggendo l’orario… 42% · pagina 2/2')
})
