import assert from 'node:assert/strict'
import test from 'node:test'
import { buildBlocks } from '@/app/piano-annuale/model'
import { resolveRuntimeHumanTaskLessonProjection } from './human-task-runtime'
import {
  EMPTY_G04_SELECTION,
  confirmG04Selection,
  isG04SessionConfirmed,
  resolveG04CriteriaProposal,
  toggleG04Criterion,
} from './curr-ref-g04-criteria'

function projection(blockId = 'B25') {
  const block = buildBlocks('Prima').find((item) => item.id === blockId)
  assert.ok(block)
  const result = resolveRuntimeHumanTaskLessonProjection('Prima', block)
  assert.ok(result)
  return result
}

test('G04 is bound only to the approved B25 lesson, without claiming an authoritative curricolo', () => {
  const proposal = resolveG04CriteriaProposal(projection())
  assert.ok(proposal)
  assert.equal(proposal.activityId, 'HTC-PRIMA-B25-PLAN-v1')
  assert.equal(proposal.udaCode, 'CAN-UDA-1-05')
  assert.equal(proposal.blockId, 'B25')
  assert.equal(proposal.localMasterReference, 'confrontare soluzioni')
  assert.equal(proposal.masterAuthority, 'PROVISIONAL_COMPLETE_NOT_IN_FORCE')
  assert.deepEqual(proposal.criteria.map((criterion) => [criterion.id, criterion.focus]), [
    ['CR-G01-01', 'process'],
    ['CR-G01-02', 'argumentation'],
  ])
  assert.equal(resolveG04CriteriaProposal(projection('B24')), null)
  assert.equal(resolveG04CriteriaProposal(projection('B26')), null)
})

test('G04 rejects mismatched content or source identity instead of silently reusing criteria', () => {
  const base = projection()
  const changes = [
    { projectionId: 'HTC-PRIMA-B25-PLAN-v2' },
    { blockId: 'B26' },
    { udaCode: '1-06' },
    { title: 'Un altro compito' },
    { objective: 'Obiettivo diverso' },
    { evidence: 'Evidenza diversa' },
    { durationMinutes: 60 },
    { observation: ['Altro indicatore'] },
    { sources: [...base.sources].reverse() },
    { sources: [{ ...base.sources[0], code: 'CAN-PLAN-2' }, base.sources[1]] },
  ]
  for (const changed of changes) {
    const bad = { ...base, ...changed }
    assert.equal(resolveG04CriteriaProposal(bad), null, JSON.stringify(changed))
  }
})

test('G04 selection requires teacher interaction and explicit local confirmation', () => {
  const proposal = resolveG04CriteriaProposal(projection())
  assert.ok(proposal)
  const start = EMPTY_G04_SELECTION
  assert.equal(isG04SessionConfirmed(start), false)
  const empty = confirmG04Selection(start, proposal)
  assert.equal(isG04SessionConfirmed(empty), false)
  const one = toggleG04Criterion(start, proposal, 'CR-G01-01')
  assert.deepEqual(one.selectedIds, ['CR-G01-01'])
  assert.equal(one.confirmedIds, null)
  const confirmed = confirmG04Selection(one, proposal)
  assert.deepEqual(confirmed.confirmedIds, ['CR-G01-01'])
  assert.equal(isG04SessionConfirmed(confirmed), true)
  const two = toggleG04Criterion(confirmed, proposal, 'CR-G01-02')
  assert.deepEqual(two.selectedIds, ['CR-G01-01', 'CR-G01-02'])
  assert.equal(isG04SessionConfirmed(two), false)
  assert.equal(two.confirmedIds, null)
  const confirmedTwo = confirmG04Selection(two, proposal)
  assert.equal(isG04SessionConfirmed(confirmedTwo), true)
  const deselected = toggleG04Criterion(confirmedTwo, proposal, 'CR-G01-01')
  assert.deepEqual(deselected.selectedIds, ['CR-G01-02'])
  assert.equal(isG04SessionConfirmed(deselected), false)
  assert.equal(deselected.confirmedIds, null)
})

test('G04 refuses unknown criteria and inconsistent confirmations', () => {
  const proposal = resolveG04CriteriaProposal(projection())
  assert.ok(proposal)
  assert.equal(toggleG04Criterion(EMPTY_G04_SELECTION, proposal, 'UNKNOWN'), EMPTY_G04_SELECTION)
  const fake = { selectedIds: ['CR-G01-01', 'CR-G01-01'] as ('CR-G01-01')[], confirmedIds: null }
  assert.deepEqual(confirmG04Selection(fake, proposal), EMPTY_G04_SELECTION)
  const outOfOrder = { selectedIds: ['CR-G01-02', 'CR-G01-01'] as ('CR-G01-01' | 'CR-G01-02')[], confirmedIds: null }
  assert.deepEqual(confirmG04Selection(outOfOrder, proposal), EMPTY_G04_SELECTION)
  assert.equal(isG04SessionConfirmed({
    selectedIds: ['CR-G01-01'],
    confirmedIds: ['CR-G01-02'],
  }), false)
})

test('G04 never handles individual observations, assessments or grades', () => {
  const proposal = resolveG04CriteriaProposal(projection())
  assert.ok(proposal)
  const serialized = JSON.stringify(proposal)
  for (const field of ['studentId', 'studentIds', 'gradeId', 'assessmentId', 'observationEventId', 'confirmedByTeacher', 'confirmedAt', 'numericGrade']) {
    assert.equal(serialized.includes(field), false)
  }
  assert.deepEqual(EMPTY_G04_SELECTION, { selectedIds: [], confirmedIds: null })
})
