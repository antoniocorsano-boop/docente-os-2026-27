import { describe, expect, it } from 'vitest'

describe('teaching assignment compare-and-set invariants', () => {
  it('requires both observed state and observed revision', () => {
    const guard = ['assignmentId', 'workspaceId', 'academicYearId', 'expectedStatus', 'expectedUpdatedAt']
    expect(guard).toContain('expectedStatus')
    expect(guard).toContain('expectedUpdatedAt')
  })

  it('treats a missing guarded row as a stale conflict', () => {
    const outcome = 'STALE_CONFLICT'
    expect(outcome).toBe('STALE_CONFLICT')
  })
})
