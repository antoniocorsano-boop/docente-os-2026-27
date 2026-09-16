import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const actionsSource = readFileSync(new URL('./actions.ts', import.meta.url), 'utf8')
const closeSource = readFileSync(new URL('./[blockId]/lesson-close-client.tsx', import.meta.url), 'utf8')
const observeSource = readFileSync(new URL('./[blockId]/lesson-observe-client.tsx', import.meta.url), 'utf8')
const observationModelSource = readFileSync(new URL('./lesson-observation-model.ts', import.meta.url), 'utf8')
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

test('projected registration accepts an unclassified Calendar day only with identified timetable provenance', () => {
  assert.match(timetableFallbackMigrationSource, /source_calendar_state = 'SCHOOL_DAY'/)
  assert.match(timetableFallbackMigrationSource, /source_calendar_state = 'UNDETERMINED'/)
  assert.match(timetableFallbackMigrationSource, /source_timetable_version_id is not null/)
  assert.match(timetableFallbackMigrationSource, /source_timetable_slot_id is not null/)
  assert.doesNotMatch(timetableFallbackMigrationSource, /source_calendar_state\s*=\s*'NO_LESSONS'/)
})

test('lesson close no longer asks the teacher to decide plan status as part of registration', () => {
  assert.doesNotMatch(closeSource, /name=["']status["']/)
  assert.doesNotMatch(closeSource, /Svolta come prevista/)
  assert.match(closeSource, /name=["']localDate["']/)
  assert.match(closeSource, /name=["']actualMinutes["']/)
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
