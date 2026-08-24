'use client'

import { useCallback } from 'react'
import { ContextualAssistantPanel } from './contextual-assistant-panel'
import { PlannerCreateTaskAction } from './planner-create-task-action'
import {
  respondToPlannerAssistant,
  type PlannerAssistantContext,
} from '@/core/presentation/planner-assistant-context'

const SUGGESTED_PROMPTS = [
  'Cosa devo fare?',
  'Cosa viene prima?',
  'Come organizzo oggi?',
  'Cosa è in attesa?',
] as const

export function PlannerAssistant({
  context,
  presentation = 'floating',
}: {
  context: PlannerAssistantContext
  presentation?: 'inline' | 'floating'
}) {
  const respond = useCallback((prompt: string) => respondToPlannerAssistant(context, prompt).text, [context])
  const p = context.planner

  return (
    <ContextualAssistantPanel
      presentation={presentation}
      lead="Leggo le attività reali del Planner e ti aiuto a capire priorità, scadenze e ordine di lavoro. Se vuoi creare una nuova attività, uso un percorso separato con anteprima e conferma esplicita."
      contextChips={[
        `${p.openCount} aperte`,
        `${p.overdueCount} scadute`,
        `${p.todayCount} oggi`,
        `${p.waitingCount} in attesa`,
      ]}
      suggestedPrompts={SUGGESTED_PROMPTS}
      conversationTitle="Organizziamo il Planner"
      placeholder="Es. Cosa devo affrontare prima oggi?"
      safetyLabel="Scrive solo dopo conferma"
      footerLabel="L’assistente resta in lettura/proposta. La sola creazione di un’attività usa un gate separato con anteprima, conferma e annullamento."
      respond={respond}
      actionSlot={<PlannerCreateTaskAction localDate={p.localDate} />}
    />
  )
}
