'use client'

import { useCallback } from 'react'
import { ContextualAssistantPanel } from './contextual-assistant-panel'
import { PlannerCreateTaskAction } from './planner-create-task-action'
import {
  respondToTodayCopilotK2,
  type TodayCopilotK2Context,
} from '@/core/presentation/next-lesson-preparation'

const SUGGESTED_PROMPTS = [
  'Che lezioni ho oggi?',
  'Qual è la prossima lezione?',
  'Cosa devo fare oggi?',
  'Cosa devo ancora registrare?',
] as const

export function TodayAssistant({
  context,
  presentation = 'floating',
}: {
  context: TodayCopilotK2Context
  presentation?: 'inline' | 'floating'
}) {
  const respond = useCallback((prompt: string) => respondToTodayCopilotK2(context, prompt).text, [context])
  const t = context.today
  const p = context.planner
  const preparation = context.nextLessonPreparation

  const authorityChip = t.authority === 'PROVISIONAL_DRAFT'
    ? 'orario provvisorio'
    : t.authority === 'AMBIGUOUS'
      ? 'orario da verificare'
      : null

  return (
    <ContextualAssistantPanel
      presentation={presentation}
      lead="Leggo la giornata come un insieme: lezioni e orario, preparazione della prossima lezione, registrazioni ancora da fare e attività del Planner restano distinti, ma posso aiutarti a coordinarli."
      contextChips={[
        `${t.lessonCount} ${t.lessonCount === 1 ? 'lezione' : 'lezioni'}`,
        `${p.todayCount} ${p.todayCount === 1 ? 'attività oggi' : 'attività oggi'}`,
        `${t.pendingRegistrationCount} da registrare`,
        ...(preparation?.canonicalLesson ? [`${preparation.canonicalLesson.blockId} · prossimo blocco`] : []),
        ...(authorityChip ? [authorityChip] : []),
      ]}
      suggestedPrompts={SUGGESTED_PROMPTS}
      conversationTitle="Organizziamo la giornata"
      placeholder="Es. Qual è la prossima lezione?"
      safetyLabel="Distingue fatti, proposte e fonti"
      footerLabel="L’assistente legge Orario, Calendario, Piano annuale, Lesson Brief, Conoscenza, lezioni registrate e Planner come sorgenti distinte. Le modifiche richiedono percorsi separati e conferma."
      respond={respond}
      actionSlot={<PlannerCreateTaskAction localDate={p.localDate} />}
    />
  )
}
