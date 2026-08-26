import type { LessonDesignExtensionDraft } from '@/core/domain/lesson-design-extension'

export const LESSON_ACTIVATION_QUESTION_TOOL_ID = 'LESSON_ACTIVATION_QUESTION_V1'

export type LessonActivationQuestionToolInput = {
  sectionId: string
  canonicalPlanAssetId: string
  canonicalGenerationId: string
  blockId: string
  projectionId: string
  lessonTitle: string
  objective: string
}

export function buildLessonActivationQuestionProposal(
  input: LessonActivationQuestionToolInput,
): LessonDesignExtensionDraft {
  const lessonTitle = collapse(input.lessonTitle)
  const objective = collapse(input.objective)
  if (!lessonTitle) throw new Error('Lesson title is required')
  if (!objective) throw new Error('Lesson objective is required')
  if (!input.projectionId.trim()) throw new Error('Projection id is required')

  const question = `Che cosa sai già su “${shorten(lessonTitle, 150)}” e quale domanda vorresti riuscire a chiarire entro la fine della lezione?`

  return {
    sectionId: input.sectionId,
    canonicalPlanAssetId: input.canonicalPlanAssetId,
    canonicalGenerationId: input.canonicalGenerationId,
    blockId: input.blockId,
    projectionId: input.projectionId,
    kind: 'HOOK_QUESTION',
    insertionPosition: 'START',
    anchorStepId: null,
    title: 'Domanda di attivazione',
    body: question,
    cue: 'Raccogli poche risposte senza correggerle subito; riprendile alla fine per rendere visibile che cosa è cambiato.',
    minutes: 3,
    sourceKind: 'EDITORIAL_KNOWLEDGE',
    sourceRef: `projection:${input.projectionId}`,
    sourceLabel: 'Proiezione didattica canonica',
    payload: {
      toolId: LESSON_ACTIVATION_QUESTION_TOOL_ID,
      dedupeKey: LESSON_ACTIVATION_QUESTION_TOOL_ID,
      executionKind: 'LOCAL_DETERMINISTIC',
      grounding: {
        blockId: input.blockId,
        projectionId: input.projectionId,
        lessonTitle,
        objective,
      },
    },
  }
}

function collapse(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

function shorten(value: string, maxLength: number) {
  if (value.length <= maxLength) return value
  return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`
}
