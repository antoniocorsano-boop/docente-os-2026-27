export type ClassTaskState = 'COMPLETE' | 'PREPARE' | 'TEACH' | 'RECORD' | 'CATCH_UP' | 'AFTER_RECORD'

export type ClassTaskDecision = {
  state: ClassTaskState
  label: string | null
  lessonMode: 'prepare' | 'teach' | 'record' | null
  useInlineRecorder: boolean
  focusCompletion: boolean
}

export type ClassTaskPresentation = {
  eyebrow: string
  hint: string
  nextStep: string
}

export type ClassRecorderEmptyPresentation = {
  title: string
  detail: string
  showScheduleLinks: boolean
}

export function isCurrentDaySessionReceipt(sessionLocalDate: string | null | undefined, today: string): boolean {
  return Boolean(sessionLocalDate && sessionLocalDate === today)
}

export function resolveClassTaskDecision(input: {
  hasNextBlock: boolean
  hasModeledLesson: boolean
  hasSessionReceipt: boolean
  hasEligibleOccurrence: boolean
  hasPendingPastOccurrence: boolean
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

  // A previous projected occurrence that is still unrecorded is a real pending
  // professional task. Keep it on the class surface so its timetable/calendar
  // provenance is preserved instead of silently falling back to PREPARE.
  if (input.hasPendingPastOccurrence) {
    return {
      state: 'CATCH_UP',
      label: 'Registra la lezione precedente',
      lessonMode: null,
      useInlineRecorder: true,
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

export function presentClassTaskState(state: ClassTaskState): ClassTaskPresentation {
  if (state === 'TEACH') {
    return {
      eyebrow: 'ADESSO · LEZIONE IN CORSO',
      hint: 'Continua dal punto di lavoro previsto per questa classe.',
      nextStep: 'Dopo la lezione, registra solo ciò che è realmente successo.',
    }
  }

  if (state === 'RECORD') {
    return {
      eyebrow: 'ADESSO · DA REGISTRARE',
      hint: 'La lezione è terminata: chiudi il lavoro prima di passare ad altro.',
      nextStep: 'Dopo la registrazione, DOCENTE OS ti mostrerà soltanto il prossimo passo utile.',
    }
  }

  if (state === 'CATCH_UP') {
    return {
      eyebrow: 'ADESSO · DA RECUPERARE',
      hint: 'C’è una lezione precedente non ancora registrata.',
      nextStep: 'Dopo la registrazione, DOCENTE OS ricalcolerà il lavoro corrente della classe.',
    }
  }

  if (state === 'AFTER_RECORD') {
    return {
      eyebrow: 'ADESSO · PROSSIMO PASSO',
      hint: 'La registrazione è acquisita. Rimane una sola decisione professionale alla volta.',
      nextStep: 'Dopo questa decisione, tornerai alla preparazione del prossimo incontro.',
    }
  }

  if (state === 'COMPLETE') {
    return {
      eyebrow: 'PERCORSO COMPLETATO',
      hint: 'Non ci sono altre lezioni attive da svolgere per questa classe.',
      nextStep: 'Consulta Piano e documentazione solo se devi verificare il percorso svolto.',
    }
  }

  return {
    eyebrow: 'ADESSO · PROSSIMA LEZIONE',
    hint: 'Prepara il prossimo tratto didattico utile per questa classe.',
    nextStep: 'Dopo la preparazione, entrerai nella lezione senza scegliere un altro modulo.',
  }
}

export function presentClassRecorderEmptyState(input: {
  calendarState: string
  hasSessionReceipt: boolean
  hasFutureOccurrence: boolean
}): ClassRecorderEmptyPresentation {
  if (input.calendarState === 'NO_LESSONS') {
    return {
      title: 'Nessuna lezione di oggi da registrare automaticamente.',
      detail: 'Il Calendario indica che oggi non si materializzano lezioni. Se devi recuperare una registrazione precedente, puoi indicare la data manualmente qui sotto.',
      showScheduleLinks: true,
    }
  }

  if (input.hasSessionReceipt) {
    return input.hasFutureOccurrence
      ? {
          title: 'Lezione registrata.',
          detail: 'La registrazione è acquisita. La prossima lezione di questa classe è prevista più tardi: non c’è altro da registrare adesso.',
          showScheduleLinks: false,
        }
      : {
          title: 'Lezione di oggi registrata.',
          detail: 'La registrazione è acquisita. Non ci sono altre lezioni di questa classe da registrare per oggi.',
          showScheduleLinks: false,
        }
  }

  if (input.calendarState === 'UNDETERMINED') {
    return {
      title: 'Nessuna lezione di oggi da registrare automaticamente.',
      detail: 'Il Calendario non ha ancora definito la giornata: DOCENTE OS non inventa una sessione. Se devi registrare una lezione precedente, puoi indicare la data manualmente qui sotto.',
      showScheduleLinks: true,
    }
  }

  return {
    title: 'Nessuna lezione di oggi da registrare automaticamente.',
    detail: 'Le lezioni già trascorse risultano registrate oppure non c’è un’occorrenza della classe in questa fascia. Puoi comunque registrare esplicitamente una lezione precedente.',
    showScheduleLinks: true,
  }
}
