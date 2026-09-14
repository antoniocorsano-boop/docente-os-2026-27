export type ClassTaskState = 'COMPLETE' | 'PREPARE' | 'TEACH' | 'RECORD' | 'AFTER_RECORD'

export type ClassTaskDecision = {
  state: ClassTaskState
  label: string | null
  lessonMode: 'prepare' | 'teach' | 'record' | null
  useInlineRecorder: boolean
  focusCompletion: boolean
}

export function resolveClassTaskDecision(input: {
  hasNextBlock: boolean
  hasModeledLesson: boolean
  hasSessionReceipt: boolean
  hasEligibleOccurrence: boolean
  occurrenceEnded: boolean
  maySuggestCompletion: boolean
}): ClassTaskDecision {
  if (!input.hasNextBlock) {
    return {
      state: 'COMPLETE',
      label: null,
      lessonMode: null,
      useInlineRecorder: false,
      focusCompletion: false,
    }
  }

  // A new unrecorded timetable occurrence is always the current task, even when
  // the URL still carries a valid receipt from an earlier session.
  if (input.hasEligibleOccurrence && input.occurrenceEnded) {
    return {
      state: 'RECORD',
      label: 'Registra la lezione',
      lessonMode: input.hasModeledLesson ? 'record' : null,
      useInlineRecorder: !input.hasModeledLesson,
      focusCompletion: false,
    }
  }

  if (input.hasEligibleOccurrence) {
    return {
      state: 'TEACH',
      label: input.hasModeledLesson ? 'Continua la lezione' : 'Apri il lavoro di classe',
      lessonMode: input.hasModeledLesson ? 'teach' : null,
      useInlineRecorder: false,
      focusCompletion: false,
    }
  }

  if (input.hasSessionReceipt && input.maySuggestCompletion) {
    return {
      state: 'AFTER_RECORD',
      label: 'Valuta il completamento',
      lessonMode: null,
      useInlineRecorder: false,
      // Keep the decision on the session-aware class surface: its confirmation
      // derives executedOn and provenance from the recorded TeachingSession.
      focusCompletion: true,
    }
  }

  if (input.hasSessionReceipt) {
    return {
      state: 'AFTER_RECORD',
      label: 'Prepara il prossimo incontro',
      lessonMode: input.hasModeledLesson ? 'prepare' : null,
      useInlineRecorder: false,
      focusCompletion: false,
    }
  }

  return {
    state: 'PREPARE',
    label: input.hasModeledLesson ? 'Prepara la lezione' : 'Prepara questa fase',
    lessonMode: input.hasModeledLesson ? 'prepare' : null,
    useInlineRecorder: false,
    focusCompletion: false,
  }
}
