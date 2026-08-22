export type AnnualPlanGrade = 'PRIMA' | 'SECONDA' | 'TERZA'
export type AnnualPlanSectionStatus = 'PROVVISORIA' | 'DA_CONFERMARE' | 'CONFERMATA'
export type AnnualPlanBlockStatus = 'PIANIFICATO' | 'SVOLTO' | 'RECUPERATO' | 'RIMODULATO' | 'ANNULLATO'

export type AnnualPlanSection = {
  id: string
  workspaceId: string
  academicYearId: string
  grade: AnnualPlanGrade
  sectionCode: string
  status: AnnualPlanSectionStatus
  sourceNote: string | null
  confirmedAt: string | null
  createdAt: string
  updatedAt: string
}

export type AnnualPlanBlockProgress = {
  id: string
  sectionId: string
  canonicalPlanAssetId: string
  canonicalGenerationId: string
  blockId: string
  status: AnnualPlanBlockStatus
  executedOn: string | null
  evidenceNote: string | null
  updatedAt: string
}

export type AnnualPlanExecutionSnapshot = {
  sections: AnnualPlanSection[]
  progress: AnnualPlanBlockProgress[]
}

export function asAnnualPlanGrade(value: string): AnnualPlanGrade {
  if (value === 'PRIMA' || value === 'SECONDA' || value === 'TERZA') return value
  throw new Error(`Unsupported annual plan grade: ${value}`)
}

export function asAnnualPlanSectionStatus(value: string): AnnualPlanSectionStatus {
  if (value === 'PROVVISORIA' || value === 'DA_CONFERMARE' || value === 'CONFERMATA') return value
  throw new Error(`Unsupported annual plan section status: ${value}`)
}

export function asAnnualPlanBlockStatus(value: string): AnnualPlanBlockStatus {
  if (value === 'PIANIFICATO' || value === 'SVOLTO' || value === 'RECUPERATO' || value === 'RIMODULATO' || value === 'ANNULLATO') return value
  throw new Error(`Unsupported annual plan block status: ${value}`)
}
