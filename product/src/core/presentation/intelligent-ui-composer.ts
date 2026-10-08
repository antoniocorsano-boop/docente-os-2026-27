import { INTELLIGENT_UI_VERSION, type CompositionBlock, type SurfaceComposition, type UIContext } from './intelligent-ui-contract'
import { resolveRegisteredAction, type RegisteredActionDescriptor } from './intelligent-ui-registry'
import { validateSurfaceComposition, validateUIContext } from './intelligent-ui-policy'

export type DeterministicFallbackReason = 'INVALID_CONTEXT' | 'UNKNOWN_ACTION' | 'INVALID_COMPOSITION' | 'STALE_CONTINUITY'

export type DeterministicSurfaceDraft = {
  context: UIContext
  primaryBlock: CompositionBlock
  supportBlocks?: readonly CompositionBlock[]
  primaryAction: RegisteredActionDescriptor | null
  supportActions?: readonly RegisteredActionDescriptor[]
  fullViewAction: RegisteredActionDescriptor
}

export function composeDeterministicSurface(input: DeterministicSurfaceDraft & {
  fallback: () => DeterministicSurfaceDraft
}): SurfaceComposition {
  const contextValidation = validateUIContext(input.context)
  if (!contextValidation.ok) return useFallback(input, 'INVALID_CONTEXT')

  let composition: SurfaceComposition
  try {
    composition = materialize(input)
  } catch {
    return useFallback(input, 'UNKNOWN_ACTION')
  }

  if (!validateSurfaceComposition(composition).ok) {
    return useFallback(input, 'INVALID_COMPOSITION')
  }
  return composition
}

function useFallback(
  input: DeterministicSurfaceDraft & { fallback: () => DeterministicSurfaceDraft },
  reason: DeterministicFallbackReason,
): SurfaceComposition {
  const fallbackDraft = input.fallback()
  if (fallbackDraft.context.surface !== input.context.surface) {
    throw new Error('Deterministic fallback must stay on the same surface')
  }
  const contextValidation = validateUIContext(fallbackDraft.context)
  if (!contextValidation.ok) throw new Error('Invalid deterministic fallback context')

  let fallback: SurfaceComposition
  try {
    fallback = materialize(fallbackDraft)
  } catch {
    throw new Error('Invalid deterministic fallback action')
  }
  if (!validateSurfaceComposition(fallback).ok) throw new Error('Invalid deterministic fallback composition')
  return { ...fallback, fallbackReason: reason }
}

function materialize(draft: DeterministicSurfaceDraft): SurfaceComposition {
  return {
    version: INTELLIGENT_UI_VERSION,
    surface: draft.context.surface,
    intent: draft.context.task.intent,
    mode: draft.context.mode,
    contextSummary: draft.context.contextSummary,
    reason: draft.context.reason,
    primaryBlock: draft.primaryBlock,
    supportBlocks: draft.supportBlocks ?? [],
    primaryAction: draft.primaryAction ? resolveRegisteredAction(draft.primaryAction) : null,
    supportActions: (draft.supportActions ?? []).map(resolveRegisteredAction),
    fullViewAction: resolveRegisteredAction(draft.fullViewAction),
    source: 'DETERMINISTIC',
  }
}
