import type { GradeKey } from '@/app/piano-annuale/model'
import type {
  ExtractedUdaSection,
  HumanTaskContentCandidate,
} from './human-task-content-pipeline'
import type {
  HumanTaskProjectionDraft,
  ProjectionDraftIssue,
  ProjectionRecipePlanBinding,
} from './human-task-projection-recipe'

export type HumanTaskUdaOnlyProjectionRecipe = {
  mode: 'UDA_ONLY'
  recipeId: string
  candidateId: string
  grade: GradeKey
  blockId: string
  planBinding: ProjectionRecipePlanBinding
  sourceAlignment: {
    level: 'COMPOSED'
    note: string
  }
  operationalPhaseOrdinal: number
  outcomes: {
    udaSectionHeading: string
    itemIndexes: number[]
  }
  evidence: {
    udaSectionHeading: string
    itemIndex: number
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

export function buildUdaOnlyProjectionDraft(
  candidate: HumanTaskContentCandidate,
  recipe: HumanTaskUdaOnlyProjectionRecipe,
): HumanTaskProjectionDraft {
  const issues: ProjectionDraftIssue[] = []

  if (candidate.gate.status !== 'READY_FOR_HUMAN_REVIEW') {
    issues.push(issue('CANDIDATE_NOT_REVIEWABLE', 'BLOCKING', 'Il candidato sorgente non ha superato il gate strutturale della pipeline.'))
  }
  if (candidate.candidateId !== recipe.candidateId) {
    issues.push(issue('CANDIDATE_ID_MISMATCH', 'BLOCKING', 'Il Recipe UDA-only è legato a una diversa generazione delle fonti.'))
  }
  if (candidate.grade !== recipe.grade || candidate.blockId !== recipe.blockId.toUpperCase()) {
    issues.push(issue('BLOCK_MISMATCH', 'BLOCKING', 'Il Recipe UDA-only non appartiene allo stesso grado/blocco del candidato.'))
  }
  if (!samePlanBinding(candidate, recipe.planBinding)) {
    issues.push(issue('PLAN_BINDING_MISMATCH', 'BLOCKING', 'La struttura corrente del Piano annuale non coincide con quella approvata dal Recipe UDA-only.'))
  }
  if (!recipe.sourceAlignment.note.trim()) {
    issues.push(issue('COMPOSED_ALIGNMENT_NOTE_REQUIRED', 'BLOCKING', 'Un raccordo UDA-only deve spiegare esplicitamente perché il CAN-PACK non fornisce la guida operativa e quale parte della UDA viene usata.'))
  }

  for (const [label, value] of Object.entries(recipe.editorial)) {
    if (!value.trim()) issues.push(issue('EDITORIAL_FIELD_EMPTY', 'BLOCKING', `Il campo editoriale ${label} è vuoto.`))
  }

  const uda = candidate.evidence.uda
  const phase = uda?.phases.find((item) => item.ordinal === recipe.operationalPhaseOrdinal) ?? null
  if (!phase) {
    issues.push(issue('UDA_PHASE_NOT_FOUND', 'BLOCKING', `Fase UDA ${recipe.operationalPhaseOrdinal} non trovata nella generazione corrente.`))
  } else if (phase.durationMinutes !== candidate.block.durationMinutes) {
    issues.push(issue(
      'GUIDE_DURATION_MISMATCH',
      'BLOCKING',
      `La fase UDA dichiara ${phase.durationMinutes} minuti mentre il blocco ne prevede ${candidate.block.durationMinutes}. Il Recipe UDA-only richiede corrispondenza esatta.`,
    ))
  }

  const steps = phase ? splitUdaPhaseOperationalSteps(phase.content) : []
  if (phase && !steps.length) {
    issues.push(issue('GUIDE_NOT_OPERATIONAL', 'BLOCKING', 'La fase UDA non contiene azioni operative sufficienti per costruire una sequenza senza aggiungere contenuto.'))
  }

  const outcomesSection = findUdaSection(uda?.sections ?? [], recipe.outcomes.udaSectionHeading)
  const evidenceSection = findUdaSection(uda?.sections ?? [], recipe.evidence.udaSectionHeading)
  const observationSection = findUdaSection(uda?.sections ?? [], recipe.observation.udaSectionHeading)
  if (!outcomesSection) issues.push(issue('UDA_SECTION_NOT_FOUND', 'BLOCKING', `Sezione UDA non trovata: ${recipe.outcomes.udaSectionHeading}.`))
  if (!evidenceSection) issues.push(issue('UDA_SECTION_NOT_FOUND', 'BLOCKING', `Sezione UDA non trovata: ${recipe.evidence.udaSectionHeading}.`))
  if (!observationSection) issues.push(issue('UDA_SECTION_NOT_FOUND', 'BLOCKING', `Sezione UDA non trovata: ${recipe.observation.udaSectionHeading}.`))

  const outcomes = outcomesSection ? selectItems(outcomesSection, recipe.outcomes.itemIndexes, issues) : []
  const evidence = evidenceSection ? selectItem(evidenceSection, recipe.evidence.itemIndex, issues) : null
  const observation = observationSection ? selectItems(observationSection, recipe.observation.itemIndexes, issues) : []

  if (issues.some((item) => item.severity === 'BLOCKING') || !candidate.sources.uda || !uda || !phase || !evidence) {
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
      steps: steps.map((instruction, index) => ({
        id: `S${String(index + 1).padStart(2, '0')}`,
        minutes: null,
        title: sourceDerivedStepTitle(instruction, index + 1),
        instruction,
      })),
      resources: [],
      evidence,
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
          recipe.evidence.udaSectionHeading,
          recipe.observation.udaSectionHeading,
        ]),
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

function selectItem(section: ExtractedUdaSection, index: number, issues: ProjectionDraftIssue[]) {
  const item = section.listItems[index - 1]
  if (!item) {
    issues.push(issue('UDA_ITEM_NOT_FOUND', 'BLOCKING', `${section.heading}: voce ${index} non disponibile.`))
    return null
  }
  return item
}

function splitUdaPhaseOperationalSteps(content: string) {
  const normalized = content.replace(/\s+/g, ' ').trim()
  if (!normalized) return []
  return normalized
    .split(/\.\s+(?=[A-ZÀ-Ý])/u)
    .map((item) => item.trim().replace(/[.;]+$/, ''))
    .filter(Boolean)
}

function sourceDerivedStepTitle(instruction: string, ordinal: number) {
  const words = instruction.split(/\s+/).filter(Boolean)
  if (!words.length) return `Passaggio ${ordinal}`
  const compact = words.slice(0, 7).join(' ')
  return compact.charAt(0).toLocaleUpperCase('it') + compact.slice(1)
}

function invalidDraft(
  candidate: HumanTaskContentCandidate,
  recipe: HumanTaskUdaOnlyProjectionRecipe,
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

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('it').replace(/\s+/g, ' ').trim()
}

function unique(values: string[]) {
  return [...new Set(values)]
}

function issue(
  code: ProjectionDraftIssue['code'],
  severity: ProjectionDraftIssue['severity'],
  message: string,
): ProjectionDraftIssue {
  return { code, severity, message }
}
