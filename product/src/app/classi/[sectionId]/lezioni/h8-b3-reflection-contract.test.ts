import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

const actionSource = readFileSync(new URL('./actions.ts', import.meta.url), 'utf8')
const clientSource = readFileSync(new URL('./[blockId]/lesson-close-client.tsx', import.meta.url), 'utf8')

describe('H8-B3 reflection-only replanning boundary', () => {
  it('captures a distinct optional UDA change proposal in the lesson close form', () => {
    assert.ok(clientSource.includes('name="udaChangeProposal"'))
    assert.ok(clientSource.includes('Cosa cambieresti nel percorso?'))
    assert.ok(clientSource.includes('non crea da sola una proposta di riprogettazione'))
  })

  it('persists the reflection inside the TeachingSession evidence without creating a design extension', () => {
    assert.ok(actionSource.includes("optionalReflectionField(formData.get('udaChangeProposal'), 'UDA change proposal')"))
    assert.ok(actionSource.includes("udaChangeProposal: udaChangeProposal ?? ''"))
    assert.ok(!actionSource.includes('persistTeachingSessionAdjustment'))
    assert.ok(!actionSource.includes('SupabaseLessonDesignRepository'))
  })
})
