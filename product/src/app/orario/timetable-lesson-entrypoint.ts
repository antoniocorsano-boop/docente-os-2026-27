import { buildCanonicalLessonWorkspaceHref } from '@/core/presentation/lesson-workspace-route'

export type TimetableLessonEntrypoint =
  | { kind: 'LESSON'; href: string }
  | { kind: 'CLASS'; href: string }
  | { kind: 'AMBIGUOUS' }

export function resolveTimetableLessonEntrypoint(input: {
  mode: 'view' | 'update' | 'manage'
  sectionId: string | null
  blockId: string | null
  localDate: string | null
  occurrenceLogicalId: string | null
  ambiguous: boolean
}): TimetableLessonEntrypoint | null {
  if (input.mode !== 'view') return null
  if (input.ambiguous) return { kind: 'AMBIGUOUS' }
  if (!input.sectionId) return null

  if (!input.blockId) {
    return {
      kind: 'CLASS',
      href: `/classi/${encodeURIComponent(input.sectionId)}`,
    }
  }

  return {
    kind: 'LESSON',
    href: buildCanonicalLessonWorkspaceHref(input.sectionId, input.blockId, {
      localDate: input.localDate,
      occurrenceLogicalId: input.occurrenceLogicalId,
    }),
  }
}
