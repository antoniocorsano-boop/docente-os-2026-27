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

  const question = buildGroundedQuestion(lessonTitle, objective)

  return {
    sectionId: input.sectionId,
    canonicalPlanAssetId: input.canonicalPlanAssetId,
    canonicalGenerationId: input.canonicalGenerationId,
    blockId: input.blockId,
    projectionId: input.projectionId,
    kind: 'HOOK_QUESTION',
    insertionPosition: 'START',
    anchorStepId: null,
    title: 'Domanda guida',
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

function buildGroundedQuestion(lessonTitle: string, objective: string) {
  const context = `${lessonTitle} ${objective}`.toLocaleLowerCase('it-IT')
  const title = shorten(lessonTitle, 120)

  if (/\bsistem[ai]\b/.test(context)) {
    const subject = shorten(lessonTitle.replace(/\s+come\s+sistema\b/i, '').trim() || lessonTitle, 120)
    return `Quali elementi di “${subject}” sono collegati tra loro e in che modo queste relazioni ci permettono di considerarlo un sistema?`
  }
  if (/\b(filiera|processo|processi|fasi)\b/.test(context)) {
    return `Quali passaggi sono indispensabili in “${title}” e come sono collegati tra loro?`
  }
  if (/\b(materiale|materiali|proprietà|proprieta)\b/.test(context)) {
    return `Quali proprietà permettono di distinguere i materiali coinvolti in “${title}” e di collegarli ai loro possibili usi?`
  }

  return `Osservando “${title}”, quali elementi o relazioni pensi siano decisivi? Motiva la risposta tenendo presente l’obiettivo della lezione.`
}

function collapse(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

function shorten(value: string, maxLength: number) {
  if (value.length <= maxLength) return value
  return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`
}
