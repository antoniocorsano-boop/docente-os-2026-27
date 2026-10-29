import assert from 'node:assert/strict'
import test from 'node:test'
import type { TextbookAdoptionWithBook } from '@/core/domain/textbook-adoption'
import { buildProgettaTextbookSupport, type ResolvedProgettaFocus } from '@/app/progetta/progetta-model'

const focus: ResolvedProgettaFocus = {
  blockId: 'B03',
  uda: '1-01',
  pack: 'CAN-PACK-1A',
  period: 'Ottobre',
  title: 'Materiali e sostenibilità',
}

function adoption(input: {
  id: string
  assignmentId: string
  textbookId: string
  title: string
}): TextbookAdoptionWithBook {
  return {
    id: input.id,
    workspaceId: 'workspace-001',
    academicYearId: 'year-2026-27',
    teachingAssignmentId: input.assignmentId,
    textbookId: input.textbookId,
    usageKind: 'ADOPTED',
    sourceKind: 'MIM_OPEN_DATA',
    sourceRef: `mim:${input.id}`,
    status: 'CONFIRMED',
    confirmedBy: 'teacher-001',
    confirmedAt: '2026-09-01T08:00:00.000Z',
    createdBy: 'teacher-001',
    createdAt: '2026-09-01T07:00:00.000Z',
    updatedAt: '2026-09-01T08:00:00.000Z',
    textbook: {
      id: input.textbookId,
      workspaceId: 'workspace-001',
      academicYearId: 'year-2026-27',
      isbn13: input.textbookId === 'textbook-technology' ? '9788808950758' : '9788808123456',
      title: input.title,
      subtitle: null,
      authors: null,
      publisher: 'Editore',
      editionLabel: null,
      volumeLabel: null,
      officialUrl: null,
      publisherProductRef: null,
      createdBy: 'teacher-001',
      createdAt: '2026-09-01T07:00:00.000Z',
      updatedAt: '2026-09-01T07:00:00.000Z',
    },
  }
}

test('Progetta includes only textbook support from the canonical plan discipline', () => {
  const assignments = [
    { id: 'assignment-technology-1A', sectionId: 'section-1A', disciplineName: 'Tecnologia' },
    { id: 'assignment-math-1A', sectionId: 'section-1A', disciplineName: 'Matematica' },
  ]

  const result = buildProgettaTextbookSupport({
    sectionId: 'section-1A',
    focus,
    assignments,
    adoptions: [
      adoption({
        id: 'adoption-technology',
        assignmentId: 'assignment-technology-1A',
        textbookId: 'textbook-technology',
        title: 'Tecnologia.verde',
      }),
      adoption({
        id: 'adoption-math',
        assignmentId: 'assignment-math-1A',
        textbookId: 'textbook-math',
        title: 'Matematica in azione',
      }),
    ],
    validatedAlignments: [],
  })

  assert.deepEqual(result.map((support) => support.title), ['Tecnologia.verde'])
})
