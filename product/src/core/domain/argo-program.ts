export type ArgoPerformedStatus = 'NOT_PERFORMED' | 'PARTIALLY_PERFORMED' | 'PERFORMED'

export type ArgoProgramProjectionSource = {
  sourceKind: 'GOVERNED_MODULE_ARGUMENT_PROJECTION'
  schoolYear: string
  classRef: string
  subjectRef: string
  sourceAssetId: string
  sourceGenerationId: string
  modules: ArgoProgramProjectionModule[]
}

export type ArgoProgramProjectionModule = {
  id: string
  order?: string | null
  description: string
  arguments: ArgoProgramProjectionArgument[]
}

export type ArgoProgramProjectionArgument = {
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
  sourceAssetId: string
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
