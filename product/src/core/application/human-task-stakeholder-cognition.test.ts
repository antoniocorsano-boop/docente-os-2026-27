import assert from 'node:assert/strict'
import test from 'node:test'
import {
  HUMAN_TASK_STAKEHOLDER_COGNITIVE_POLICY,
  createPendingHumanTaskStakeholderCognitiveReview,
  isHumanTaskStakeholderCognitiveReviewComplete,
  type HumanTaskContextStakeholder,
  type HumanTaskStakeholderCognitiveReview,
} from './human-task-stakeholder-cognition'

function satisfiedReview(): HumanTaskStakeholderCognitiveReview {
  return {
    policyVersion: 1,
    required: true,
    assessments: (Object.entries(HUMAN_TASK_STAKEHOLDER_COGNITIVE_POLICY.requirements) as Array<[
      HumanTaskContextStakeholder,
      readonly string[],
    ]>).map(([stakeholder, questions]) => ({
      stakeholder,
      status: 'SATISFIED',
      answeredQuestions: [...questions],
      evidence: [`evidenza-${stakeholder}`],
      note: `Le domande cognitive di ${stakeholder} sono risolte da contenuto, provenienza e confine decisionale espliciti.`,
    })),
    note: 'Tutti gli stakeholder di contesto risultano serviti.',
  }
}

test('pending stakeholder cognition blocks promotion', () => {
  const review = createPendingHumanTaskStakeholderCognitiveReview()
  assert.equal(isHumanTaskStakeholderCognitiveReviewComplete(review), false)
  assert.equal(review.assessments.length, 4)
})

test('every contextual stakeholder must answer every required cognitive question', () => {
  const review = satisfiedReview()
  const learner = review.assessments.find((item) => item.stakeholder === 'LEARNER')
  assert.ok(learner)
  learner.answeredQuestions = learner.answeredQuestions.slice(1)
  assert.equal(isHumanTaskStakeholderCognitiveReviewComplete(review), false)
})

test('stakeholder cognition is complete only with satisfied status, evidence and audit note for all actors', () => {
  assert.equal(isHumanTaskStakeholderCognitiveReviewComplete(satisfiedReview()), true)
})
