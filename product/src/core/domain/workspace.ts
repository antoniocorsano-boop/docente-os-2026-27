export type WorkspaceKind = 'PERSONAL' | 'SCHOOL'
export type WorkspaceRole = 'OWNER' | 'ADMIN' | 'MEMBER'

export interface Workspace {
  id: string
  kind: WorkspaceKind
  name: string
  ownerUserId: string
}

export interface AcademicYear {
  id: string
  workspaceId: string
  label: string
  startsOn: string
  endsOn: string
  isActive: boolean
}

export interface WorkspaceContext {
  workspace: Workspace
  academicYear: AcademicYear | null
  role: WorkspaceRole
}
