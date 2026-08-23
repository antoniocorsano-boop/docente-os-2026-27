import assert from 'node:assert/strict'
import test from 'node:test'
import {
  approveHumanTaskCompilerReviewPackage,
  type HumanTaskCompilerReviewPackage,
} from './human-task-compiler-review-package'
import {
  HUMAN_TASK_STAKEHOLDER_COGNITIVE_POLICY,
  createPendingHumanTaskStakeholderCognitiveReview,
  type HumanTaskContextStakeholder,
  type HumanTaskStakeholderCognitiveReview,
} from './human-task-stakeholder-cognition'

function satisfiedCognition(): HumanTaskStakeholderCognitiveReview {
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
      evidence: [`evidence-${stakeholder}`],
      note: `Copertura cognitiva verificata per ${stakeholder}.`,
    })),
    note: 'Tutti gli stakeholder di contesto risultano cognitivamente serviti.',
  }
}

function readyPackage(): HumanTaskCompilerReviewPackage {
  return {
    packageVersion: 1,
    compilerVersion: 2,
    status: 'READY_FOR_HUMAN_REVIEW',
    promotion: 'HUMAN_APPROVAL_REQUIRED',
    grade: 'Prima',
    segmentKey: 'Prima:10',
    blockIds: ['B28'],
    sourceBindings: [
      { code: 'CAN-UDA-1-06', assetId: 'asset-uda', generationId: 'generation-uda' },
      { code: 'CAN-PACK-1F', assetId: 'asset-pack', generationId: 'generation-pack' },
    ],
    items: [{
      blockId: 'B28',
      title: 'Dai dati all’informazione',
      proposedRecipe: 'PACK_COMPOSED',
      proposedPackHeadings: ['1. Dalla domanda ai dati'],
      planActivity: 'domanda e dati',
      planEvidence: 'set dati ordinato',
      compilerNote: 'allineamento stabile',
      decision: 'PENDING',
    }],
    constraints: [],
    improvementReview: {
      policyVersion: 1,
      required: true,
      disposition: 'PENDING',
      note: 'non ancora valutato',
    },
    stakeholderCognitiveReview: createPendingHumanTaskStakeholderCognitiveReview(),
    decision: 'PENDING',
  }
}

test('promotion refuses a human approval if process improvement was not assessed', () => {
  assert.throws(() => approveHumanTaskCompilerReviewPackage(readyPackage(), {
    decision: 'APPROVE',
    approvedAt: '2026-08-23T10:29:00+02:00',
    improvementReview: {
      policyVersion: 1,
      required: true,
      disposition: 'PENDING',
      note: 'non ancora valutato',
    },
    stakeholderCognitiveReview: satisfiedCognition(),
  }), /miglioramento/i)
})

test('promotion refuses approval when any contextual stakeholder remains cognitively unresolved', () => {
  assert.throws(() => approveHumanTaskCompilerReviewPackage(readyPackage(), {
    decision: 'APPROVE',
    approvedAt: '2026-08-23T10:29:00+02:00',
    improvementReview: {
      policyVersion: 1,
      required: true,
      disposition: 'SYSTEM_IMPROVEMENT_APPLIED',
      note: 'Registry generico e manifest dichiarativi introdotti.',
    },
    stakeholderCognitiveReview: createPendingHumanTaskStakeholderCognitiveReview(),
  }), /cognitivo|stakeholder/i)
})

test('promotion accepts approval only after improvement and stakeholder cognition are both closed', () => {
  const approved = approveHumanTaskCompilerReviewPackage(readyPackage(), {
    decision: 'APPROVE',
    approvedAt: '2026-08-23T10:29:00+02:00',
    improvementReview: {
      policyVersion: 1,
      required: true,
      disposition: 'SYSTEM_IMPROVEMENT_APPLIED',
      note: 'Registry generico e manifest dichiarativi introdotti.',
    },
    stakeholderCognitiveReview: satisfiedCognition(),
  })

  assert.equal(approved.decision, 'APPROVE')
  assert.equal(approved.items.every((item) => item.decision === 'APPROVE'), true)
  assert.equal(approved.improvementReview.disposition, 'SYSTEM_IMPROVEMENT_APPLIED')
  assert.equal(approved.stakeholderCognitiveReview.assessments.every((item) => item.status === 'SATISFIED'), true)
})
