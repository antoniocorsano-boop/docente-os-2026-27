export type AuthoredDocumentKind = 'UDA'

export type AuthoredDocument = {
  id: string
  workspaceId: string
  academicYearId: string | null
  sourceAssetId: string
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
