import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { isValidIsoCalendarDate, resolveTimetableSourceIdentity } from '../orario/timetable-import-boundary'
import { clearShareIntakeStaging } from './share-target-staging'
import { clampRectToBounds, dateFromFilename, isValidOrdinal, looksLikeTimetablePdf, parseOrdinal } from './timetable-share-helpers'

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

test('local minimized source identity is server-derived from received derivative bytes', () => {
  const original = 'a'.repeat(64)
  const derivative = 'b'.repeat(64)
  const identity = resolveTimetableSourceIdentity({
    sourceMode: 'LOCAL_MINIMIZED_SHARE',
    derivativeFingerprint: derivative,
    originalSourceFingerprint: original,
    originalSourceName: 'orario.pdf',
    derivativeName: 'orario-selezione-locale.png',
  })
  assert.equal(identity.sourceFingerprint, derivative)
  assert.match(identity.sourceRef, new RegExp(`local-original-sha256:${original}`))
  assert.match(identity.sourceRef, new RegExp(`derivative-sha256:${derivative}`))
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
  assert.equal(deleted.length, 2)
  assert.equal(deleted.some((url) => url.includes('/other/')), false)
})
