import type { CompositionAction, CompositionBlock, IntelligentSurface, SurfaceComposition, UIContext } from './intelligent-ui-contract'
import { interactionBudget, resolveExperienceMode } from './human-task-model'
import {
  INTELLIGENT_UI_BLOCK_CATALOG,
  isResolvedRegisteredAction,
  isSemanticBlockAllowed,
  registeredActionSurface,
} from './intelligent-ui-registry'

export type UIValidationResult = {
  ok: boolean
  errors: string[]
}

export function validateUIContext(context: UIContext): UIValidationResult {
  const errors: string[] = []
  if (context.mode !== resolveExperienceMode(context.task)) errors.push('MODE_MISMATCH')
  if (context.mode !== 'EXPLORE' && !context.reason.trim()) errors.push('REASON_REQUIRED')
  if (context.mode !== 'EXPLORE' && !context.contextSummary.trim()) errors.push('CONTEXT_SUMMARY_REQUIRED')
  return result(errors)
}

export function validateSurfaceComposition(composition: SurfaceComposition): UIValidationResult {
  const errors: string[] = []
  const budget = interactionBudget(composition.mode)

  validateBlock(composition.primaryBlock, composition.surface, composition.mode, errors)
  for (const block of composition.supportBlocks) validateBlock(block, composition.surface, composition.mode, errors)

  if (composition.mode === 'FOCUSED' && !composition.primaryAction) {
    errors.push('FOCUSED_PRIMARY_ACTION_REQUIRED')
  }
  if (composition.supportActions.length > budget.supportingActions) {
    errors.push('SUPPORT_ACTION_BUDGET_EXCEEDED')
  }

  if (composition.mode !== 'EXPLORE' && !composition.reason.trim()) errors.push('REASON_REQUIRED')
  if (composition.mode !== 'EXPLORE' && !composition.contextSummary.trim()) errors.push('CONTEXT_SUMMARY_REQUIRED')

  if (composition.primaryAction) validateAction(composition.primaryAction, composition.surface, errors)
  for (const action of composition.supportActions) validateAction(action, composition.surface, errors)

  if (!composition.fullViewAction || !isResolvedRegisteredAction(composition.fullViewAction)) {
    errors.push('FULL_VIEW_ACTION_REQUIRED')
  } else {
    if (registeredActionSurface(composition.fullViewAction.id) !== composition.surface) {
      errors.push('FULL_VIEW_SURFACE_MISMATCH')
    }
    const expectedFullView = composition.surface === 'HOME' ? 'HOME_SHOW_ALL' : 'CLASS_SHOW_ALL'
    if (composition.fullViewAction.id !== expectedFullView) errors.push('FULL_VIEW_ACTION_REQUIRED')
  }

  return result(errors)
}

function validateBlock(
  block: CompositionBlock,
  surface: IntelligentSurface,
  mode: SurfaceComposition['mode'],
  errors: string[],
) {
  const entry = INTELLIGENT_UI_BLOCK_CATALOG[block.id]
  if (!entry) {
    errors.push('UNKNOWN_BLOCK')
    return
  }
  if (!isSemanticBlockAllowed(block.id, surface, mode)) errors.push('BLOCK_SURFACE_MISMATCH')
}

function validateAction(action: CompositionAction, surface: IntelligentSurface, errors: string[]) {
  if (!isResolvedRegisteredAction(action)) {
    errors.push('UNREGISTERED_ACTION_TARGET')
    return
  }
  if (registeredActionSurface(action.id) !== surface) errors.push('ACTION_SURFACE_MISMATCH')
}

function result(errors: string[]): UIValidationResult {
  return { ok: errors.length === 0, errors: [...new Set(errors)] }
}
