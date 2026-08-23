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
      source: 'UDA_PHASES'
      text: string
      phaseOrdinals: number[]
      rationale: string
    }

export type HumanTaskPlanGuidedEvidenceDraft = {
  draft: HumanTaskProjectionDraft
  evidenceBinding: PlanGuidedEvidenceBinding
}

/**
 * Compatibility boundary for PLAN_GUIDED_UDA recipes when the annual Plan
 * does not state a block-level evidence but the UDA does.
 *
 * The underlying builder remains unchanged for already-approved recipes.
 * This adapter validates and makes the alternate provenance explicit before
 * passing the human-facing evidence text to that builder.
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
      evidenceBinding: cloneBinding(evidenceBinding),
    }
  }

  validateUdaEvidenceBinding(candidate, recipe, evidenceBinding)
  const phaseLabel = evidenceBinding.phaseOrdinals.join('+')
  const adaptedRecipe: HumanTaskPlanGuidedUdaProjectionRecipe = {
    ...recipe,
    planSource: {
      ...recipe.planSource,
      blockEvidence: evidenceBinding.text.trim(),
    },
    sourceAlignment: {
      ...recipe.sourceAlignment,
      note: `${recipe.sourceAlignment.note.trim()} Evidenza operativa: sostenuta dalle fasi UDA ${phaseLabel}; il Piano definisce collocazione e blocco ma non specifica un’evidenza distinta a questa granularità. ${evidenceBinding.rationale.trim()}`,
    },
  }

  return {
    draft: buildPlanGuidedUdaProjectionDraft(candidate, adaptedRecipe),
    evidenceBinding: cloneBinding(evidenceBinding),
  }
}

function validateUdaEvidenceBinding(
  candidate: HumanTaskContentCandidate,
  recipe: HumanTaskPlanGuidedUdaProjectionRecipe,
  binding: Extract<PlanGuidedEvidenceBinding, { source: 'UDA_PHASES' }>,
) {
  if (!binding.text.trim()) throw new Error('L’evidenza UDA non può essere vuota.')
  if (!binding.rationale.trim()) throw new Error('La provenienza UDA dell’evidenza richiede una motivazione verificabile.')
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

  const uda = candidate.evidence.uda
  if (!uda) throw new Error('La generazione UDA corrente non è disponibile.')
  for (const ordinal of binding.phaseOrdinals) {
    const phase = uda.phases.find((item) => item.ordinal === ordinal)
    if (!phase?.content.trim()) throw new Error(`La fase UDA ${ordinal} non contiene evidenza operativa verificabile.`)
  }
}

function cloneBinding(binding: PlanGuidedEvidenceBinding): PlanGuidedEvidenceBinding {
  return binding.source === 'PLAN'
    ? { ...binding }
    : { ...binding, phaseOrdinals: [...binding.phaseOrdinals] }
}

function clean(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}
