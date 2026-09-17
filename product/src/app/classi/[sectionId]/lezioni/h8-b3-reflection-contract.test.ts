import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const actionSource = readFileSync(new URL('./actions.ts', import.meta.url), 'utf8')
const clientSource = readFileSync(new URL('./[blockId]/lesson-close-client.tsx', import.meta.url), 'utf8')

describe('H8-B3 reflection-only replanning boundary', () => {
  it('captures a distinct optional UDA change proposal in the lesson close form', () => {
    expect(clientSource).toContain('name="udaChangeProposal"')
    expect(clientSource).toContain('Cosa cambieresti nel percorso?')
    expect(clientSource).toContain('non crea da sola una proposta di riprogettazione')
  })

  it('persists the reflection inside the TeachingSession evidence without creating a design extension', () => {
    expect(actionSource).toContain("optionalReflectionField(formData.get('udaChangeProposal'), 'UDA change proposal')")
    expect(actionSource).toContain("udaChangeProposal: udaChangeProposal ?? ''")
    expect(actionSource).not.toContain('persistTeachingSessionAdjustment')
    expect(actionSource).not.toContain('SupabaseLessonDesignRepository')
  })
})
