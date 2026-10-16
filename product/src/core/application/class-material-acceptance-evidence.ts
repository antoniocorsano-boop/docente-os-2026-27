import {
  resolveCanonicalMaterialContentV1,
  type CanonicalMaterialContentResolutionV1,
  type MaterialContentReadPortV1,
} from './material-content-resolution'
import {
  lessonMaterialBindingState,
  type LessonDesignExtension,
} from '@/core/domain/lesson-design-extension'

export type ClassMaterialAcceptanceEvidenceV1 = {
  extensions: LessonDesignExtension[]
  materialContentResolutions: Record<string, CanonicalMaterialContentResolutionV1>
}

export async function buildClassMaterialAcceptanceEvidenceV1(input: {
  workspaceId: string
  extensions: LessonDesignExtension[]
  readPort: MaterialContentReadPortV1
}): Promise<ClassMaterialAcceptanceEvidenceV1> {
  const materialContentResolutions: Record<string, CanonicalMaterialContentResolutionV1> = {}

  await Promise.all(input.extensions.map(async (extension) => {
    if (extension.status !== 'ACCEPTED') return

    let state: ReturnType<typeof lessonMaterialBindingState>
    try {
      state = lessonMaterialBindingState(extension)
    } catch {
      return
    }

    if (state.classification !== 'MATERIAL_BINDING_V1') return

    try {
      materialContentResolutions[extension.id] = await resolveCanonicalMaterialContentV1({
        workspaceId: input.workspaceId,
        ref: state.binding.materialRef,
        readPort: input.readPort,
      })
    } catch {
      // Exact-content verification unavailable: keep the binding unverified.
      // The presentation projection treats accepted-but-unverified material as
      // REVALIDATION_REQUIRED, never CONFIRMED.
    }
  }))

  return {
    extensions: input.extensions,
    materialContentResolutions,
  }
}
