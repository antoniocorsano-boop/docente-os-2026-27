'use client'

import { useCallback } from 'react'
import { ContextualAssistantPanel } from './contextual-assistant-panel'
import {
  fallbackLessonCopilotResponse,
  type LessonCopilotContext,
} from '@/core/presentation/teacher-copilot-context'

const SUGGESTED_PROMPTS = [
  'Cosa devo preparare?',
  'Cosa è già pronto?',
  'Come posso iniziare?',
  'Cosa devo tenere d’occhio?',
] as const

export function LessonAssistant({
  context,
  presentation = 'floating',
}: {
  context: LessonCopilotContext
  presentation?: 'inline' | 'floating'
}) {
  const respond = useCallback(async (prompt: string) => {
    try {
      const response = await fetch('/api/assistant/lesson-respond', {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sectionId: context.lesson.sectionId,
          blockId: context.lesson.blockId,
          prompt,
        }),
      })
      if (!response.ok) throw new Error(`lesson-copilot-${response.status}`)
      const payload = await response.json() as { text?: unknown }
      if (typeof payload.text !== 'string' || !payload.text.trim()) throw new Error('lesson-copilot-invalid-response')
      return payload.text
    } catch {
      // Manual work remains available even if the model/provider route fails.
      return fallbackLessonCopilotResponse(context, prompt).text
    }
  }, [context])

  return (
    <ContextualAssistantPanel
      presentation={presentation}
      eyebrow="COPILOTA DELLA LEZIONE"
      title="Come posso aiutarti qui?"
      lead="Conosco il brief di questa lezione, le fonti che lo sostengono e ciò che risulta già pronto. Posso spiegare e proporre; non registro né modifico il Piano automaticamente."
      contextChips={[
        context.lesson.sectionLabel,
        context.discipline ?? 'Disciplina da verificare',
        context.lesson.udaTitle,
        context.lesson.readyCount > 0 ? `${context.lesson.readyCount} risorse pronte` : 'Preparazione base',
      ]}
      suggestedPrompts={SUGGESTED_PROMPTS}
      conversationTitle={`Copilota · ${context.lesson.sectionLabel}`}
      placeholder="Es. Aiutami a preparare questa lezione"
      safetyLabel="Propone, non modifica"
      footerLabel="Il contesto viene ricostruito lato server. Nessuna modifica persistente avviene in questa fase."
      respond={respond}
    />
  )
}
