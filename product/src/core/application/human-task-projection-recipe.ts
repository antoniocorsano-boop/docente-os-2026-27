import type { GradeKey } from '@/app/piano-annuale/model'
import type {
  ExtractedPack,
  ExtractedPackSection,
  ExtractedUdaSection,
  HumanTaskContentCandidate,
  PackSectionKind,
} from './human-task-content-pipeline'

export type ProjectionRecipeAlignment = {
  level: 'DIRECT' | 'COMPOSED'
  note?: string
}

export type ProjectionRecipeResourceKind = 'STUDENT_SHEET' | 'EXIT_TICKET' | 'TASK_BRIEF' | 'RUBRIC' | 'ASSESSMENT_GUIDE'
export type ProjectionRecipeSurface = 'PREPARE' | 'OBSERVE'

export type ProjectionRecipePlanBinding = {
  planSourceCode: string
  segmentKey: string
  udaCode: string
  packCode: string
  supportPackCodes: string[]
  title: string
}

export type ProjectionRecipeResourceBinding = {
  id: string
  packCode: string
  heading: string
  kind: ProjectionRecipeResourceKind
  surfaces?: ProjectionRecipeSurface[]
  attachToStep?: number
}

export type HumanTaskProjectionRecipe = {
  recipeId: string
  candidateId: string
  grade: GradeKey
  blockId: string
  planBinding: ProjectionRecipePlanBinding
  sourceAlignment: ProjectionRecipeAlignment
  guide: {
    packCode: string
    heading: string
  }
  supportingUdaPhaseOrdinals: number[]
  outcomes: {
    udaSectionHeading: string
    itemIndexes: number[]
  }
  observation: {
    udaSectionHeading: string
    itemIndexes: number[]
  }
  resources: ProjectionRecipeResourceBinding[]
  editorial: {
    why: string
    objective: string
    assessmentNote: string
    continuation: string
  }
}

export type ProjectionDraftIssueCode =
  | 'CANDIDATE_NOT_REVIEWABLE'
  | 'CANDIDATE_ID_MISMATCH'
  | 'BLOCK_MISMATCH'
  | 'PLAN_BINDING_MISMATCH'
  | 'COMPOSED_ALIGNMENT_NOTE_REQUIRED'
  | 'GUIDE_NOT_FOUND'
  | 'GUIDE_NOT_OPERATIONAL'
  | 'GUIDE_DURATION_MISMATCH'
  | 'UDA_PHASE_NOT_FOUND'
  | 'UDA_SECTION_NOT_FOUND'
  | 'UDA_ITEM_NOT_FOUND'
  | 'RESOURCE_NOT_FOUND'
  | 'RESOURCE_KIND_UNSUPPORTED'
  | 'RESOURCE_STEP_NOT_FOUND'
  | 'EDITORIAL_FIELD_EMPTY'

export type ProjectionDraftIssue = {
  code: ProjectionDraftIssueCode
  severity: 'BLOCKING' | 'REVIEW'
  message: string
}

export type HumanTaskProjectionDraft = {
  draftId: string
  recipeId: string
  candidateId: string
  status: 'INVALID' | 'READY_FOR_HUMAN_APPROVAL'
  promotion: 'HUMAN_APPROVAL_REQUIRED'
  issues: ProjectionDraftIssue[]
  projection: null | {
    grade: GradeKey
    blockId: string
    udaCode: string
    udaTitle: string
    packCode: string
    period: string
    title: string
    durationMinutes: number
    why: string
    objective: string
    outcomes: string[]
    preparation: string[]
    steps: Array<{
      id: string
      minutes: number | null
      title: string
      instruction: string
      resourceIds?: string[]
    }>
    resources: Array<{
      id: string
      kind: ProjectionRecipeResourceKind
      title: string
      instruction: string
      prompts: string[]
      surfaces?: ProjectionRecipeSurface[]
    }>
    evidence: string
    observation: string[]
    assessmentNote: string
    continuation: string
    sourceAlignment: ProjectionRecipeAlignment
    provenance: {
      planBinding: ProjectionRecipePlanBinding
      candidateId: string
      uda: { code: string; assetId: string; generationId: string }
      packs: Array<{ code: string; assetId: string; generationId: string }>
      selectedUdaPhases: number[]
      selectedPackHeadings: string[]
      selectedUdaSectionHeadings: string[]
    }
  }
}

export function buildProjectionDraft(candidate: HumanTaskContentCandidate, recipe: HumanTaskProjectionRecipe): HumanTaskProjectionDraft {
  const issues: ProjectionDraftIssue[] = []
  if (candidate.gate.status !== 'READY_FOR_HUMAN_REVIEW') {
    issues.push(issue('CANDIDATE_NOT_REVIEWABLE', 'BLOCKING', 'Il candidato sorgente non ha superato il gate strutturale della pipeline.'))
  }
  if (candidate.candidateId !== recipe.candidateId) {
    issues.push(issue('CANDIDATE_ID_MISMATCH', 'BLOCKING', 'Il Recipe è legato a una diversa generazione delle fonti.'))
  }
  if (candidate.grade !== recipe.grade || candidate.blockId !== recipe.blockId.toUpperCase()) {
    issues.push(issue('BLOCK_MISMATCH', 'BLOCKING', 'Il Recipe non appartiene allo stesso grado/blocco del candidato.'))
  }
  if (!samePlanBinding(candidate, recipe.planBinding)) {
    issues.push(issue('PLAN_BINDING_MISMATCH', 'BLOCKING', 'La struttura corrente del Piano annuale non coincide con quella approvata dal Recipe.'))
  }
  if (recipe.sourceAlignment.level === 'COMPOSED' && !recipe.sourceAlignment.note?.trim()) {
    issues.push(issue('COMPOSED_ALIGNMENT_NOTE_REQUIRED', 'BLOCKING', 'Un raccordo COMPOSED deve spiegare perché e come combina le fonti.'))
  }

  for (const [label, value] of Object.entries(recipe.editorial)) {
    if (!value.trim()) issues.push(issue('EDITORIAL_FIELD_EMPTY', 'BLOCKING', `Il campo editoriale ${label} è vuoto.`))
  }

  const guidePack = findPack(candidate, recipe.guide.packCode)
  const guide = guidePack ? findSection(guidePack, recipe.guide.heading) : null
  if (!guide) {
    issues.push(issue('GUIDE_NOT_FOUND', 'BLOCKING', `Guida operativa non trovata: ${recipe.guide.packCode} / ${recipe.guide.heading}.`))
  } else if (guide.kind !== 'TEACHER_GUIDE') {
    issues.push(issue('GUIDE_NOT_OPERATIONAL', 'BLOCKING', `La sezione ${guide.heading} non è classificata come guida docente.`))
  } else if (guide.durationMinutes !== null && guide.durationMinutes !== candidate.block.durationMinutes) {
    const severity = recipe.sourceAlignment.level === 'DIRECT' ? 'BLOCKING' : 'REVIEW'
    issues.push(issue(
      'GUIDE_DURATION_MISMATCH',
      severity,
      `La guida dichiara ${guide.durationMinutes} minuti mentre il blocco ne prevede ${candidate.block.durationMinutes}.`,
    ))
  }

  const uda = candidate.evidence.uda
  const selectedPhases = recipe.supportingUdaPhaseOrdinals.flatMap((ordinal) => {
    const phase = uda?.phases.find((item) => item.ordinal === ordinal)
    if (!phase) {
      issues.push(issue('UDA_PHASE_NOT_FOUND', 'BLOCKING', `Fase UDA ${ordinal} non trovata nella generazione corrente.`))
      return []
    }
    return [phase]
  })

  const outcomesSection = findUdaSection(uda?.sections ?? [], recipe.outcomes.udaSectionHeading)
  const observationSection = findUdaSection(uda?.sections ?? [], recipe.observation.udaSectionHeading)
  if (!outcomesSection) issues.push(issue('UDA_SECTION_NOT_FOUND', 'BLOCKING', `Sezione UDA non trovata: ${recipe.outcomes.udaSectionHeading}.`))
  if (!observationSection) issues.push(issue('UDA_SECTION_NOT_FOUND', 'BLOCKING', `Sezione UDA non trovata: ${recipe.observation.udaSectionHeading}.`))

  const outcomes = outcomesSection ? selectItems(outcomesSection, recipe.outcomes.itemIndexes, issues) : []
  const observation = observationSection ? selectItems(observationSection, recipe.observation.itemIndexes, issues) : []
  const stepClauses = guide ? splitOperationalClauses(guide.activity) : []

  const resources = recipe.resources.flatMap((binding) => {
    const pack = findPack(candidate, binding.packCode)
    const section = pack ? findSection(pack, binding.heading) : null
    if (!section) {
      issues.push(issue('RESOURCE_NOT_FOUND', 'BLOCKING', `Risorsa non trovata: ${binding.packCode} / ${binding.heading}.`))
      return []
    }
    if (!isCompatibleResourceKind(section.kind, binding.kind)) {
      issues.push(issue('RESOURCE_KIND_UNSUPPORTED', 'BLOCKING', `${section.heading} non è compatibile con il tipo ${binding.kind}.`))
      return []
    }
    if (binding.attachToStep && (binding.attachToStep < 1 || binding.attachToStep > stepClauses.length)) {
      issues.push(issue('RESOURCE_STEP_NOT_FOUND', 'BLOCKING', `${section.heading} è collegata a un passaggio inesistente (${binding.attachToStep}).`))
    }
    return [{
      binding,
      section,
      resource: {
        id: binding.id,
        kind: binding.kind,
        title: humanHeading(section.heading),
        instruction: resourceInstruction(section),
        prompts: extractResourcePrompts(section),
        ...(binding.surfaces?.length ? { surfaces: [...binding.surfaces] } : {}),
      },
    }]
  })

  if (issues.some((item) => item.severity === 'BLOCKING') || !guide || !candidate.sources.uda || !candidate.sources.pack || !uda) {
    return invalidDraft(candidate, recipe, issues)
  }

  const byStep = new Map<number, string[]>()
  for (const item of resources) {
    if (!item.binding.attachToStep) continue
    const current = byStep.get(item.binding.attachToStep) ?? []
    current.push(item.binding.id)
    byStep.set(item.binding.attachToStep, current)
  }

  const steps = stepClauses.map((clause, index) => {
    const stepNumber = index + 1
    const resourceIds = byStep.get(stepNumber)
    return {
      id: `S${String(stepNumber).padStart(2, '0')}`,
      minutes: extractTrailingMinutes(clause),
      title: sourceDerivedStepTitle(clause, stepNumber),
      instruction: stripTrailingMinutes(clause),
      ...(resourceIds?.length ? { resourceIds } : {}),
    }
  })

  const packSources = [candidate.sources.pack, ...candidate.sources.supportPacks]
  const selectedPackHeadings = [recipe.guide.heading, ...recipe.resources.map((resource) => resource.heading)]
  return {
    draftId: `HTC-DRAFT:${recipe.recipeId}:${candidate.candidateId}`,
    recipeId: recipe.recipeId,
    candidateId: candidate.candidateId,
    status: 'READY_FOR_HUMAN_APPROVAL',
    promotion: 'HUMAN_APPROVAL_REQUIRED',
    issues,
    projection: {
      grade: candidate.grade,
      blockId: candidate.blockId,
      udaCode: candidate.block.udaCode,
      udaTitle: uda.title ?? candidate.block.udaCode,
      packCode: candidate.block.packCode,
      period: candidate.block.period,
      title: candidate.block.title,
      durationMinutes: candidate.block.durationMinutes,
      why: recipe.editorial.why.trim(),
      objective: recipe.editorial.objective.trim(),
      outcomes,
      preparation: guide.materials,
      steps,
      resources: resources.map((item) => item.resource),
      evidence: guide.evidence ?? guide.product ?? candidate.block.title,
      observation,
      assessmentNote: recipe.editorial.assessmentNote.trim(),
      continuation: recipe.editorial.continuation.trim(),
      sourceAlignment: recipe.sourceAlignment,
      provenance: {
        planBinding: { ...recipe.planBinding, supportPackCodes: [...recipe.planBinding.supportPackCodes] },
        candidateId: candidate.candidateId,
        uda: {
          code: candidate.sources.uda.code,
          assetId: candidate.sources.uda.assetId,
          generationId: candidate.sources.uda.generationId,
        },
        packs: packSources.map((source) => ({ code: source.code, assetId: source.assetId, generationId: source.generationId })),
        selectedUdaPhases: selectedPhases.map((phase) => phase.ordinal),
        selectedPackHeadings,
        selectedUdaSectionHeadings: [outcomesSection.heading, observationSection.heading],
      },
    },
  }
}

function samePlanBinding(candidate: HumanTaskContentCandidate, binding: ProjectionRecipePlanBinding) {
  return candidate.block.planSourceCode === binding.planSourceCode
    && candidate.block.segmentKey === binding.segmentKey
    && candidate.block.udaCode === binding.udaCode
    && candidate.block.packCode === binding.packCode
    && candidate.block.title === binding.title
    && sameStringArray(candidate.block.supportPackCodes, binding.supportPackCodes)
}

function sameStringArray(left: string[], right: string[]) {
  return left.length === right.length && left.every((value, index) => value === right[index])
}

function invalidDraft(candidate: HumanTaskContentCandidate, recipe: HumanTaskProjectionRecipe, issues: ProjectionDraftIssue[]): HumanTaskProjectionDraft {
  return {
    draftId: `HTC-DRAFT:${recipe.recipeId}:${candidate.candidateId}`,
    recipeId: recipe.recipeId,
    candidateId: candidate.candidateId,
    status: 'INVALID',
    promotion: 'HUMAN_APPROVAL_REQUIRED',
    issues,
    projection: null,
  }
}

function findPack(candidate: HumanTaskContentCandidate, code: string): ExtractedPack | null {
  if (candidate.evidence.pack?.code === code) return candidate.evidence.pack
  return candidate.evidence.supportPacks.find((pack) => pack.code === code) ?? null
}

function findSection(pack: ExtractedPack, heading: string): ExtractedPackSection | null {
  const normalized = normalize(heading)
  return pack.sections.find((section) => normalize(section.heading) === normalized) ?? null
}

function findUdaSection(sections: ExtractedUdaSection[], heading: string): ExtractedUdaSection | null {
  const normalized = normalize(heading)
  return sections.find((section) => normalize(section.heading) === normalized) ?? null
}

function selectItems(section: ExtractedUdaSection, indexes: number[], issues: ProjectionDraftIssue[]) {
  return indexes.flatMap((index) => {
    const item = section.listItems[index - 1]
    if (!item) {
      issues.push(issue('UDA_ITEM_NOT_FOUND', 'BLOCKING', `${section.heading}: voce ${index} non disponibile.`))
      return []
    }
    return [item]
  })
}

function splitOperationalClauses(activity: string | null): string[] {
  if (!activity) return []
  const lines = activity.split('\n').map((line) => line.trim()).filter(Boolean)
  const numbered = lines
    .filter((line) => /^\d+[.)]\s+/.test(line))
    .map((line) => line.replace(/^\d+[.)]\s+/, '').trim())
  if (numbered.length) return numbered
  return activity.split(/;\s*/).map((item) => item.trim().replace(/[.;]+$/, '')).filter(Boolean)
}

function sourceDerivedStepTitle(clause: string, ordinal: number) {
  const value = stripTrailingMinutes(clause).replace(/[.;]+$/, '').trim()
  const words = value.split(/\s+/).filter(Boolean)
  if (!words.length) return `Passaggio ${ordinal}`
  const compact = words.slice(0, 7).join(' ')
  return compact.charAt(0).toLocaleUpperCase('it') + compact.slice(1)
}

function extractTrailingMinutes(value: string): number | null {
  const match = value.match(/(?:—|-)\s*(\d+)\s*min\.?$/i)
  return match ? Number(match[1]) : null
}

function stripTrailingMinutes(value: string) {
  return value.replace(/\s*(?:—|-)\s*\d+\s*min\.?$/i, '').trim()
}

function isCompatibleResourceKind(sectionKind: PackSectionKind, recipeKind: ProjectionRecipeResourceKind) {
  if (recipeKind === 'STUDENT_SHEET') return sectionKind === 'STUDENT_SHEET'
  if (recipeKind === 'EXIT_TICKET') return sectionKind === 'OBSERVATION_TOOL'
  if (recipeKind === 'TASK_BRIEF') return sectionKind === 'TASK_BRIEF'
  if (recipeKind === 'RUBRIC') return sectionKind === 'RUBRIC'
  if (recipeKind === 'ASSESSMENT_GUIDE') return sectionKind === 'OBSERVATION_TOOL' || sectionKind === 'OTHER'
  return false
}

function extractResourcePrompts(section: ExtractedPackSection) {
  const lines = section.content.split('\n').map((line) => line.trim()).filter(Boolean)
  const prompts = lines.flatMap((line) => {
    if (/^[-•]\s+/.test(line)) return [line.replace(/^[-•]\s+/, '').trim()]
    if (/^\d+[.)]\s+/.test(line)) return [line.replace(/^\d+[.)]\s+/, '').trim()]
    const separator = line.indexOf(':')
    if (separator > 0) {
      const label = line.slice(0, separator).replace(/[_]+/g, '').trim()
      return label ? [label] : []
    }
    return []
  })
  return [...new Set(prompts)].slice(0, 12)
}

function resourceInstruction(section: ExtractedPackSection) {
  if (section.kind === 'STUDENT_SHEET') return 'Usa questa scheda nel passaggio indicato e conserva l’elaborato come evidenza quando pertinente.'
  if (section.kind === 'RUBRIC') return 'Consulta i criteri durante l’osservazione e la restituzione.'
  if (section.kind === 'TASK_BRIEF') return 'Presenta la consegna senza aggiungere requisiti non presenti nella fonte.'
  return 'Usa la risorsa nel contesto indicato dal Recipe.'
}

function humanHeading(value: string) {
  return value
    .replace(/^\d+\.\s+/, '')
    .replace(/^(SCHEDA|TAVOLA)\s+[A-Z]\s+—\s+/i, '')
    .replace(/^SCHEDA ALUNNO\s+[A-Z]\s+—\s+/i, '')
    .trim()
    .toLocaleLowerCase('it')
    .replace(/^./u, (first) => first.toLocaleUpperCase('it'))
}

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('it').replace(/\s+/g, ' ').trim()
}

function issue(code: ProjectionDraftIssueCode, severity: ProjectionDraftIssue['severity'], message: string): ProjectionDraftIssue {
  return { code, severity, message }
}
