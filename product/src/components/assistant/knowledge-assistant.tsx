'use client'

import { useCallback } from 'react'
import { ContextualAssistantPanel } from './contextual-assistant-panel'
import {
  respondToKnowledgeAssistant,
  type KnowledgeAssistantContext,
} from '@/core/presentation/assistant-context'

const SUGGESTED_PROMPTS = [
  'Cosa contiene?',
  'Cosa devo controllare?',
  'Ci sono azioni o scadenze?',
  'Qual è il prossimo passo?',
] as const

export function KnowledgeAssistant({
  context,
  enabled = true,
  presentation = 'inline',
}: {
  context: KnowledgeAssistantContext
  enabled?: boolean
  presentation?: 'inline' | 'floating'
}) {
  const respond = useCallback((prompt: string) => respondToKnowledgeAssistant(context, prompt).text, [context])

  if (!enabled) return null

  return (
    <ContextualAssistantPanel
      presentation={presentation}
      lead="Leggo le informazioni disponibili per questo contenuto e rispondo usando solo ciò che il contesto sostiene. Le azioni restano sotto il tuo controllo."
      contextChips={[
        context.knowledge.category,
        context.knowledge.sourceLabel,
        context.knowledge.statusLabel,
        ...context.knowledge.classLabels,
        ...context.knowledge.disciplines,
      ]}
      suggestedPrompts={SUGGESTED_PROMPTS}
      conversationTitle="Parliamo di questo contenuto"
      placeholder="Es. Come viene affrontato questo tema?"
      respond={respond}
    />
  )
}
