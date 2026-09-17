import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

const actionSource = readFileSync(new URL('./actions.ts', import.meta.url), 'utf8')

describe('H8-B3 explicit promotion boundary', () => {
  it('records replanning text only as TeachingSession reflection during lesson registration', () => {
    assert.ok(actionSource.includes("udaChangeProposal: udaChangeProposal ?? ''"))
    assert.ok(!actionSource.includes('buildTeachingSessionAdjustmentProposal'))
    assert.ok(!actionSource.includes('addToolProposalOnce'))
    assert.ok(!actionSource.includes('TEACHING_ADJUSTMENT'))
  })
})
