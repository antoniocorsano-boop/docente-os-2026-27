import type { AnnualPlanSection } from '@/core/domain/annual-plan-execution'
import type { KnowledgeAsset } from '@/core/domain/knowledge'

const GRADE_NUMBER = { PRIMA: '1', SECONDA: '2', TERZA: '3' } as const
const CLASS_RESOURCE_MARKER = 'CLASS_LESSON_MATERIAL'

export type ClassroomStep = {
  title: string
  instruction: string
  cue: string | null
}

export type ClassroomSupportHints = {
  simpler: string[]
  examples: string[]
  checks: string[]
  visuals: string[]
}

export type ClassroomOpeningGuide = {
  hook: string
  bridge: string
  question: string
}

export type ClassroomSessionView = {
  assetId: string
  classLabel: string
  title: string
  targetDate: string | null
  providerLabel: string
  sourceHref: string
  approvalLabel: 'Predisposto' | 'Confermato'
  canonicalBindingLabel: string | null
  steps: ClassroomStep[]
  supportHints: ClassroomSupportHints
  imageGenerationAvailable: false
}

export function buildClassroomSessionView(section: AnnualPlanSection, asset: KnowledgeAsset): ClassroomSessionView | null {
  const classLabel = `${GRADE_NUMBER[section.grade]}${section.sectionCode}`.toUpperCase()
  if (asset.contentCategory !== 'TEACHING_RESOURCE') return null
  if (asset.sourceMetadata.docenteOsResource !== CLASS_RESOURCE_MARKER) return null
  if (!asset.classLabels.some((label) => normalizeClassLabel(label) === classLabel)) return null
  if (metadataString(asset.sourceMetadata, 'sectionId') && metadataString(asset.sourceMetadata, 'sectionId') !== section.id) return null
  if (!isSafeHttps(asset.sourceLocator)) return null

  const steps = classroomSteps(asset.sourceMetadata.classroomSteps)
  const supportHints = classroomSupportHints(asset.sourceMetadata.classroomSupport)
  const canonicalBinding = metadataString(asset.sourceMetadata, 'canonicalBinding')
  const canonicalBlockId = metadataString(asset.sourceMetadata, 'canonicalBlockId')

  return {
    assetId: asset.id,
    classLabel,
    title: asset.originalName?.trim() || 'Materiale della lezione',
    targetDate: metadataString(asset.sourceMetadata, 'targetDate'),
    providerLabel: metadataString(asset.sourceMetadata, 'provider') === 'CANVA' ? 'Canva' : metadataString(asset.sourceMetadata, 'provider') || 'Fonte esterna',
    sourceHref: asset.sourceLocator,
    approvalLabel: metadataString(asset.sourceMetadata, 'approvalState') === 'APPROVED' ? 'Confermato' : 'Predisposto',
    canonicalBindingLabel: canonicalBinding === 'ALIGNED' && canonicalBlockId
      ? `Allineato a ${canonicalBlockId}`
      : canonicalBinding === 'PRE_CANONICAL_DIAGNOSTIC'
        ? 'Diagnostica di accoglienza · non imputata al Piano'
        : null,
    steps,
    supportHints,
    imageGenerationAvailable: false,
  }
}

export function classroomOpeningGuide(view: ClassroomSessionView): ClassroomOpeningGuide {
  const firstStep = view.steps[0] ?? null
  const example = view.supportHints.examples[0]
  const simpler = view.supportHints.simpler[0]
  const check = view.supportHints.checks[0]

  return {
    hook: example || firstStep?.cue || firstStep?.instruction || `Parti da una situazione concreta collegata a ${view.title}.`,
    bridge: firstStep?.cue || simpler || firstStep?.instruction || `Porta gradualmente la classe al nucleo della lezione: ${view.title}.`,
    question: check || `Chiedi: «Che cosa notate, e perché potrebbe essere importante?»`,
  }
}

export function classroomSupportText(
  view: ClassroomSessionView,
  stepIndex: number,
  kind: 'HOOK' | 'SIMPLER' | 'EXAMPLE' | 'CHECK' | 'VISUAL',
): { title: string; text: string; generated: false } {
  const step = view.steps[stepIndex] ?? view.steps[0] ?? null
  const fallback = step?.instruction ?? view.title
  const hintIndex = Math.max(0, Math.min(stepIndex, Math.max(0, view.steps.length - 1)))

  if (kind === 'HOOK') {
    const opening = classroomOpeningGuide(view)
    return {
      title: 'Come aprire la lezione',
      text: `Parti da qui: ${opening.hook} Poi collega l’esperienza al concetto: ${opening.bridge} Chiudi l’aggancio con questa domanda: ${opening.question}`,
      generated: false,
    }
  }
  if (kind === 'SIMPLER') {
    return {
      title: 'Spiegazione più semplice',
      text: view.supportHints.simpler[hintIndex] || `Riparti da questo nucleo: ${fallback}`,
      generated: false,
    }
  }
  if (kind === 'EXAMPLE') {
    return {
      title: 'Esempio concreto',
      text: view.supportHints.examples[hintIndex] || `Collega il passaggio a un oggetto o a una situazione reale coerente con: ${fallback}`,
      generated: false,
    }
  }
  if (kind === 'CHECK') {
    return {
      title: 'Domanda flash',
      text: view.supportHints.checks[hintIndex] || `Chiedi: «Come spiegheresti con parole tue questo passaggio: ${step?.title ?? view.title}?»`,
      generated: false,
    }
  }
  return {
    title: 'Idea visuale',
    text: view.supportHints.visuals[hintIndex] || `Brief visuale: rappresenta ${step?.title ?? view.title} con uno schema semplice, etichette essenziali e nessun elemento decorativo non necessario.`,
    generated: false,
  }
}

function classroomSteps(value: unknown): ClassroomStep[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return []
    const raw = item as Record<string, unknown>
    const title = cleanString(raw.title)
    const instruction = cleanString(raw.instruction)
    if (!title || !instruction) return []
    return [{ title, instruction, cue: cleanString(raw.cue) }]
  }).slice(0, 12)
}

function classroomSupportHints(value: unknown): ClassroomSupportHints {
  const raw = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
  return {
    simpler: cleanStringArray(raw.simpler),
    examples: cleanStringArray(raw.examples),
    checks: cleanStringArray(raw.checks),
    visuals: cleanStringArray(raw.visuals),
  }
}

function cleanStringArray(value: unknown) {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => typeof item === 'string' && item.trim() ? [item.trim().slice(0, 900)] : []).slice(0, 12)
}

function cleanString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, 1200) : null
}

function metadataString(value: Record<string, unknown>, key: string) {
  return cleanString(value[key])
}

function normalizeClassLabel(value: string) {
  return value.trim().replace(/\s+/g, '').toUpperCase()
}

function isSafeHttps(value: string | null): value is string {
  if (!value) return false
  try {
    return new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}
