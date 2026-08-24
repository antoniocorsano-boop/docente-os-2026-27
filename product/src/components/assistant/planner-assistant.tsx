'use client'

import { useCallback } from 'react'
import { ContextualAssistantPanel } from './contextual-assistant-panel'
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
      lead="Leggo le attività reali del Planner e ti aiuto a capire priorità, scadenze e ordine di lavoro. Non cambio lo stato delle attività."
      contextChips={[
        `${p.openCount} aperte`,
        `${p.overdueCount} scadute`,
        `${p.todayCount} oggi`,
        `${p.waitingCount} in attesa`,
      ]}
      suggestedPrompts={SUGGESTED_PROMPTS}
      conversationTitle="Organizziamo il Planner"
      placeholder="Es. Cosa devo affrontare prima oggi?"
      footerLabel="Solo lettura e proposte. Nessuna attività viene creata, completata o spostata automaticamente."
      respond={respond}
    />
  )
}
