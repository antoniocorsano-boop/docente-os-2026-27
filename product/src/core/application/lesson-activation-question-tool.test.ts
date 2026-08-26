import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildLessonActivationQuestionProposal,
  LESSON_ACTIVATION_QUESTION_TOOL_ID,
} from './lesson-activation-question-tool'

const input = {
  sectionId: 'section-1a',
  canonicalPlanAssetId: 'plan-asset-1',
  canonicalGenerationId: 'generation-1',
  blockId: 'B01',
  projectionId: 'projection-1',
  lessonTitle: 'Materiali e proprietà',
  objective: 'Riconoscere proprietà e usi dei materiali',
}

test('builds a local deterministic proposed activation question draft', () => {
  const proposal = buildLessonActivationQuestionProposal(input)

  assert.equal(proposal.kind, 'HOOK_QUESTION')
  assert.equal(proposal.insertionPosition, 'START')
  assert.equal(proposal.anchorStepId, null)
  assert.equal(proposal.minutes, 3)
  assert.equal(proposal.sourceKind, 'EDITORIAL_KNOWLEDGE')
  assert.equal(proposal.sourceRef, 'projection:projection-1')
  assert.equal(proposal.sourceLabel, 'Proiezione didattica canonica')
  assert.match(proposal.body, /Materiali e proprietà/)
  assert.equal(proposal.payload.toolId, LESSON_ACTIVATION_QUESTION_TOOL_ID)
  assert.equal(proposal.payload.dedupeKey, LESSON_ACTIVATION_QUESTION_TOOL_ID)
  assert.equal(proposal.payload.executionKind, 'LOCAL_DETERMINISTIC')
})

test('is deterministic for the same canonical lesson context', () => {
  assert.deepEqual(
    buildLessonActivationQuestionProposal(input),
    buildLessonActivationQuestionProposal(input),
  )
})

test('does not claim an external provider or direct acceptance', () => {
  const proposal = buildLessonActivationQuestionProposal(input)
  assert.notEqual(proposal.sourceKind, 'AI_TOOL')
  assert.equal('status' in proposal, false)
  assert.equal('acceptedBy' in proposal, false)
})

test('fails closed when canonical lesson grounding is incomplete', () => {
  assert.throws(
    () => buildLessonActivationQuestionProposal({ ...input, projectionId: ' ' }),
    /Projection id is required/,
  )
  assert.throws(
    () => buildLessonActivationQuestionProposal({ ...input, lessonTitle: ' ' }),
    /Lesson title is required/,
  )
  assert.throws(
    () => buildLessonActivationQuestionProposal({ ...input, objective: ' ' }),
    /Lesson objective is required/,
  )
})
