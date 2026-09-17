import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const actionSource = readFileSync(new URL('./actions.ts', import.meta.url), 'utf8')

describe('H8-B3 explicit promotion boundary', () => {
  it('records replanning text only as TeachingSession reflection during lesson registration', () => {
    expect(actionSource).toContain("udaChangeProposal: udaChangeProposal ?? ''")
    expect(actionSource).not.toContain('buildTeachingSessionAdjustmentProposal')
    expect(actionSource).not.toContain('addToolProposalOnce')
    expect(actionSource).not.toContain('TEACHING_ADJUSTMENT')
  })
})
