import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { projectTemporalDay } from '../../../../core/application/temporal-projection-service'

const actionsSource = readFileSync(new URL('./actions.ts', import.meta.url), 'utf8')
const closeSource = readFileSync(new URL('./[blockId]/lesson-close-client.tsx', import.meta.url), 'utf8')
const observeSource = readFileSync(new URL('./[blockId]/lesson-observe-client.tsx', import.meta.url), 'utf8')
const observationModelSource = readFileSync(new URL('./lesson-observation-model.ts', import.meta.url), 'utf8')
const todayPanelSource = readFileSync(new URL('../../../planner/TemporalTodayPanel.tsx', import.meta.url), 'utf8')
const voiceRouteSource = readFileSync(new URL('../../../api/voice/transcribe/route.ts', import.meta.url), 'utf8')
const timetableFallbackMigrationSource = readFileSync(
  new URL('../../../../../supabase/migrations/0060_teaching_session_timetable_fallback.sql', import.meta.url),
  'utf8',
)

test('Bxx Registra routes through TeachingSession and never writes AnnualPlanBlockProgress directly', () => {
  assert.match(actionsSource, /recordTeachingSession/)
  assert.doesNotMatch(actionsSource, /saveProgress\s*\(/)
})

test('Bxx Registra preserves a resolved timetable occurrence before using manual fallback', () => {
  assert.match(actionsSource, /selectEligibleLessonOccurrence/)
  assert.match(actionsSource, /teachingSessionCandidateFromOccurrence/)
  assert.match(actionsSource, /sourceKind:\s*'MANUAL'/)
})

test('an active timetable remains a recordable candidate when Calendar has no row for the date', () => {
  const result = projectTemporalDay({
    localDate: '2026-09-16',
    timetableVersions: [{ id: 'tt-active', status: 'ACTIVE', effectiveFrom: '2026-09-11', effectiveTo: null }],
    timetableSlots: [{
      id: 'slot-3e',
      timetableVersionId: 'tt-active',
      weekday: 3,
      startTime: '11:00',
      endTime: '12:00',
      kind: 'LESSON',
      sectionId: 'section-3e',
      sectionLabel: '3ª E',
      disciplineId: 'technology',
      disciplineLabel: 'Tecnologia',
      manualClassLabel: null,
      room: null,
    }],
    calendarDays: [],
    calendarEvents: [],
  })

  assert.equal(result.calendarState, 'UNDETERMINED')
  assert.equal(result.timetableState, 'IN_FORCE')
  assert.equal(result.occurrences.length, 1)
  assert.deepEqual(result.occurrences[0].provenance, [
    'timetable_version:tt-active',
    'timetable_slot:slot-3e',
    'calendar_state:undetermined:2026-09-16',
  ])
})

test('projected registration accepts an unclassified Calendar day only with identified timetable provenance', () => {
  assert.match(timetableFallbackMigrationSource, /source_calendar_state = 'SCHOOL_DAY'/)
  assert.match(timetableFallbackMigrationSource, /source_calendar_state = 'UNDETERMINED'/)
  assert.match(timetableFallbackMigrationSource, /source_timetable_version_id is not null/)
  assert.match(timetableFallbackMigrationSource, /source_timetable_slot_id is not null/)
  assert.doesNotMatch(timetableFallbackMigrationSource, /source_calendar_state\s*=\s*'NO_LESSONS'/)
})

test('Today surfaces the in-force timetable when Calendar is unclassified and preserves explicit no-lessons override', () => {
  assert.match(todayPanelSource, /day\.calendarState === 'UNDETERMINED' && day\.timetableState === 'IN_FORCE'/)
  assert.match(todayPanelSource, /day\.calendarState === 'UNDETERMINED' && !timetableFallback/)
  assert.match(todayPanelSource, /Orario in vigore · Calendario non classificato/)
  assert.match(todayPanelSource, /day\.calendarState === 'NO_LESSONS'/)
  assert.match(todayPanelSource, /Lezioni non materializzate/)
})

test('lesson close no longer asks the teacher to decide plan status as part of registration', () => {
  assert.doesNotMatch(closeSource, /name=["']status["']/)
  assert.doesNotMatch(closeSource, /Svolta come prevista/)
  assert.match(closeSource, /name=["']localDate["']/)
  assert.match(closeSource, /name=["']actualMinutes["']/)
})

test('AI-1C voice capture is an ephemeral input channel and never a persistence boundary', () => {
  assert.match(closeSource, /navigator\.mediaDevices\.getUserMedia/)
  assert.match(closeSource, /new MediaRecorder/)
  assert.match(closeSource, /fetch\('\/api\/voice\/transcribe'/)
  assert.match(closeSource, /sourceKind: ContextualCaptureSourceKind/)
  assert.match(closeSource, /recordLessonExecution\(formData\)/)

  assert.match(voiceRouteSource, /loadLessonReflectionCopilotContext/)
  assert.match(voiceRouteSource, /SPEECH_TO_TEXT_MAX_BYTES/)
  assert.match(voiceRouteSource, /sourceKind: 'EPHEMERAL_TRANSCRIPT'/)
  assert.match(voiceRouteSource, /'Cache-Control': 'private, no-store'/)
  assert.doesNotMatch(voiceRouteSource, /\.insert\s*\(/)
  assert.doesNotMatch(voiceRouteSource, /storage\./)
})

test('a TeachingSession cannot be registered with a future lesson date', () => {
  assert.match(actionsSource, /Teaching session date cannot be in the future/)
  assert.match(closeSource, /max=\{defaultLocalDate\}/)
})

test('TE-1B observation uses the atomic evidence boundary without inventing EvidenceReferences', () => {
  assert.match(actionsSource, /recordTeachingSessionWithEvidence/)
  assert.match(actionsSource, /observations:\s*\[toTeachingObservationDraft\(observationDraft, blockId\)\]/)
  assert.match(actionsSource, /evidenceReferences:\s*\[\]/)
  assert.doesNotMatch(actionsSource, /AnnualPlanBlockProgress/)
})

test('TE-1B client carries only the explicit local observation draft into Registra', () => {
  assert.match(observeSource, /normalizeLessonObservationDraft/)
  assert.match(observeSource, /persistLessonObservationDraft\(window\.sessionStorage/)
  assert.match(closeSource, /name=["']observationDimension["']/)
  assert.match(closeSource, /name=["']observationState["']/)
  assert.match(closeSource, /name=["']observationNote["']/)
})

test('TE-1B persists authored observation before every supported outbound navigation', () => {
  const navigationGuards = observeSource.match(/onClick=\{persistBeforeNavigation\}/g) ?? []
  assert.equal(navigationGuards.length, 3)
  assert.match(observeSource, /useEffect\(\(\) => \{[\s\S]*persistLessonObservationDraft\(window\.sessionStorage/)
})

test('TE-1B enforces the existing pilot privacy guard before server-side canonicalization', () => {
  assert.match(actionsSource, /normalizeLessonObservationDraft/)
  assert.match(observationModelSource, /inspectFreeTextForPilot/)
  assert.match(observationModelSource, /pilotPrivacyErrorMessage/)
})

test('TE-1B clears the local observation draft only after a successful canonical receipt', () => {
  const receiptIndex = closeSource.indexOf('const receipt = await recordLessonExecution(formData)')
  const clearIndex = closeSource.indexOf('window.sessionStorage.removeItem(observationStorageKey)')
  assert.ok(receiptIndex >= 0, 'canonical receipt await must remain explicit')
  assert.ok(clearIndex > receiptIndex, 'observation draft must be cleared only after the canonical receipt')
  assert.match(closeSource, /catch \(error\)[\s\S]*setSaveError/)
})
