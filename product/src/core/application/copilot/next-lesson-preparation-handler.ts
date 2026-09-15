import {
  discoverCopilotSkills,
  type CopilotEvidenceRef,
  type CopilotRunContext,
} from './copilot-kernel'
import type {
  LessonMaterialRole,
  LessonPreparationManifestResult,
  LessonPreparationReadiness,
} from '@/core/presentation/lesson-preparation-manifest'
import type { NextLessonPreparation } from '@/core/presentation/next-lesson-preparation'
import { buildLessonPreparationRoleView } from '@/core/presentation/roleview-governance'

export type NextLessonPreparationActionResult = {
  skillId: 'NEXT_LESSON_PREPARATION'
  actionKind: 'PROPOSE'
  status: 'SUPPORTED' | 'PARTIAL' | 'BLOCKED'
  readiness: LessonPreparationReadiness | null
  headline: string
  whyNow: string
  ready: string[]
  missing: string[]
  proposals: string[]
  nextAction: string
  persistentEffect: 'NONE'
  confirmationRequiredForPersistence: true
  provenance: CopilotEvidenceRef[]
}

export function matchesNextLessonPreparationIntent(prompt: string) {
  const value = normalize(prompt)
  if (!value) return false
  const lesson = containsAny(value, ['lezione', 'lezioni'])
  const preparation = containsAny(value, ['prepara', 'preparare', 'preparazione', 'materiali', 'cosa preparo', 'cosa serve'])
  const next = containsAny(value, ['prossima', 'prossimo', 'domani', 'successiva', 'successivo'])
  return lesson && preparation && next
}

export function handleNextLessonPreparation(input: {
  context: CopilotRunContext
  preparation: NextLessonPreparation | null
  manifest: LessonPreparationManifestResult | null
}): NextLessonPreparationActionResult {
  const candidate = discoverCopilotSkills({
    surface: input.context.run.surface,
    resources: input.context.resources,
    availableCapabilities: input.context.capabilities.available,
  }).find((item) => item.skill.id === 'NEXT_LESSON_PREPARATION')

  const preparation = input.preparation
  if (!candidate || candidate.readiness === 'BLOCKED' || !preparation) {
    const reasons = unique([
      ...input.context.missing,
      ...(candidate?.missingResources.map((item) => `Risorsa necessaria non disponibile: ${item}`) ?? []),
      ...(candidate?.ambiguousResources.map((item) => `Risorsa necessaria ambigua: ${item}`) ?? []),
      ...(candidate?.missingCapabilities.map((item) => `Capacità non disponibile: ${item}`) ?? []),
      ...(!preparation ? ['Prossima lezione non risolta dal contesto temporale corrente'] : []),
    ])
    return blocked(preparation, reasons, input.context)
  }

  if (!input.manifest) {
    return blocked(
      preparation,
      unique([...input.context.missing, 'Manifesto di preparazione non disponibile']),
      input.context,
    )
  }

  const roleView = buildLessonPreparationRoleView(input.manifest, 'TEACHER')
  if (roleView.status === 'BLOCKED' || input.manifest.resolution === 'BLOCKED' || !input.manifest.manifest) {
    return blocked(
      preparation,
      unique([
        ...input.context.missing,
        ...roleView.blockers.map((item) => item.label),
      ]),
      input.context,
      roleView.nextActions[0]?.label,
    )
  }

  const manifest = input.manifest.manifest
  const readySlots = manifest.materialSlots.filter((slot) => slot.status === 'READY')
  const missingSlots = manifest.materialSlots.filter((slot) => slot.status === 'MISSING' && slot.required)
  const proposedSlots = manifest.materialSlots.filter((slot) => slot.status === 'PROPOSED')

  const ready = unique([
    ...(manifest.sequence.length ? [`Sequenza didattica pronta: ${manifest.sequence.length} passaggi`] : []),
    ...readySlots.flatMap((slot) => slot.titles.length ? slot.titles : [roleLabel(slot.role)]),
    ...manifest.supportingMaterials.map((item) => `${item.title} · ${item.relevanceLabel}`),
  ])
  const missing = unique([
    ...manifest.missingInformation,
    ...missingSlots.map((slot) => `Da preparare: ${roleLabel(slot.role)}`),
  ])
  const proposals = unique([
    ...proposedSlots.flatMap((slot) => slot.titles.length
      ? slot.titles.map((title) => `Da rivedere: ${title}`)
      : [`Da rivedere: ${roleLabel(slot.role)}`]),
    ...manifest.proposedExtensionRefs.map(() => 'È presente una proposta didattica non ancora accettata'),
  ])

  return {
    skillId: 'NEXT_LESSON_PREPARATION',
    actionKind: 'PROPOSE',
    status: roleView.status === 'READY' ? 'SUPPORTED' : 'PARTIAL',
    readiness: manifest.readiness,
    headline: `${roleView.headline} · ${preparation.lesson.title}`,
    whyNow: whyNow(preparation),
    ready,
    missing,
    proposals,
    nextAction: roleView.nextActions[0]?.label ?? 'Rivedi la preparazione prima della lezione.',
    persistentEffect: 'NONE',
    confirmationRequiredForPersistence: true,
    provenance: [...input.context.provenance],
  }
}

function blocked(
  preparation: NextLessonPreparation | null,
  reasons: string[],
  context: CopilotRunContext,
  nextAction?: string,
): NextLessonPreparationActionResult {
  return {
    skillId: 'NEXT_LESSON_PREPARATION',
    actionKind: 'PROPOSE',
    status: 'BLOCKED',
    readiness: null,
    headline: preparation ? `Preparazione di ${preparation.lesson.title}` : 'Preparazione della prossima lezione',
    whyNow: preparation
      ? whyNow(preparation)
      : 'Il contesto corrente non consente di determinare in modo affidabile la prossima lezione.',
    ready: [],
    missing: reasons.length ? reasons : ['Contesto necessario non disponibile'],
    proposals: [],
    nextAction: nextAction ?? 'Verifica il contesto mancante prima di preparare o modificare materiali.',
    persistentEffect: 'NONE',
    confirmationRequiredForPersistence: true,
    provenance: [...context.provenance],
  }
}

function whyNow(preparation: NextLessonPreparation) {
  const start = preparation.lesson.startAt.slice(11, 16)
  return `È la prossima lezione risolta dal contesto temporale corrente, prevista alle ${start}.`
}

function roleLabel(role: LessonMaterialRole) {
  const labels: Record<LessonMaterialRole, string> = {
    TEACHER_BRIEF: 'guida docente',
    LIM_VIEW: 'vista LIM',
    STUDENT_HANDOUT: 'scheda studenti',
    MINI_DECK: 'mini-presentazione',
    VISUAL_AID: 'supporto visuale',
    ASSESSMENT: 'controllo formativo',
  }
  return labels[role]
}

function normalize(value: string) {
  return value.toLocaleLowerCase('it-IT').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
}

function containsAny(value: string, needles: string[]) {
  return needles.some((needle) => value.includes(needle))
}

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))]
}
