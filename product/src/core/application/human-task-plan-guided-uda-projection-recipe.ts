import { buildBlocks, CANONICAL_PLAN_SOURCES, type GradeKey } from '@/app/piano-annuale/model'
import type {
  ExtractedUdaSection,
  HumanTaskContentCandidate,
} from './human-task-content-pipeline'
import type {
  HumanTaskProjectionDraft,
  ProjectionDraftIssue,
  ProjectionRecipePlanBinding,
} from './human-task-projection-recipe'

export type PlanGuidedUdaStepSource = 'PLAN_ACTIVITY' | 'UDA_PHASE'

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
  operationalPhaseOrdinal: number
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
  const phase = uda?.phases.find((item) => item.ordinal === recipe.operationalPhaseOrdinal) ?? null
  if (!phase) {
    issues.push(issue('UDA_PHASE_NOT_FOUND', 'BLOCKING', `Fase UDA ${recipe.operationalPhaseOrdinal} non trovata nella generazione corrente.`))
  }

  const coverage = validatePhaseCoverage(recipe, candidate)
  issues.push(...coverage.issues)
  if (phase && coverage.durationMinutes !== null && coverage.durationMinutes !== phase.durationMinutes) {
    issues.push(issue(
      'GUIDE_DURATION_MISMATCH',
      'BLOCKING',
      `La Fase UDA ${phase.ordinal} dura ${phase.durationMinutes} minuti, mentre i blocchi dichiarati dal Recipe ne coprono ${coverage.durationMinutes}.`,
    ))
  }

  const instruction = recipe.stepSource === 'PLAN_ACTIVITY'
    ? clean(recipe.planSource.blockActivity ?? '')
    : clean(phase?.content ?? '')
  if (phase && !instruction) {
    issues.push(issue('GUIDE_NOT_OPERATIONAL', 'BLOCKING', 'La fonte selezionata non contiene una attività operativa sufficiente per il blocco.'))
  }

  const outcomesSection = findUdaSection(uda?.sections ?? [], recipe.outcomes.udaSectionHeading)
  const observationSection = findUdaSection(uda?.sections ?? [], recipe.observation.udaSectionHeading)
  if (!outcomesSection) issues.push(issue('UDA_SECTION_NOT_FOUND', 'BLOCKING', `Sezione UDA non trovata: ${recipe.outcomes.udaSectionHeading}.`))
  if (!observationSection) issues.push(issue('UDA_SECTION_NOT_FOUND', 'BLOCKING', `Sezione UDA non trovata: ${recipe.observation.udaSectionHeading}.`))

  const outcomes = outcomesSection ? selectItems(outcomesSection, recipe.outcomes.itemIndexes, issues) : []
  const observation = observationSection ? selectItems(observationSection, recipe.observation.itemIndexes, issues) : []

  if (issues.some((item) => item.severity === 'BLOCKING') || !candidate.sources.uda || !uda || !phase || !instruction) {
    return invalidDraft(candidate, recipe, issues)
  }

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
      steps: [{
        id: 'S01',
        minutes: null,
        title: candidate.block.title,
        instruction,
      }],
      resources: [],
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
        packs: [],
        selectedUdaPhases: [phase.ordinal],
        selectedPackHeadings: [],
        selectedUdaSectionHeadings: unique([
          recipe.outcomes.udaSectionHeading,
          recipe.observation.udaSectionHeading,
        ]),
      },
    },
  }
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

function clean(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('it').replace(/\s+/g, ' ').trim()
}

function unique(values: string[]) {
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
