import assert from 'node:assert/strict'
import test from 'node:test'
import type { ProjectedOccurrence } from '@/core/application/temporal-projection-service'
import {
  completionProposal,
  teachingSessionCandidateFromOccurrence,
  validateTeachingSessionAllocations,
  type TeachingSessionDraft,
} from './teaching-session'

const occurrence: ProjectedOccurrence = {
  logicalId: 'tt:version-1:slot-1:2026-09-07',
  localDate: '2026-09-07',
  startAt: '2026-09-07T08:00:00',
  endAt: '2026-09-07T09:00:00',
  kind: 'LESSON',
  title: '1ª A · Tecnologia',
  sectionId: 'section-1a',
  disciplineId: 'technology',
  timetableVersionId: 'version-1',
  timetableSlotId: 'slot-1',
  calendarEventId: null,
  calendarState: 'SCHOOL_DAY',
  exceptionState: 'NONE',
  provenance: ['timetable_version:version-1', 'timetable_slot:slot-1', 'calendar_day:2026-09-07'],
}

function session(actualMinutes = 55): TeachingSessionDraft {
  return {
    ...teachingSessionCandidateFromOccurrence(occurrence),
    actualMinutes,
    evidenceNote: null,
  }
}

const context = {
  sectionId: 'section-1a',
  canonicalPlanAssetId: 'plan-asset',
  canonicalGenerationId: 'plan-generation',
}

test('a projected lesson becomes only a candidate and preserves source snapshot', () => {
  const candidate = teachingSessionCandidateFromOccurrence(occurrence)
  assert.equal(candidate.sectionId, 'section-1a')
  assert.equal(candidate.plannedMinutes, 60)
  assert.equal(candidate.source.sourceKind, 'PROJECTED_OCCURRENCE')
  assert.equal(candidate.source.projectedOccurrenceLogicalId, occurrence.logicalId)
  assert.deepEqual(candidate.source.provenance, occurrence.provenance)
  assert.notEqual(candidate.source.provenance, occurrence.provenance)
})

test('calendar events and non-class occurrences cannot become automatic teaching candidates', () => {
  assert.throws(() => teachingSessionCandidateFromOccurrence({ ...occurrence, kind: 'CALENDAR_EVENT', sectionId: null }))
  assert.throws(() => teachingSessionCandidateFromOccurrence({ ...occurrence, kind: 'DISPOSITION', sectionId: null }))
})

test('allocated minutes may be split across blocks but cannot exceed actual session minutes', () => {
  const valid = validateTeachingSessionAllocations({
    session: session(55),
    context,
    allocations: [
      { blockId: 'B01', minutes: 30, canonicalPlanAssetId: 'plan-asset', canonicalGenerationId: 'plan-generation' },
      { blockId: 'B02', minutes: 25, canonicalPlanAssetId: 'plan-asset', canonicalGenerationId: 'plan-generation' },
    ],
  })
  assert.equal(valid.valid, true)
  assert.equal(valid.allocatedMinutes, 55)
  assert.equal(valid.unallocatedMinutes, 0)

  const invalid = validateTeachingSessionAllocations({
    session: session(55),
    context,
    allocations: [
      { blockId: 'B01', minutes: 30, canonicalPlanAssetId: 'plan-asset', canonicalGenerationId: 'plan-generation' },
      { blockId: 'B02', minutes: 30, canonicalPlanAssetId: 'plan-asset', canonicalGenerationId: 'plan-generation' },
    ],
  })
  assert.equal(invalid.valid, false)
  assert.ok(invalid.codes.includes('ALLOCATION_EXCEEDS_SESSION'))
})

test('duplicate allocation to the same canonical block is rejected to prevent double counting', () => {
  const result = validateTeachingSessionAllocations({
    session: session(60),
    context,
    allocations: [
      { blockId: 'B01', minutes: 20, canonicalPlanAssetId: 'plan-asset', canonicalGenerationId: 'plan-generation' },
      { blockId: 'B01', minutes: 20, canonicalPlanAssetId: 'plan-asset', canonicalGenerationId: 'plan-generation' },
    ],
  })
  assert.equal(result.valid, false)
  assert.ok(result.codes.includes('DUPLICATE_BLOCK_ALLOCATION'))
})

test('allocation must remain pinned to the reviewed canonical plan generation', () => {
  const result = validateTeachingSessionAllocations({
    session: session(),
    context,
    allocations: [
      { blockId: 'B01', minutes: 30, canonicalPlanAssetId: 'another-plan', canonicalGenerationId: 'another-generation' },
    ],
  })
  assert.equal(result.valid, false)
  assert.ok(result.codes.includes('CANONICAL_CONTEXT_MISMATCH'))
})

test('only B01-B33 are accepted as canonical block identities', () => {
  const result = validateTeachingSessionAllocations({
    session: session(),
    context,
    allocations: [
      { blockId: 'B34', minutes: 30, canonicalPlanAssetId: 'plan-asset', canonicalGenerationId: 'plan-generation' },
    ],
  })
  assert.equal(result.valid, false)
  assert.ok(result.codes.includes('INVALID_BLOCK_ID'))
})

test('quantitative threshold may suggest completion but can never auto-complete a block', () => {
  assert.deepEqual(completionProposal({ allocatedMinutes: 120, plannedBlockMinutes: 120 }), {
    quantitativeThresholdReached: true,
    maySuggestCompletion: true,
    mayAutoComplete: false,
    requiresHumanDecision: true,
  })

  assert.equal(completionProposal({ allocatedMinutes: 90, plannedBlockMinutes: 120 }).maySuggestCompletion, false)
})
