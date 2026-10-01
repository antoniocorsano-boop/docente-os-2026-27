import type {
  ArgoProgram,
  CanonicalAnnualProgramming,
} from '@/core/domain/argo-program'

export function buildArgoProgramProjection(source: CanonicalAnnualProgramming): ArgoProgram {
  assertBoundSource(source)

  return {
    schoolYear: source.schoolYear,
    classRef: source.classRef,
    subjectRef: source.subjectRef,
    sourceGenerationId: source.sourceGenerationId,
    modules: source.modules.map((module) => ({
      id: module.id,
      ...(module.order == null ? {} : { order: module.order }),
      description: module.description,
      arguments: module.arguments.map((argument) => ({
        id: argument.id,
        ...(argument.order == null ? {} : { order: argument.order }),
        description: argument.description,
        ...(argument.performedStatus == null ? {} : { performedStatus: argument.performedStatus }),
        ...(argument.performedAt == null ? {} : { performedAt: argument.performedAt }),
      })),
    })),
  }
}

function assertBoundSource(source: CanonicalAnnualProgramming) {
  if (!source.schoolYear.trim()) throw new Error('Argo projection requires schoolYear')
  if (!source.classRef.trim()) throw new Error('Argo projection requires classRef')
  if (!source.subjectRef.trim()) throw new Error('Argo projection requires subjectRef')
  if (!source.sourceGenerationId.trim()) throw new Error('Argo projection requires sourceGenerationId')
}
