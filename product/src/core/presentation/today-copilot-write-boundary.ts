import type { AssistantResponse } from './assistant-context'
import {
  respondToTodayCopilotK2,
  type TodayCopilotK2Context,
} from './next-lesson-preparation'

export function respondToGovernedTodayCopilot(
  context: TodayCopilotK2Context,
  prompt: string,
): AssistantResponse {
  if (isPlannerWriteIntent(prompt)) {
    return {
      actionKind: 'PROPOSE',
      answerStatus: 'SUPPORTED',
      grounding: {
        kind: 'PAGE_CONTEXT',
        evidenceCount: Math.max(1, context.provenance.length),
      },
      text: [
        '**Modifica del Planner**',
        'La richiesta implica una modifica del Planner e richiede un’azione separata e confermata.',
        '',
        '**Confine operativo**',
        'Da questa conversazione non completo, sposto, riapro, creo o elimino attività automaticamente.',
        'Nessuna attività è stata creata, completata, riaperta, spostata o eliminata.',
      ].join('\n'),
    }
  }

  return respondToTodayCopilotK2(context, prompt)
}

function isPlannerWriteIntent(prompt: string) {
  const normalized = prompt
    .toLocaleLowerCase('it-IT')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  const mentionsPlannerObject = [
    'attivita',
    'planner',
    'task',
  ].some((candidate) => normalized.includes(candidate))

  if (!mentionsPlannerObject) return false

  return [
    'completa',
    'completare',
    'sposta',
    'spostare',
    'riapri',
    'riaprire',
    'crea',
    'creare',
    'elimina',
    'eliminare',
  ].some((candidate) => normalized.includes(candidate))
}
