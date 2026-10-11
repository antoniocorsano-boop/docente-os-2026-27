export type AuthoredDocumentKind = 'UDA' | 'FINAL_REPORT'

export type AuthoredDocument = {
  id: string
  workspaceId: string
  academicYearId: string | null
  sourceAssetId: string | null
  sectionId: string | null
  teachingDisciplineId: string | null
  documentKind: AuthoredDocumentKind
  title: string
  currentVersionNo: number
  createdBy: string
  createdAt: string
  updatedAt: string
}

export type AuthoredDocumentVersion = {
  id: string
  documentId: string
  versionNo: number
  title: string
  bodyMarkdown: string
  createdBy: string
  createdAt: string
}

export type AuthoredDocumentSnapshot = {
  document: AuthoredDocument
  current: AuthoredDocumentVersion
  versions: AuthoredDocumentVersion[]
}

export type AuthoredDocumentContext = Pick<
  AuthoredDocument,
  'documentKind' | 'academicYearId' | 'sourceAssetId' | 'sectionId' | 'teachingDisciplineId'
>

export function validateAuthoredDocumentContext(document: AuthoredDocumentContext): string[] {
  if (document.documentKind === 'UDA') {
    return document.sourceAssetId ? [] : ['UDA_SOURCE_REQUIRED']
  }

  const errors: string[] = []
  if (!document.academicYearId) errors.push('FINAL_REPORT_ACADEMIC_YEAR_REQUIRED')
  if (!document.sectionId) errors.push('FINAL_REPORT_SECTION_REQUIRED')
  if (!document.teachingDisciplineId) errors.push('FINAL_REPORT_DISCIPLINE_REQUIRED')
  return errors
}

export function isUdaAuthoredDocument(document: Pick<AuthoredDocument, 'documentKind'>): boolean {
  return document.documentKind === 'UDA'
}

export function isFinalReportAuthoredDocument(document: Pick<AuthoredDocument, 'documentKind'>): boolean {
  return document.documentKind === 'FINAL_REPORT'
}
