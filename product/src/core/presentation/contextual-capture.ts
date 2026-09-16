import type { LessonCopilotContext } from './teacher-copilot-context'

export type ContextualCaptureSourceKind = 'MANUAL_TEXT' | 'EPHEMERAL_TRANSCRIPT'
export type ContextualCaptureBindingStatus = 'RESOLVED' | 'CONFIRM_REQUIRED' | 'BLOCKED'

export type ContextualCaptureProposalKind =
  | 'LESSON_EXECUTION_NOTE'
  | 'PROFESSIONAL_OBSERVATION'
  | 'NEXT_LESSON_FOCUS'
  | 'PREPARATION_NEED'
  | 'REMINDER_CANDIDATE'

export type ContextualCaptureTarget = {
  sectionId: string
  sectionLabel?: string
  blockId?: string
  projectionId?: string
  lessonRef?: string
  localDate?: string
  provenance: Array<{
    kind: string
    ref?: string
    label?: string
  }>
}

export type ContextualCaptureEffectProposal = {
  kind: ContextualCaptureProposalKind
  summary: string
}

export type ContextualCaptureResult = {
  actionKind: 'PROPOSE'
  sourceKind: ContextualCaptureSourceKind
  binding: {
    status: ContextualCaptureBindingStatus
    target: ContextualCaptureTarget | null
    candidates: ContextualCaptureTarget[]
    reason: string
  }
  proposedEffects: ContextualCaptureEffectProposal[]
  persistenceEligible: false
  requiresHumanConfirmation: true
  provenance: ContextualCaptureTarget['provenance']
}

export type ContextualCaptureInput = {
  sourceKind: ContextualCaptureSourceKind
  text: string
  explicitLessonContext?: LessonCopilotContext | null
  currentSessionTargets?: ContextualCaptureTarget[]
  temporalTargets?: ContextualCaptureTarget[]
  weakLastOpenedTarget?: ContextualCaptureTarget | null
}

export function buildContextualCapture(input: ContextualCaptureInput): ContextualCaptureResult {
  if (contextualCaptureContainsRawAudio(input)) {
    return blocked(input.sourceKind, 'RAW_AUDIO_NOT_ALLOWED')
  }

  const text = normalizeText(input.text)

  if (!text) {
    return blocked(input.sourceKind, 'EMPTY_INPUT')
  }

  const explicitTarget = input.explicitLessonContext
    ? targetFromLessonContext(input.explicitLessonContext)
    : null

  if (explicitTarget) {
    return resolved(input.sourceKind, text, explicitTarget, 'EXPLICIT_LESSON_CONTEXT')
  }

  const currentSessionTargets = uniqueTargets(input.currentSessionTargets ?? [])
  if (currentSessionTargets.length === 1) {
    return resolved(input.sourceKind, text, currentSessionTargets[0], 'CURRENT_SESSION_UNIQUE')
  }
  if (currentSessionTargets.length > 1) {
    return confirmRequired(input.sourceKind, text, currentSessionTargets, 'CURRENT_SESSION_AMBIGUOUS')
  }

  const temporalTargets = uniqueTargets(input.temporalTargets ?? [])
  if (temporalTargets.length === 1) {
    return resolved(input.sourceKind, text, temporalTargets[0], 'TEMPORAL_TARGET_UNIQUE')
  }
  if (temporalTargets.length > 1) {
    return confirmRequired(input.sourceKind, text, temporalTargets, 'TEMPORAL_TARGET_AMBIGUOUS')
  }

  if (input.weakLastOpenedTarget) {
    return confirmRequired(
      input.sourceKind,
      text,
      [input.weakLastOpenedTarget],
      'WEAK_LAST_OPENED_SIGNAL',
    )
  }

  return blocked(input.sourceKind, 'NO_SUFFICIENT_CONTEXT')
}

export function contextualCaptureContainsRawAudio(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false
  const forbiddenKeys = new Set(['audio', 'rawAudio', 'audioBytes', 'audioBlob', 'recording', 'media'])
  const queue: unknown[] = [value]

  while (queue.length) {
    const current = queue.shift()
    if (!current || typeof current !== 'object') continue

    for (const [key, nested] of Object.entries(current)) {
      if (forbiddenKeys.has(key)) return true
      if (nested && typeof nested === 'object') queue.push(nested)
    }
  }

  return false
}

function resolved(
  sourceKind: ContextualCaptureSourceKind,
  text: string,
  target: ContextualCaptureTarget,
  reason: string,
): ContextualCaptureResult {
  return {
    actionKind: 'PROPOSE',
    sourceKind,
    binding: {
      status: 'RESOLVED',
      target,
      candidates: [target],
      reason,
    },
    proposedEffects: classifyCapture(text),
    persistenceEligible: false,
    requiresHumanConfirmation: true,
    provenance: target.provenance.map((item) => ({ ...item })),
  }
}

function confirmRequired(
  sourceKind: ContextualCaptureSourceKind,
  text: string,
  candidates: ContextualCaptureTarget[],
  reason: string,
): ContextualCaptureResult {
  const uniqueCandidates = uniqueTargets(candidates)
  return {
    actionKind: 'PROPOSE',
    sourceKind,
    binding: {
      status: 'CONFIRM_REQUIRED',
      target: null,
      candidates: uniqueCandidates,
      reason,
    },
    proposedEffects: classifyCapture(text),
    persistenceEligible: false,
    requiresHumanConfirmation: true,
    provenance: uniqueCandidates.flatMap((candidate) => candidate.provenance.map((item) => ({ ...item }))),
  }
}

function blocked(sourceKind: ContextualCaptureSourceKind, reason: string): ContextualCaptureResult {
  return {
    actionKind: 'PROPOSE',
    sourceKind,
    binding: {
      status: 'BLOCKED',
      target: null,
      candidates: [],
      reason,
    },
    proposedEffects: [],
    persistenceEligible: false,
    requiresHumanConfirmation: true,
    provenance: [],
  }
}

function targetFromLessonContext(context: LessonCopilotContext): ContextualCaptureTarget {
  return {
    sectionId: context.lesson.sectionId,
    sectionLabel: context.lesson.sectionLabel,
    blockId: context.lesson.blockId,
    projectionId: context.lesson.projectionId,
    lessonRef: context.object?.id,
    provenance: context.provenance.map((item) => ({ ...item })),
  }
}

function classifyCapture(text: string): ContextualCaptureEffectProposal[] {
  const normalized = normalizeForMatch(text)
  const effects: ContextualCaptureEffectProposal[] = []

  addIf(effects, 'LESSON_EXECUTION_NOTE', normalized, [
    'abbiamo fatto', 'ho fatto', 'abbiamo svolto', 'ho svolto', 'abbiamo spiegato', 'ho spiegato',
    'siamo arrivati', 'abbiamo completato', 'ho completato',
  ])
  addIf(effects, 'PROFESSIONAL_OBSERVATION', normalized, [
    'difficolta', 'non hanno capito', 'non ha capito', 'hanno capito', 'ha capito', 'confus', 'interesse',
    'partecip', 'fatica', 'incert',
  ])
  addIf(effects, 'NEXT_LESSON_FOCUS', normalized, [
    'prossima lezione', 'la prossima', 'riprendere', 'riprendiamo', 'continuare', 'continuiamo', 'tornare su',
  ])
  addIf(effects, 'PREPARATION_NEED', normalized, [
    'preparare', 'preparo', 'materiale', 'scheda', 'esempio', 'immagine', 'presentazione', 'stampare',
  ])
  addIf(effects, 'REMINDER_CANDIDATE', normalized, [
    'ricordami', 'ricordare', 'promemoria', 'devo fare', 'non dimenticare',
  ])

  if (effects.length === 0) {
    effects.push({
      kind: 'PROFESSIONAL_OBSERVATION',
      summary: text,
    })
  }

  return effects.slice(0, 3).map((effect) => ({ ...effect, summary: text }))
}

function addIf(
  effects: ContextualCaptureEffectProposal[],
  kind: ContextualCaptureProposalKind,
  normalized: string,
  signals: string[],
) {
  if (signals.some((signal) => normalized.includes(signal))) {
    effects.push({ kind, summary: normalized })
  }
}

function uniqueTargets(targets: ContextualCaptureTarget[]) {
  const seen = new Set<string>()
  const result: ContextualCaptureTarget[] = []

  for (const target of targets) {
    const key = [target.sectionId, target.blockId ?? '', target.projectionId ?? '', target.lessonRef ?? '', target.localDate ?? ''].join('|')
    if (seen.has(key)) continue
    seen.add(key)
    result.push({
      ...target,
      provenance: target.provenance.map((item) => ({ ...item })),
    })
  }

  return result
}

function normalizeText(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

function normalizeForMatch(value: string) {
  return normalizeText(value)
    .toLocaleLowerCase('it-IT')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}
