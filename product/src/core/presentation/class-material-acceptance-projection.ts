import type { CanonicalMaterialContentResolutionV1 } from '@/core/application/material-content-resolution'
import {
  lessonMaterialBindingState,
  type LessonDesignExtension,
} from '@/core/domain/lesson-design-extension'

export type ClassMaterialAcceptanceState =
  | 'PREPARED'
  | 'REVALIDATION_REQUIRED'
  | 'CONFIRMED'

export type ClassMaterialAcceptanceProjection = {
  state: ClassMaterialAcceptanceState
  label: 'Predisposto' | 'Da riconfermare' | 'Confermato'
  canonicalConfirmed: boolean
  requiresRevalidation: boolean
}

export type ClassMaterialAcceptanceEvidence = {
  extensions: LessonDesignExtension[]
  materialContentResolutions: Readonly<Record<string, CanonicalMaterialContentResolutionV1>>
}

export function presentClassMaterialAcceptance(
  state: ClassMaterialAcceptanceState,
): ClassMaterialAcceptanceProjection {
  if (state === 'PREPARED') {
    return {
      state,
      label: 'Predisposto',
      canonicalConfirmed: false,
      requiresRevalidation: false,
    }
  }

  if (state === 'REVALIDATION_REQUIRED') {
    return {
      state,
      label: 'Da riconfermare',
      canonicalConfirmed: false,
      requiresRevalidation: true,
    }
  }

  return {
    state,
    label: 'Confermato',
    canonicalConfirmed: true,
    requiresRevalidation: false,
  }
}

export function presentLegacyClassMaterialAcceptance(
  sourceMetadata: Record<string, unknown>,
): ClassMaterialAcceptanceProjection {
  const rawState = sourceMetadata.approvalState
  const historicalApproval = typeof rawState === 'string' && rawState.trim() === 'APPROVED'

  return presentClassMaterialAcceptance(
    historicalApproval ? 'REVALIDATION_REQUIRED' : 'PREPARED',
  )
}

export function projectClassMaterialAcceptanceForAsset(input: {
  assetId: string
  sourceMetadata: Record<string, unknown>
  extensions: LessonDesignExtension[]
  materialContentResolutions: Readonly<Record<string, CanonicalMaterialContentResolutionV1>>
}): ClassMaterialAcceptanceProjection {
  let hasCanonicalAcceptedBinding = false

  for (const extension of input.extensions) {
    if (extension.status !== 'ACCEPTED') continue

    let state: ReturnType<typeof lessonMaterialBindingState>
    try {
      state = lessonMaterialBindingState(extension)
    } catch {
      continue
    }

    if (state.classification !== 'MATERIAL_BINDING_V1') continue
    if (state.binding.materialRef.assetId !== input.assetId) continue

    hasCanonicalAcceptedBinding = true
    if (input.materialContentResolutions[extension.id]?.status === 'READY') {
      return presentClassMaterialAcceptance('CONFIRMED')
    }
  }

  if (hasCanonicalAcceptedBinding) {
    return presentClassMaterialAcceptance('REVALIDATION_REQUIRED')
  }

  return presentLegacyClassMaterialAcceptance(input.sourceMetadata)
}
