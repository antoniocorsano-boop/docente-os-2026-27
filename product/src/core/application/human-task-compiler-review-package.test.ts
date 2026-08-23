import assert from 'node:assert/strict'
import test from 'node:test'
import {
  approveHumanTaskCompilerReviewPackage,
  type HumanTaskCompilerReviewPackage,
} from './human-task-compiler-review-package'

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
    decision: 'PENDING',
  }
}

test('promotion refuses a human approval if process improvement was not assessed', () => {
  assert.throws(() => approveHumanTaskCompilerReviewPackage(readyPackage(), {
    decision: 'APPROVE',
    approvedAt: '2026-08-23T09:42:00+02:00',
    improvementReview: {
      policyVersion: 1,
      required: true,
      disposition: 'PENDING',
      note: 'non ancora valutato',
    },
  }), /miglioramento/i)
})

test('promotion accepts approval only after a closed improvement review', () => {
  const approved = approveHumanTaskCompilerReviewPackage(readyPackage(), {
    decision: 'APPROVE',
    approvedAt: '2026-08-23T09:42:00+02:00',
    improvementReview: {
      policyVersion: 1,
      required: true,
      disposition: 'SYSTEM_IMPROVEMENT_APPLIED',
      note: 'Registry generico e manifest dichiarativi introdotti.',
    },
  })

  assert.equal(approved.decision, 'APPROVE')
  assert.equal(approved.items.every((item) => item.decision === 'APPROVE'), true)
  assert.equal(approved.improvementReview.disposition, 'SYSTEM_IMPROVEMENT_APPLIED')
})
