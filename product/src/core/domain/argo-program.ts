export type ArgoPerformedStatus = 'NOT_PERFORMED' | 'PARTIALLY_PERFORMED' | 'PERFORMED'

export type CanonicalAnnualProgramming = {
  schoolYear: string
  classRef: string
  subjectRef: string
  sourceGenerationId: string
  modules: CanonicalProgrammingModule[]
}

export type CanonicalProgrammingModule = {
  id: string
  order?: string | null
  description: string
  arguments: CanonicalProgrammingArgument[]
}

export type CanonicalProgrammingArgument = {
  id: string
  order?: string | null
  description: string
  performedStatus?: ArgoPerformedStatus | null
  performedAt?: string | null
}

export type ArgoProgram = {
  schoolYear: string
  classRef: string
  subjectRef: string
  sourceGenerationId: string
  modules: ArgoProgramModule[]
}

export type ArgoProgramModule = {
  id: string
  order?: string
  description: string
  arguments: ArgoProgramArgument[]
}

export type ArgoProgramArgument = {
  id: string
  order?: string
  description: string
  performedStatus?: ArgoPerformedStatus
  performedAt?: string
}
