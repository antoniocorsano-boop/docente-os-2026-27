import type { HumanTaskContentCandidate } from './human-task-content-pipeline'
import {
  buildPlanGuidedUdaProjectionDraft,
  type HumanTaskPlanGuidedUdaProjectionRecipe,
} from './human-task-plan-guided-uda-projection-recipe'
import type { HumanTaskProjectionDraft } from './human-task-projection-recipe'

export type PlanGuidedEvidenceBinding =
  | {
      source: 'PLAN'
      text: string
    }
  | {
      source: 'UDA_SECTION_ITEMS'
      sectionHeading: string
      itemIndexes: number[]
      rationale: string
    }
  | {
      source: 'UDA_PHASES'
      phaseOrdinals: number[]
      rationale: string
    }

export type ResolvedPlanGuidedEvidenceBinding =
  | Extract<PlanGuidedEvidenceBinding, { source: 'PLAN' }>
  | (Extract<PlanGuidedEvidenceBinding, { source: 'UDA_SECTION_ITEMS' }> & { text: string })
  | (Extract<PlanGuidedEvidenceBinding, { source: 'UDA_PHASES' }> & { text: string })

export type HumanTaskPlanGuidedEvidenceDraft = {
  draft: HumanTaskProjectionDraft
  evidenceBinding: ResolvedPlanGuidedEvidenceBinding
}

/**
 * Compatibility boundary for PLAN_GUIDED_UDA recipes when the annual Plan
 * does not state a block-level evidence but the UDA does.
 *
 * Existing PLAN-backed recipes remain unchanged. UDA-backed evidence is not
 * accepted as free editorial text: it is deterministically extracted from the
 * current canonical UDA generation and only then passed to the legacy builder.
 */
export function buildPlanGuidedUdaProjectionDraftWithEvidence(
  candidate: HumanTaskContentCandidate,
  recipe: HumanTaskPlanGuidedUdaProjectionRecipe,
  evidenceBinding: PlanGuidedEvidenceBinding,
): HumanTaskPlanGuidedEvidenceDraft {
  if (evidenceBinding.source === 'PLAN') {
    if (!evidenceBinding.text.trim()) throw new Error('L’evidenza del Piano non può essere vuota.')
    if (clean(recipe.planSource.blockEvidence) !== clean(evidenceBinding.text)) {
      throw new Error('L’evidenza dichiarata come PLAN non coincide con il frammento del Piano nel recipe.')
    }
    return {
      draft: buildPlanGuidedUdaProjectionDraft(candidate, recipe),
      evidenceBinding: { ...evidenceBinding },
    }
  }

  const resolved = resolveUdaEvidenceBinding(candidate, recipe, evidenceBinding)
  const sourceDescription = resolved.source === 'UDA_PHASES'
    ? `fasi UDA ${resolved.phaseOrdinals.join('+')}`
    : `sezione UDA “${resolved.sectionHeading}”, voci ${resolved.itemIndexes.join(', ')}`

  const adaptedRecipe: HumanTaskPlanGuidedUdaProjectionRecipe = {
    ...recipe,
    planSource: {
      ...recipe.planSource,
      blockEvidence: resolved.text,
    },
    sourceAlignment: {
      ...recipe.sourceAlignment,
      note: `${recipe.sourceAlignment.note.trim()} Evidenza operativa: derivata deterministicamente da ${sourceDescription}; il Piano definisce collocazione e blocco ma non specifica un’evidenza distinta a questa granularità. ${resolved.rationale.trim()}`,
    },
  }

  return {
    draft: buildPlanGuidedUdaProjectionDraft(candidate, adaptedRecipe),
    evidenceBinding: resolved,
  }
}

function resolveUdaEvidenceBinding(
  candidate: HumanTaskContentCandidate,
  recipe: HumanTaskPlanGuidedUdaProjectionRecipe,
  binding: Exclude<PlanGuidedEvidenceBinding, { source: 'PLAN' }>,
): ResolvedPlanGuidedEvidenceBinding {
  if (!binding.rationale.trim()) throw new Error('La provenienza UDA dell’evidenza richiede una motivazione verificabile.')

  const uda = candidate.evidence.uda
  if (!uda) throw new Error('La generazione UDA corrente non è disponibile.')

  if (binding.source === 'UDA_PHASES') {
    if (!binding.phaseOrdinals.length || new Set(binding.phaseOrdinals).size !== binding.phaseOrdinals.length) {
      throw new Error('La provenienza UDA dell’evidenza richiede fasi valide e non duplicate.')
    }

    const recipePhases = new Set(
      recipe.operationalPhaseOrdinals
        ?? (recipe.operationalPhaseOrdinal ? [recipe.operationalPhaseOrdinal] : []),
    )
    if (binding.phaseOrdinals.some((ordinal) => !recipePhases.has(ordinal))) {
      throw new Error('L’evidenza UDA deve essere sostenuta soltanto dalle fasi operative del blocco corrente.')
    }

    const selected = binding.phaseOrdinals.map((ordinal) => {
      const phase = uda.phases.find((item) => item.ordinal === ordinal)
      if (!phase?.content.trim()) throw new Error(`La fase UDA ${ordinal} non contiene evidenza operativa verificabile.`)
      return clean(phase.content)
    })

    return {
      ...binding,
      phaseOrdinals: [...binding.phaseOrdinals],
      text: selected.join(' '),
    }
  }

  if (!binding.sectionHeading.trim() || !binding.itemIndexes.length || new Set(binding.itemIndexes).size !== binding.itemIndexes.length) {
    throw new Error('La provenienza UDA dell’evidenza richiede una sezione e voci valide e non duplicate.')
  }
  const section = uda.sections.find((item) => normalize(item.heading) === normalize(binding.sectionHeading))
  if (!section) throw new Error(`Sezione UDA non trovata per l’evidenza: ${binding.sectionHeading}.`)

  const selected = binding.itemIndexes.map((index) => {
    if (!Number.isInteger(index) || index < 1) throw new Error('Gli indici delle voci UDA devono essere interi positivi.')
    const item = section.listItems[index - 1]
    if (!item?.trim()) throw new Error(`${section.heading}: voce ${index} non disponibile per l’evidenza.`)
    return stripTerminalPunctuation(clean(item))
  })

  return {
    ...binding,
    itemIndexes: [...binding.itemIndexes],
    text: selected.join(' · '),
  }
}

function stripTerminalPunctuation(value: string) {
  return value.replace(/[;,.]+$/u, '').trim()
}

function clean(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('it').replace(/^\d+\.\s*/, '').replace(/\s+/g, ' ').trim()
}
