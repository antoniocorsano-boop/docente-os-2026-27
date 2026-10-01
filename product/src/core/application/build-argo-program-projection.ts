import type {
  ArgoProgram,
  ArgoProgramProjectionSource,
} from '@/core/domain/argo-program'

export function buildArgoProgramProjection(source: ArgoProgramProjectionSource): ArgoProgram {
  assertGovernedProjectionSource(source)

  return {
    schoolYear: source.schoolYear,
    classRef: source.classRef,
    subjectRef: source.subjectRef,
    sourceAssetId: source.sourceAssetId,
    sourceGenerationId: source.sourceGenerationId,
    modules: source.modules.map((programModule) => ({
      id: programModule.id,
      ...(programModule.order == null ? {} : { order: programModule.order }),
      description: programModule.description,
      arguments: programModule.arguments.map((argument) => ({
        id: argument.id,
        ...(argument.order == null ? {} : { order: argument.order }),
        description: argument.description,
        ...(argument.performedStatus == null ? {} : { performedStatus: argument.performedStatus }),
        ...(argument.performedAt == null ? {} : { performedAt: argument.performedAt }),
      })),
    })),
  }
}

function assertGovernedProjectionSource(source: ArgoProgramProjectionSource) {
  if (source.sourceKind !== 'GOVERNED_MODULE_ARGUMENT_PROJECTION') {
    throw new Error('Argo projection requires governed module/argument source')
  }
  if (!source.schoolYear.trim()) throw new Error('Argo projection requires schoolYear')
  if (!source.classRef.trim()) throw new Error('Argo projection requires classRef')
  if (!source.subjectRef.trim()) throw new Error('Argo projection requires subjectRef')
  if (!source.sourceAssetId.trim()) throw new Error('Argo projection requires sourceAssetId')
  if (!source.sourceGenerationId.trim()) throw new Error('Argo projection requires sourceGenerationId')
}
