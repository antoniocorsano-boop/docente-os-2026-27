import { discoverCopilotSkills, type CopilotEvidenceRef, type CopilotRunContext } from './copilot-kernel'
import {
  buildContextualCapture,
  buildContextualCaptureNextActivity,
  type ContextualCaptureEffectProposal,
  type ContextualCaptureSourceKind,
  type ContextualCaptureTarget,
} from '@/core/presentation/contextual-capture'
import {
  matchesLessonReflectionCaptureIntent,
  parseLessonReflectionCaptureRequest,
} from '@/core/presentation/contextual-capture-frontdoor'

export type LessonReflectionCaptureActionResult = {
  skillId: 'LESSON_REFLECTION'
  actionKind: 'PROPOSE'
  status: 'SUPPORTED' | 'BLOCKED'
  sourceKind: ContextualCaptureSourceKind
  effects: ContextualCaptureEffectProposal[]
  nextActivity: string | null
  persistentEffect: 'NONE'
  confirmationRequiredForPersistence: true
  provenance: CopilotEvidenceRef[]
  message?: string
}

export { matchesLessonReflectionCaptureIntent }

export function handleLessonReflectionCapture(input: {
  context: CopilotRunContext
  target: ContextualCaptureTarget
  prompt: string
}): LessonReflectionCaptureActionResult {
  const request = parseLessonReflectionCaptureRequest(input.prompt)
  if (!request) return blocked(input.context, 'Richiesta di riflessione non valida.')

  if (input.context.privacy.classification !== 'PROFESSIONAL' || input.context.privacy.providerPolicy !== 'NO_MODEL') {
    return blocked(input.context, 'Il contesto privacy non autorizza questa elaborazione locale.', request.sourceKind)
  }

  const candidate = discoverCopilotSkills({
    surface: input.context.run.surface,
    resources: input.context.resources,
    availableCapabilities: input.context.capabilities.available,
  }).find((item) => item.skill.id === 'LESSON_REFLECTION')

  if (!candidate || candidate.readiness === 'BLOCKED') {
    const reasons = [
      ...(candidate?.missingResources.map((item) => `Risorsa necessaria non disponibile: ${item}`) ?? []),
      ...(candidate?.ambiguousResources.map((item) => `Risorsa necessaria ambigua: ${item}`) ?? []),
      ...(candidate?.missingCapabilities.map((item) => `Capacità non disponibile: ${item}`) ?? []),
      ...input.context.missing,
    ]
    return blocked(input.context, reasons[0] ?? 'Contesto della lezione non sufficiente.', request.sourceKind)
  }

  const capture = buildContextualCapture({
    sourceKind: request.sourceKind,
    text: request.text,
    explicitTarget: input.target,
  })

  if (capture.binding.status !== 'RESOLVED') {
    return blocked(input.context, 'La nota non può essere collegata con certezza alla lezione corrente.', request.sourceKind)
  }

  return {
    skillId: 'LESSON_REFLECTION',
    actionKind: 'PROPOSE',
    status: 'SUPPORTED',
    sourceKind: capture.sourceKind,
    effects: capture.proposedEffects,
    nextActivity: buildContextualCaptureNextActivity(capture),
    persistentEffect: 'NONE',
    confirmationRequiredForPersistence: true,
    provenance: [...input.context.provenance],
  }
}

function blocked(
  context: CopilotRunContext,
  message: string,
  sourceKind: ContextualCaptureSourceKind = 'MANUAL_TEXT',
): LessonReflectionCaptureActionResult {
  return {
    skillId: 'LESSON_REFLECTION',
    actionKind: 'PROPOSE',
    status: 'BLOCKED',
    sourceKind,
    effects: [],
    nextActivity: null,
    persistentEffect: 'NONE',
    confirmationRequiredForPersistence: true,
    provenance: [...context.provenance],
    message,
  }
}
