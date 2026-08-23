import { buildBlocks, CANONICAL_PLAN_SOURCES, type GradeKey } from '@/app/piano-annuale/model'
import type {
  ExtractedPack,
  ExtractedPackSection,
  ExtractedUdaPhase,
  ExtractedUdaSection,
  HumanTaskContentCandidate,
  HumanTaskPipelineSource,
} from './human-task-content-pipeline'
import type {
  HumanTaskProjectionDraft,
  ProjectionDraftIssue,
  ProjectionRecipePlanBinding,
  ProjectionRecipeResourceKind,
  ProjectionRecipeSurface,
} from './human-task-projection-recipe'

export type PlanGuidedUdaStepSource = 'PLAN_ACTIVITY' | 'UDA_PHASE'

export type PlanGuidedUdaResourceBinding = {
  id: string
  packCode: string
  heading: string
  kind: ProjectionRecipeResourceKind
  surfaces?: ProjectionRecipeSurface[]
  attachToSteps?: number[]
}

export type HumanTaskPlanGuidedUdaProjectionRecipe = {
  mode: 'PLAN_GUIDED_UDA'
  recipeId: string
  candidateId: string
  grade: GradeKey
  blockId: string
  planBinding: ProjectionRecipePlanBinding
  planSource: {
    code: string
    generationId: string
    blockActivity: string | null
    blockEvidence: string
  }
  sourceAlignment: {
    level: 'COMPOSED'
    note: string
  }
  /** Backward-compatible singular form used by the first PLAN_GUIDED_UDA approvals. */
  operationalPhaseOrdinal?: number
  /** One or more UDA phases whose declared duration must exactly cover phaseCoverageBlockIds. */
  operationalPhaseOrdinals?: number[]
  phaseCoverageBlockIds: string[]
  stepSource: PlanGuidedUdaStepSource
  outcomes: {
    udaSectionHeading: string
    itemIndexes: number[]
  }
  observation: {
    udaSectionHeading: string
    itemIndexes: number[]
  }
  /** Optional PACK resources. They can support the task but never define its timing or phase coverage. */
  resources?: PlanGuidedUdaResourceBinding[]
  editorial: {
    why: string
    objective: string
    assessmentNote: string
    continuation: string
  }
}

export function buildPlanGuidedUdaProjectionDraft(
  candidate: HumanTaskContentCandidate,
  recipe: HumanTaskPlanGuidedUdaProjectionRecipe,
): HumanTaskProjectionDraft {
  const issues: ProjectionDraftIssue[] = []

  if (candidate.gate.status !== 'READY_FOR_HUMAN_REVIEW') {
    issues.push(issue('CANDIDATE_NOT_REVIEWABLE', 'BLOCKING', 'Il candidato sorgente non ha superato il gate strutturale della pipeline.'))
  }
  if (candidate.candidateId !== recipe.candidateId) {
    issues.push(issue('CANDIDATE_ID_MISMATCH', 'BLOCKING', 'Il Recipe PLAN_GUIDED_UDA è legato a una diversa generazione delle fonti UDA/PACK.'))
  }
  if (candidate.grade !== recipe.grade || candidate.blockId !== recipe.blockId.toUpperCase()) {
    issues.push(issue('BLOCK_MISMATCH', 'BLOCKING', 'Il Recipe PLAN_GUIDED_UDA non appartiene allo stesso grado/blocco del candidato.'))
  }
  if (!samePlanBinding(candidate, recipe.planBinding)) {
    issues.push(issue('PLAN_BINDING_MISMATCH', 'BLOCKING', 'La struttura corrente del Piano annuale non coincide con quella approvata dal Recipe PLAN_GUIDED_UDA.'))
  }

  const canonicalPlan = CANONICAL_PLAN_SOURCES[recipe.grade]
  if (recipe.planSource.code !== canonicalPlan.code || recipe.planSource.generationId !== canonicalPlan.generationId) {
    issues.push(issue(
      'PLAN_BINDING_MISMATCH',
      'BLOCKING',
      `Il frammento del Piano è legato a ${recipe.planSource.code}/${recipe.planSource.generationId}, ma il modello canonico corrente richiede ${canonicalPlan.code}/${canonicalPlan.generationId}.`,
    ))
  }

  if (!recipe.sourceAlignment.note.trim()) {
    issues.push(issue('COMPOSED_ALIGNMENT_NOTE_REQUIRED', 'BLOCKING', 'Un raccordo PLAN_GUIDED_UDA deve spiegare come il Piano disambigua la fase UDA.'))
  }
  if (!recipe.planSource.blockEvidence.trim()) {
    issues.push(issue('EDITORIAL_FIELD_EMPTY', 'BLOCKING', 'L’evidenza canonica del blocco nel Piano è vuota.'))
  }
  if (recipe.stepSource === 'PLAN_ACTIVITY' && !recipe.planSource.blockActivity?.trim()) {
    issues.push(issue('GUIDE_NOT_OPERATIONAL', 'BLOCKING', 'Il Recipe richiede l’attività del Piano, ma il frammento canonico non contiene una attività operativa.'))
  }

  for (const [label, value] of Object.entries(recipe.editorial)) {
    if (!value.trim()) issues.push(issue('EDITORIAL_FIELD_EMPTY', 'BLOCKING', `Il campo editoriale ${label} è vuoto.`))
  }

  const uda = candidate.evidence.uda
  const phaseOrdinals = resolveOperationalPhaseOrdinals(recipe, issues)
  const phases = phaseOrdinals.flatMap((ordinal) => {
    const phase = uda?.phases.find((item) => item.ordinal === ordinal) ?? null
    if (!phase) {
      issues.push(issue('UDA_PHASE_NOT_FOUND', 'BLOCKING', `Fase UDA ${ordinal} non trovata nella generazione corrente.`))
      return []
    }
    return [phase]
  })

  const coverage = validatePhaseCoverage(recipe, candidate)
  issues.push(...coverage.issues)
  const phaseDurationMinutes = phases.reduce((total, phase) => total + phase.durationMinutes, 0)
  if (phaseOrdinals.length && phases.length === phaseOrdinals.length && coverage.durationMinutes !== null && coverage.durationMinutes !== phaseDurationMinutes) {
    issues.push(issue(
      'GUIDE_DURATION_MISMATCH',
      'BLOCKING',
      `Le fasi UDA selezionate durano ${phaseDurationMinutes} minuti, mentre i blocchi dichiarati dal Recipe ne coprono ${coverage.durationMinutes}.`,
    ))
  }

  const steps = buildSteps(recipe, phases, issues)
  const resources = buildResources(candidate, recipe.resources ?? [], steps.length, issues)
  const resourceIdsByStep = new Map<number, string[]>()
  for (const item of resources) {
    for (const stepNumber of item.binding.attachToSteps ?? []) {
      const current = resourceIdsByStep.get(stepNumber) ?? []
      current.push(item.binding.id)
      resourceIdsByStep.set(stepNumber, current)
    }
  }
  const stepsWithResources = steps.map((step, index) => {
    const resourceIds = resourceIdsByStep.get(index + 1)
    return resourceIds?.length ? { ...step, resourceIds } : step
  })

  const outcomesSection = findUdaSection(uda?.sections ?? [], recipe.outcomes.udaSectionHeading)
  const observationSection = findUdaSection(uda?.sections ?? [], recipe.observation.udaSectionHeading)
  if (!outcomesSection) issues.push(issue('UDA_SECTION_NOT_FOUND', 'BLOCKING', `Sezione UDA non trovata: ${recipe.outcomes.udaSectionHeading}.`))
  if (!observationSection) issues.push(issue('UDA_SECTION_NOT_FOUND', 'BLOCKING', `Sezione UDA non trovata: ${recipe.observation.udaSectionHeading}.`))

  const outcomes = outcomesSection ? selectItems(outcomesSection, recipe.outcomes.itemIndexes, issues) : []
  const observation = observationSection ? selectItems(observationSection, recipe.observation.itemIndexes, issues) : []

  if (
    issues.some((item) => item.severity === 'BLOCKING')
    || !candidate.sources.uda
    || !uda
    || !phaseOrdinals.length
    || phases.length !== phaseOrdinals.length
    || !stepsWithResources.length
  ) {
    return invalidDraft(candidate, recipe, issues)
  }

  const usedPackCodes = unique(resources.map((item) => item.binding.packCode))
  const packProvenance = usedPackCodes.flatMap((packCode) => {
    const source = findPackSource(candidate, packCode)
    return source ? [{ code: source.code, assetId: source.assetId, generationId: source.generationId }] : []
  })

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
      preparation: [],
      steps: stepsWithResources,
      resources: resources.map((item) => item.resource),
      evidence: clean(recipe.planSource.blockEvidence),
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
        packs: packProvenance,
        selectedUdaPhases: [...phaseOrdinals],
        selectedPackHeadings: resources.map((item) => item.binding.heading),
        selectedUdaSectionHeadings: unique([
          recipe.outcomes.udaSectionHeading,
          recipe.observation.udaSectionHeading,
        ]),
      },
    },
  }
}

function resolveOperationalPhaseOrdinals(
  recipe: HumanTaskPlanGuidedUdaProjectionRecipe,
  issues: ProjectionDraftIssue[],
) {
  const raw = recipe.operationalPhaseOrdinals ?? (recipe.operationalPhaseOrdinal ? [recipe.operationalPhaseOrdinal] : [])
  const ordinals = raw.map((value) => Number(value))
  if (!ordinals.length || ordinals.some((value) => !Number.isInteger(value) || value < 1) || new Set(ordinals).size !== ordinals.length) {
    issues.push(issue('UDA_PHASE_NOT_FOUND', 'BLOCKING', 'Il Recipe deve dichiarare una o più fasi UDA valide e non duplicate.'))
    return []
  }
  const sorted = [...ordinals].sort((a, b) => a - b)
  if (sorted.some((value, index) => index > 0 && value !== sorted[index - 1] + 1)) {
    issues.push(issue('PLAN_BINDING_MISMATCH', 'BLOCKING', 'Le fasi UDA multiple selezionate per uno stesso raccordo devono essere consecutive.'))
  }
  return ordinals
}

function buildSteps(
  recipe: HumanTaskPlanGuidedUdaProjectionRecipe,
  phases: ExtractedUdaPhase[],
  issues: ProjectionDraftIssue[],
) {
  if (recipe.stepSource === 'PLAN_ACTIVITY') {
    const instruction = clean(recipe.planSource.blockActivity ?? '')
    if (!instruction) {
      issues.push(issue('GUIDE_NOT_OPERATIONAL', 'BLOCKING', 'L’attività del Piano selezionata non contiene una sequenza operativa sufficiente.'))
      return []
    }
    return [{
      id: 'S01',
      minutes: null,
      title: recipe.planBinding.title,
      instruction,
    }]
  }

  return phases.flatMap((phase, index) => {
    const instruction = clean(phase.content)
    if (!instruction) {
      issues.push(issue('GUIDE_NOT_OPERATIONAL', 'BLOCKING', `La Fase UDA ${phase.ordinal} non contiene una attività operativa sufficiente.`))
      return []
    }
    return [{
      id: `S${String(index + 1).padStart(2, '0')}`,
      minutes: null,
      title: humanPhaseTitle(phase.title, index + 1),
      instruction,
    }]
  })
}

function buildResources(
  candidate: HumanTaskContentCandidate,
  bindings: PlanGuidedUdaResourceBinding[],
  stepCount: number,
  issues: ProjectionDraftIssue[],
) {
  return bindings.flatMap((binding) => {
    const pack = findExtractedPack(candidate, binding.packCode)
    const source = findPackSource(candidate, binding.packCode)
    const section = pack ? findPackSection(pack, binding.heading) : null
    if (!pack || !source || !section) {
      issues.push(issue('RESOURCE_NOT_FOUND', 'BLOCKING', `Risorsa non trovata: ${binding.packCode} / ${binding.heading}.`))
      return []
    }
    for (const stepNumber of binding.attachToSteps ?? []) {
      if (!Number.isInteger(stepNumber) || stepNumber < 1 || stepNumber > stepCount) {
        issues.push(issue('RESOURCE_STEP_NOT_FOUND', 'BLOCKING', `${binding.heading} è collegata a un passaggio inesistente (${stepNumber}).`))
      }
    }
    return [{
      binding,
      resource: {
        id: binding.id,
        kind: binding.kind,
        title: humanHeading(section.heading),
        instruction: resourceInstruction(binding.kind),
        prompts: section.listItems.length ? [...section.listItems] : contentPrompts(section.content),
        ...(binding.surfaces?.length ? { surfaces: [...binding.surfaces] } : {}),
      },
    }]
  })
}

function validatePhaseCoverage(
  recipe: HumanTaskPlanGuidedUdaProjectionRecipe,
  candidate: HumanTaskContentCandidate,
): { durationMinutes: number | null; issues: ProjectionDraftIssue[] } {
  const issues: ProjectionDraftIssue[] = []
  const ids = recipe.phaseCoverageBlockIds.map((value) => value.toUpperCase())
  if (!ids.length || new Set(ids).size !== ids.length || !ids.includes(candidate.blockId)) {
    issues.push(issue('BLOCK_MISMATCH', 'BLOCKING', 'La copertura della fase deve contenere il blocco corrente una sola volta e non può essere vuota.'))
    return { durationMinutes: null, issues }
  }

  const blocks = buildBlocks(recipe.grade)
  const indexes = ids.map((id) => blocks.findIndex((block) => block.id === id))
  if (indexes.some((index) => index < 0)) {
    issues.push(issue('BLOCK_MISMATCH', 'BLOCKING', 'La copertura della fase contiene blocchi non presenti nel Piano canonico corrente.'))
    return { durationMinutes: null, issues }
  }

  const sorted = [...indexes].sort((a, b) => a - b)
  if (sorted.some((index, position) => position > 0 && index !== sorted[position - 1] + 1)) {
    issues.push(issue('PLAN_BINDING_MISMATCH', 'BLOCKING', 'I blocchi che coprono una stessa fase UDA devono essere contigui nel Piano canonico.'))
  }

  const coverageBlocks = indexes.map((index) => blocks[index])
  for (const block of coverageBlocks) {
    if (block.uda !== candidate.block.udaCode || block.pack !== candidate.block.packCode) {
      issues.push(issue('PLAN_BINDING_MISMATCH', 'BLOCKING', `Il blocco ${block.id} non appartiene allo stesso raccordo UDA/PACK del candidato.`))
    }
  }

  return {
    durationMinutes: coverageBlocks.reduce((total, block) => total + block.hours * 60, 0),
    issues,
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

function findUdaSection(sections: ExtractedUdaSection[], heading: string): ExtractedUdaSection | null {
  const normalized = normalize(heading)
  return sections.find((section) => normalize(section.heading) === normalized) ?? null
}

function findExtractedPack(candidate: HumanTaskContentCandidate, packCode: string): ExtractedPack | null {
  if (candidate.evidence.pack?.code === packCode) return candidate.evidence.pack
  return candidate.evidence.supportPacks.find((pack) => pack.code === packCode) ?? null
}

function findPackSource(candidate: HumanTaskContentCandidate, packCode: string): HumanTaskPipelineSource | null {
  if (candidate.sources.pack?.code === packCode) return candidate.sources.pack
  return candidate.sources.supportPacks.find((source) => source.code === packCode) ?? null
}

function findPackSection(pack: ExtractedPack, heading: string): ExtractedPackSection | null {
  const normalized = normalize(heading)
  return pack.sections.find((section) => normalize(section.heading) === normalized) ?? null
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

function humanPhaseTitle(value: string, ordinal: number) {
  const cleaned = value
    .replace(/^Fase\s+\d+\s*[—-]\s*/i, '')
    .replace(/\s*[—-]\s*\d+\s*(?:ore?|h)\s*$/i, '')
    .trim()
  return cleaned || `Passaggio ${ordinal}`
}

function humanHeading(value: string) {
  return value
    .replace(/^\d+\.\s*/, '')
    .replace(/^Scheda\s+[«"]?|[»"]$/gi, '')
    .trim()
}

function resourceInstruction(kind: ProjectionRecipeResourceKind) {
  switch (kind) {
    case 'STUDENT_SHEET': return 'Usa questa scheda nel passaggio indicato e conserva l’elaborato come evidenza quando pertinente.'
    case 'EXIT_TICKET': return 'Usa questa uscita breve alla fine del compito, senza trasformarla automaticamente in voto.'
    case 'TASK_BRIEF': return 'Usa la consegna come riferimento operativo del compito.'
    case 'RUBRIC': return 'Usa questi criteri per osservare e restituire feedback; non generano automaticamente un voto.'
    case 'ASSESSMENT_GUIDE': return 'Usa questa guida soltanto nella fase di verifica o registrazione prevista.'
  }
}

function contentPrompts(value: string) {
  return value
    .split(/\n+/)
    .map((item) => item.replace(/^[-•]\s*/, '').trim())
    .filter(Boolean)
    .slice(0, 20)
}

function clean(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('it').replace(/\s+/g, ' ').trim()
}

function unique<T>(values: T[]) {
  return [...new Set(values)]
}

function invalidDraft(
  candidate: HumanTaskContentCandidate,
  recipe: HumanTaskPlanGuidedUdaProjectionRecipe,
  issues: ProjectionDraftIssue[],
): HumanTaskProjectionDraft {
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

function issue(
  code: ProjectionDraftIssue['code'],
  severity: ProjectionDraftIssue['severity'],
  message: string,
): ProjectionDraftIssue {
  return { code, severity, message }
}
