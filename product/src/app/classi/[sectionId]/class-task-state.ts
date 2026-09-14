export type ClassTaskState = 'COMPLETE' | 'PREPARE' | 'TEACH' | 'RECORD' | 'AFTER_RECORD'

export type ClassTaskDecision = {
  state: ClassTaskState
  label: string | null
  lessonMode: 'prepare' | 'teach' | 'record' | null
  useInlineRecorder: boolean
}

export function resolveClassTaskDecision(input: {
  hasNextBlock: boolean
  hasModeledLesson: boolean
  hasSessionReceipt: boolean
  hasEligibleOccurrence: boolean
  occurrenceEnded: boolean
}): ClassTaskDecision {
  if (!input.hasNextBlock) {
    return {
      state: 'COMPLETE',
      label: null,
      lessonMode: null,
      useInlineRecorder: false,
    }
  }

  if (input.hasSessionReceipt) {
    return {
      state: 'AFTER_RECORD',
      label: 'Prepara il prossimo incontro',
      lessonMode: input.hasModeledLesson ? 'prepare' : null,
      useInlineRecorder: false,
    }
  }

  if (input.hasEligibleOccurrence && input.occurrenceEnded) {
    return {
      state: 'RECORD',
      label: 'Registra la lezione',
      lessonMode: input.hasModeledLesson ? 'record' : null,
      useInlineRecorder: !input.hasModeledLesson,
    }
  }

  if (input.hasEligibleOccurrence) {
    return {
      state: 'TEACH',
      label: input.hasModeledLesson ? 'Continua la lezione' : 'Apri il lavoro di classe',
      lessonMode: input.hasModeledLesson ? 'teach' : null,
      useInlineRecorder: false,
    }
  }

  return {
    state: 'PREPARE',
    label: input.hasModeledLesson ? 'Prepara la lezione' : 'Prepara questa fase',
    lessonMode: input.hasModeledLesson ? 'prepare' : null,
    useInlineRecorder: false,
  }
}
